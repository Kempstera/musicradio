#!/usr/bin/env python3
"""
抓取电台台标 → public/logos/<cc>/<file>.webp，并生成 src/data/logos.json

为什么用 Python 而不是继续用 fetch-station-logos.mjs：
  1. 需要 WebP（160px PNG 平均 20KB，全站 1200 家会往仓库塞 20MB+；WebP 约 4KB，总量降到 1/5）；
  2. sips 读不了 .ico，而很多小电台只有 favicon.ico；PIL 能读，还能顺带算亮度/尺寸做质量筛查。

取图优先级（越靠前越像「品牌标识」而非横幅）：
  apple-touch-icon → sizes>=128 的 icon → 任意 icon/svg → 根目录常见路径 → og:image → favicon.ico

三道质量筛：
  1. 尺寸 < 32px 的丢掉（放大必糊，不如用首字母块）；
  2. 纯色/近纯色图丢掉（占位图、纯白 favicon）；
  3. 同一张图出现在 >= 3 个不同域名下 → 判定为通用图标（WordPress/Cloudflare 那类），
     这些一律丢掉，宁可显示首字母块也不要 30 个一模一样的假 logo。

用法：
  python3 scripts/fetch-station-logos.py GB          # 单个国家
  python3 scripts/fetch-station-logos.py FR DE JP    # 多个国家
  python3 scripts/fetch-station-logos.py --all       # 全部（约 1100 个站点，8 并发约 10-15 分钟）
  python3 scripts/fetch-station-logos.py --all --force   # 已抓过的也重抓
  python3 scripts/fetch-station-logos.py --all -j 12     # 调并发
"""

import argparse
import hashlib
import io
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RADIOS = os.path.join(ROOT, 'src/data/radios.json')
LOGOS_JSON = os.path.join(ROOT, 'src/data/logos.json')
OUT_ROOT = os.path.join(ROOT, 'public/logos')

PROXY = os.environ.get('LOGO_PROXY', 'http://127.0.0.1:9674')
UA_FULL = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
           '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')
UA_SHORT = 'Mozilla/5.0'   # 有些站（virginradio.co.uk）对完整 Chrome UA 反而返回 SPA 空壳

TARGET = 128        # 成品最大边（贴片按 40px 显示，3x 屏 120px，128 够）
ALLOW_OG = True     # og:image 是「分享预览图」，不是标识 —— 里面常混进横幅和合影照。
                    # 非方形成品重抓时把它关掉（见 --no-og）。
MIN_SIDE = 32       # 原始图小于这个尺寸直接放弃
QUALITY = 84

# 手动补的台标：精选电台（notableRadios）往往挂在品牌主站下，用自己的流地址抓不到首页。
# key 是流地址，值是 (文件名, 图片地址)
EXTRAS = {
    'https://as-hls-ww-live.akamaized.net/pool_23461179/live/ww/bbc_radio_three/bbc_radio_three.isml/bbc_radio_three-audio=320000.norewind.m3u8': ('gb-bbc', None),
    'https://as-hls-ww-live.akamaized.net/pool_30624046/live/ww/bbc_radio_three_unwind/bbc_radio_three_unwind.isml/bbc_radio_three_unwind-audio=320000.norewind.m3u8': ('gb-bbc', None),
    'https://media-ice.musicradio.com/ClassicFMMP3': ('gb-classicfm', None),
    'https://media-ice.musicradio.com/ClassicFMCalmMP3': ('gb-classicfm-calm', None),
    'https://media-ice.musicradio.com/ClassicFMMoviesMP3': ('gb-classicfm', None),
}

# 上面这些「文件名」对应的抓取来源（首次抓取时用，之后复用已有文件）
EXTRAS_SOURCE = {
    'gb-bbc': 'https://static.files.bbci.co.uk/core/website/assets/static/icons/touch/bbc/touch-icon-180.6bfec341fa.png',
    'gb-classicfm': 'https://www.classicfm.com/assets_v4r/classic/img/favicon-196x196.png',
    'gb-classicfm-calm': 'https://www.classicfm.com/calm/',   # 走常规解析
}


def curl(url, timeout=25, ua=UA_FULL):
    """返回 (bytes, content_type) 或 (None, None)。走真实代理，短连接，不重试。"""
    try:
        p = subprocess.run(
            ['curl', '-sL', '--proxy', PROXY, '-m', str(timeout), '-A', ua,
             '-H', 'Accept: image/*,text/html;q=0.9,*/*;q=0.8', url],
            capture_output=True, timeout=timeout + 8,
        )
        return p.stdout, None
    except Exception:
        return None, None


def sniff(b):
    if not b or len(b) < 80:
        return None
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if b[:2] == b'\xff\xd8':
        return 'jpeg'
    if b[:3] == b'GIF':
        return 'gif'
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP':
        return 'webp'
    if b[:4] == b'\x00\x00\x01\x00':
        return 'ico'
    if b[:2] == b'BM':
        return 'bmp'
    head = b[:400].lstrip()
    if head.startswith(b'<svg') or (head.startswith(b'<?xml') and b'<svg' in head):
        return 'svg'
    return None


def candidates(html, base):
    """从首页 HTML 里按优先级列出候选图标地址"""
    links = []
    for tag in re.findall(r'<link\b[^>]*>', html, re.I):
        rel = (re.search(r'\brel\s*=\s*["\']([^"\']+)["\']', tag, re.I) or [None, ''])[1]
        href = (re.search(r'\bhref\s*=\s*["\']([^"\']+)["\']', tag, re.I) or [None, None])[1]
        if not href or 'icon' not in rel.lower():
            continue
        sizes = (re.search(r'\bsizes\s*=\s*["\']([^"\']+)["\']', tag, re.I) or [None, ''])[1]
        px = max([int(x) for x in re.findall(r'\d+', sizes)] or [0])
        links.append({
            'href': href,
            'px': px,
            'touch': 'apple-touch' in rel.lower(),
            'svg': bool(re.search(r'\.svg($|\?)', href, re.I)) or 'svg' in tag.lower(),
        })
    links.sort(key=lambda l: (0 if l['touch'] else 1, -l['px']))

    out, seen = [], set()

    def push(u):
        if not u:
            return
        try:
            a = urljoin(base, u)
        except Exception:
            return
        if a not in seen:
            seen.add(a)
            out.append(a)

    for l in links:
        if l['touch']:
            push(l['href'])
    for l in links:
        if not l['touch'] and l['px'] >= 128:
            push(l['href'])
    for l in links:
        if not l['touch']:
            push(l['href'])
    # 根目录常见路径：首页是 JS 空壳的站（virginradio 那种）唯一的线索
    for p in ('/apple-touch-icon.png', '/apple-touch-icon-precomposed.png',
              '/favicon-192x192.png', '/favicon-180x180.png'):
        push(p)
    og = re.search(r'<meta[^>]+property\s*=\s*["\']og:image["\'][^>]*>', html, re.I) if ALLOW_OG else None
    if og:
        c = (re.search(r'content\s*=\s*["\']([^"\']+)["\']', og.group(0), re.I) or [None, None])[1]
        push(c)
    push('/favicon.ico')
    return out


def fetch_one(url):
    """取单张图，返回 (bytes, kind)；两轮 UA"""
    for ua in (UA_FULL, UA_SHORT):
        b, _ = curl(url, timeout=18, ua=ua)
        k = sniff(b)
        if k:
            return b, k
    return None, None


def resolve_logo(homepage):
    """给一个官网地址，找出最好的图标字节。返回 (bytes, kind) 或 (None, None)"""
    html_b, _ = curl(homepage, timeout=25)
    if not html_b:
        return None, None
    html = html_b.decode('utf-8', 'ignore')
    for cand in candidates(html, homepage):
        b, k = fetch_one(cand)
        if k and len(b) >= 300:
            return b, k
    return None, None


def to_webp(raw, kind):
    """统一化成 <=128px 的 WebP。不合格返回 None"""
    from PIL import Image, ImageStat

    if kind == 'svg':
        return raw, 'svg'          # 矢量原样保留，比任何位图都清晰

    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception:
        return None, None

    if max(im.size) < MIN_SIDE:
        return None, None

    # 近纯色图（占位图、纯白 favicon）没有信息量，不如首字母块
    try:
        st = ImageStat.Stat(im.convert('RGB').resize((32, 32)))
        if max(st.stddev) < 6:
            return None, None
    except Exception:
        pass

    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, (255, 255, 255, 0))
        bg.alpha_composite(im)
        im = bg
    else:
        im = im.convert('RGB')

    im.thumbnail((TARGET, TARGET), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=4)
    return buf.getvalue(), 'webp'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('codes', nargs='*')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('-j', '--jobs', type=int, default=8)
    ap.add_argument('--no-og', action='store_true', help='不把 og:image 当候选（重抓横幅时用）')
    args = ap.parse_args()
    global ALLOW_OG
    ALLOW_OG = not args.no_og

    data = json.load(open(RADIOS, encoding='utf-8'))
    logos = json.load(open(LOGOS_JSON, encoding='utf-8')) if os.path.exists(LOGOS_JSON) else {}
    targets = list(data.keys()) if args.all else (args.codes or ['GB'])

    # ---- 1. 收集任务：按 homepage 去重，一个页面只抓一次 ----
    by_page = {}          # homepage -> [(cc, station)]
    todo = 0
    for cc in targets:
        for s in data.get(cc, []):
            if not args.force and s['url'] in logos:
                continue
            hp = s.get('homepage')
            if not hp:
                continue
            by_page.setdefault(hp, []).append((cc, s))
            todo += 1
    print(f'目标：{len(targets)} 个国家 / 待处理 {todo} 家 / 需抓取的官网 {len(by_page)} 个（并发 {args.jobs}）')

    # ---- 2. 并发抓取 ----
    results = {}          # homepage -> (bytes, kind)
    done = 0
    with ThreadPoolExecutor(max_workers=args.jobs) as ex:
        futs = {ex.submit(resolve_logo, hp): hp for hp in by_page}
        for f in as_completed(futs):
            hp = futs[f]
            try:
                results[hp] = f.result()
            except Exception:
                results[hp] = (None, None)
            done += 1
            if done % 50 == 0 or done == len(futs):
                ok = sum(1 for b, _ in results.values() if b)
                print(f'  … {done}/{len(futs)} 页，已拿到 {ok} 张', flush=True)

    # ---- 3. 转码 + 落盘 + 同图去重 ----
    os.makedirs(OUT_ROOT, exist_ok=True)
    hash_domains = {}     # content hash -> set(domain)
    pending = []          # (cc, url, homepage, bytes, ext, domain)

    for hp, (raw, kind) in results.items():
        if not raw:
            continue
        data_bytes, ext = to_webp(raw, kind)
        if not data_bytes:
            continue
        h = hashlib.sha1(data_bytes).hexdigest()
        domain = urlparse(hp).netloc.lower().replace('www.', '')
        hash_domains.setdefault(h, set()).add(domain)
        pending.append((hp, data_bytes, ext, h, domain))

    # 通用图标：同一张图出现在 >=3 个不同域名 → 丢掉
    generic = {h for h, ds in hash_domains.items() if len(ds) >= 3}
    if generic:
        print(f'剔除通用图标 {len(generic)} 张（每张都出现在 3 个以上域名下）')

    saved_by_hash = {}    # hash -> 相对路径（同图只存一份）
    written, reused, skipped = 0, 0, 0
    per_cc_count = {}

    for hp, raw, ext, h, domain in pending:
        if h in generic:
            skipped += 1
            continue
        for cc, s in by_page[hp]:
            if h in saved_by_hash:
                logos[s['url']] = saved_by_hash[h]
                reused += 1
                continue
            cc_dir = os.path.join(OUT_ROOT, cc.lower())
            os.makedirs(cc_dir, exist_ok=True)
            slug = (s.get('stationuuid') or h[:10]).replace('-', '')[:10]
            name = f'{cc.lower()}-{slug}.{ext}'
            path = os.path.join(cc_dir, name)
            if not os.path.exists(path) or args.force:
                with open(path, 'wb') as fh:
                    fh.write(raw)
                written += 1
            rel = f'/logos/{cc.lower()}/{name}'
            saved_by_hash[h] = rel
            logos[s['url']] = rel
            per_cc_count[cc] = per_cc_count.get(cc, 0) + 1

    # ---- 4. 精选电台的品牌图标（手动补） ----
    # 这里是人工指定的品牌图标，优先级高于自动结果 —— 必须无条件覆盖。
    # 踩过的坑：radio-browser 里流地址会重复，某家阿尔巴尼亚电台也挂了
    # media-ice.musicradio.com/ClassicFMMP3，自动流程先给它配了图标，
    # 结果 Classic FM 精选台显示成了那个蓝色小图标。
    for url, (base_name, _) in EXTRAS.items():
        src = EXTRAS_SOURCE.get(base_name)
        if not src:
            continue
        if src.startswith('https://www.classicfm.com/calm'):
            raw, kind = resolve_logo(src)
        else:
            raw, kind = fetch_one(src)
        if not raw:
            continue
        data_bytes, ext = to_webp(raw, kind)
        if not data_bytes:
            continue
        cc_dir = os.path.join(OUT_ROOT, 'gb')
        os.makedirs(cc_dir, exist_ok=True)
        name = f'{base_name}.{ext}'
        with open(os.path.join(cc_dir, name), 'wb') as fh:
            fh.write(data_bytes)
        logos[url] = f'/logos/gb/{name}'
        written += 1

    # ---- 5. 写映射 ----
    logos = dict(sorted(logos.items()))
    with open(LOGOS_JSON, 'w', encoding='utf-8') as fh:
        json.dump(logos, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    total_stations = sum(len(v) for v in data.values())
    print(f'\n完成：新写 {written} 个文件 · 复用同图 {reused} 次 · 因通用被丢 {skipped} 次')
    print(f'映射共 {len(logos)} 条 / 全站 {total_stations} 家 → 覆盖率 {len(logos) / total_stations:.0%}')
    if per_cc_count:
        thin = [f'{cc}:{n}' for cc, n in sorted(per_cc_count.items()) if n <= 2]
        if thin:
            print('偏少的国家：' + ' '.join(thin[:20]))


if __name__ == '__main__':
    main()
