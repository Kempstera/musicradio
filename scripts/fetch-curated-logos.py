#!/usr/bin/env python3
"""给「精选电台」（regions/*.ts 里的 notableRadios）补台标。

这些台是每个国家页最顶上那几张卡，最需要图。它们的流地址不在 radios.json 里，
所以按 radios.json 建的台标表天然覆盖不到 —— 上一轮「清理孤儿台标」就是在这儿
翻的车：把 5 个精选台的映射当成孤儿删了（BBC Radio 3 的 BBC 方块 logo 就在其中）。

补图顺序（越靠前越可信）：
  1. RESTORE —— 旧版明确映射过的，照抄，别改
  2. 同名借用 —— radios.json 同国里有同名台且已有台标，直接借；比重新抓准
  3. radio-browser —— 按国家拉全量，台名模糊匹配 ≥0.88 时取它的 favicon
  4. icon.horse —— 上一步只拿到官网地址的，用官网域名换图标

    python3 scripts/fetch-curated-logos.py            # 只报告
    python3 scripts/fetch-curated-logos.py --apply
"""
import difflib
import glob
import io
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = '/Users/apple/WorkBuddy/2026-09-29-10-51-58/musicradio'
PROXY = 'http://127.0.0.1:9674'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')
MIN_SIDE = 48

RESERVE = {
    1: {
        'https://as-hls-ww-live.akamaized.net/pool_23461179/live/ww/bbc_radio_three/bbc_radio_three.isml/bbc_radio_three-audio=320000.norewind.m3u8': '/logos/gb/gb-bbc.webp',
        'https://as-hls-ww-live.akamaized.net/pool_30624046/live/ww/bbc_radio_three_unwind/bbc_radio_three_unwind.isml/bbc_radio_three_unwind-audio=320000.norewind.m3u8': '/logos/gb/gb-bbc.webp',
        'https://media-ice.musicradio.com/ClassicFMMoviesMP3': '/logos/gb/gb-classicfm.webp',
        'https://listen.radioking.com/radio/47608/stream/84430': '/logos/bj/bj-2ff6360afc.webp',
    },
}


def norm(n):
    s = re.sub(r'[^a-z0-9]', '', n.lower())
    return re.sub(r'(radio|fm|hd)+$', '', s)


def variants(nm):
    """精选台名常写成「A / B（中文备注）」这种合并形式，拆成几个能单独搜的名字。"""
    s = re.sub(r'[（(][^）)]*[）)]', ' ', nm)          # 去括号注释
    s = re.sub(r'\s*[·|]\s*', ' / ', s)
    parts = [p.strip(' -·') for p in re.split(r'\s*/\s*|\s+&\s+', s)]
    seen, out = set(), []
    for p in parts:
        k = norm(p)
        if p and len(k) >= 3 and k not in seen:
            seen.add(k)
            out.append(p)
    return out or [s.strip()]


# 抓到这些域名的图一律不要：是社交平台 / 应用商店的通用图标，不是台标
BAD_ICON_HOSTS = ('facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com',
                  'youtube.com', 'youtu.be', 'play.google.com', 'apps.apple.com',
                  'tiktok.com', 'linkedin.com', 'wa.me', 'whatsapp.com', 't.me',
                  'google.com', 'apple.com', 'soundcloud.com', 'spotify.com')


def parse_curated():
    """从 regions/*.ts 里抠出 (iso, 台名, 流地址)。靠块结构定位，别用正则硬套。"""
    out = []
    for f in glob.glob(f'{ROOT}/src/data/regions/*.ts'):
        s = open(f, encoding='utf-8').read()
        # 每个国家块以 `slug: '...'` 开头，块内先出现 iso，再出现 notableRadios
        for block in re.split(r"\n  \{\n    slug: '", s)[1:]:
            iso = re.search(r"^\s*iso: '([A-Z]{2})'", block, re.M)
            if not iso:
                continue
            cc = iso.group(1)
            nr = block.find('notableRadios:')
            if nr < 0:
                continue
            tail = block[nr:]
            for m in re.finditer(r"\{ name: '([^']+)'[^}]*?url: '([^']+)'[^}]*\}", tail):
                out.append((cc, m.group(1), m.group(2)))
    return out


def fetch(url, to=15):
    try:
        p = subprocess.run(['curl', '-sL', '--proxy', PROXY, '-m', str(to), '-A', UA, url],
                           capture_output=True, timeout=to + 6)
        return p.stdout or b''
    except Exception:
        return b''


def is_letterbox(im):
    """灰底单字母占位图（favicon 服务的兜底图）。这种图对用户零信息，宁缺勿滥。"""
    from collections import Counter
    small = im.convert('RGB').copy()
    small.thumbnail((64, 64))
    w, h = small.size
    px = list(small.getdata())
    pts = [px[0], px[w - 1], px[(h - 1) * w], px[-1],
           px[w // 2], px[(h // 2) * w], px[(h // 2) * w + w - 1], px[(h // 2) * w + w // 2]]
    bg, cnt = Counter(pts).most_common(1)[0]
    if cnt < 6:
        return False
    r, g, b = bg
    if max(r, g, b) - min(r, g, b) > 10 or not (196 <= (r + g + b) / 3 <= 248):
        return False
    near = sum(1 for p in px if max(abs(p[0] - r), abs(p[1] - g), abs(p[2] - b)) <= 14)
    colors = len(Counter((p[0] // 24, p[1] // 24, p[2] // 24) for p in px))
    return near / len(px) >= 0.62 and colors <= 6


def to_webp(raw, allow_letterbox=False):
    from PIL import Image, ImageStat
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception:
        return None
    if max(im.size) < MIN_SIDE:
        return None
    try:
        if max(ImageStat.Stat(im.convert('RGB').resize((32, 32))).stddev) < 6:
            return None
    except Exception:
        pass
    if not allow_letterbox and is_letterbox(im):
        return None
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, (255, 255, 255, 0))
        bg.alpha_composite(im)
        im = bg
    else:
        im = im.convert('RGB')
    im.thumbnail((128, 128), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=84, method=4)
    return buf.getvalue()


def rb_stations(cc):
    """radio-browser 按国家拉全量（缓存到 /var/tmp），带 favicon / homepage。"""
    cache = f'/var/tmp/rb-{cc}.json'
    if os.path.exists(cache):
        try:
            return json.load(open(cache))
        except Exception:
            pass
    raw = fetch(f'https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/{cc}?hidebroken=true')
    try:
        data = json.loads(raw)
    except Exception:
        data = []
    json.dump(data, open(cache, 'w'))
    return data


def rb_search(name, cc):
    """按台名搜（限国家）。合并台名拆段后每一段都要试。"""
    cache = f'/var/tmp/rbs-{abs(hash((name, cc))) % (10 ** 12)}.json'
    if os.path.exists(cache):
        try:
            return json.load(open(cache))
        except Exception:
            pass
    q = name.replace(' ', '%20')
    raw = fetch(f'https://de1.api.radio-browser.info/json/stations/search'
                f'?name={q}&countrycode={cc}&limit=20&hidebroken=true')
    try:
        data = json.loads(raw)
    except Exception:
        data = []
    json.dump(data, open(cache, 'w'))
    return data


def icon_from_host(host):
    host = host.lower()
    if any(host == h or host.endswith('.' + h) for h in BAD_ICON_HOSTS):
        return None
    return to_webp(fetch(f'https://icon.horse/icon/{host}'))


def main():
    apply = '--apply' in sys.argv
    logos = json.load(open(f'{ROOT}/src/data/logos.json', encoding='utf-8'))
    radios = json.load(open(f'{ROOT}/src/data/radios.json', encoding='utf-8'))

    curated = parse_curated()
    miss = [(cc, nm, u) for cc, nm, u in curated if u.startswith('http') and u not in logos]
    print(f'精选台 {len(curated)} 个，缺台标 {len(miss)} 个')

    # ① 恢复旧映射
    got = {}
    for _, table in RESERVE.items():
        for u, p in table.items():
            if u not in logos and os.path.exists(f'{ROOT}/public{p}'):
                got[u] = p

    # ② 同国同名借用
    index = defaultdict(dict)
    for cc, lst in radios.items():
        for s in lst:
            lg = logos.get(s['url'])
            if lg:
                index[cc].setdefault(norm(s['name']), lg)
    for cc, nm, u in miss:
        if u in got:
            continue
        p = index.get(cc, {}).get(norm(nm))
        if p:
            got[u] = p
    print(f'  恢复旧映射 + 同名借用：{len(got)}')

    # ③④ 剩下的走 radio-browser / icon.horse
    rest = [(cc, nm, u) for cc, nm, u in miss if u not in got]
    print(f'  需要联网抓：{len(rest)}')
    by_cc = defaultdict(list)
    for x in rest:
        by_cc[x[0]].append(x)

    def work(item):
        cc, nm, u = item
        names = variants(nm)
        # ① 按国家全量里模糊找
        pool = rb_stations(cc)
        best, score = None, 0.0
        for nmv in names:
            t = norm(nmv)
            for st in pool:
                sc = difflib.SequenceMatcher(None, t, norm(st.get('name', ''))).ratio()
                if sc > score:
                    best, score = st, sc
        # ② 全量里没找到像样的，按名字精确搜一轮
        if score < 0.9:
            for nmv in names:
                t = norm(nmv)
                for st in rb_search(nmv, cc):
                    sc = difflib.SequenceMatcher(None, t, norm(st.get('name', ''))).ratio()
                    if sc > score:
                        best, score = st, sc
        if not best or score < 0.82:
            return item, None, f'未匹配({score:.2f})'

        for cand in (best.get('favicon'), best.get('favicon')):
            if cand and cand.startswith('http'):
                host = re.sub(r'^https?://', '', cand).split('/')[0]
                if any(host == h or host.endswith('.' + h) for h in BAD_ICON_HOSTS):
                    continue
                b = to_webp(fetch(cand))
                if b:
                    return item, b, f'favicon:{best.get("name", "")[:24]}'
        hp = best.get('homepage') or ''
        host = re.sub(r'^https?://', '', hp).split('/')[0]
        if host and '.' in host:
            b = icon_from_host(host)
            if b:
                return item, b, f'iconhorse:{host}'
        return item, None, f'无图({best.get("name", "")[:24]})'

    added = 0
    with ThreadPoolExecutor(max_workers=10) as ex:
        for f in as_completed([ex.submit(work, x) for x in rest]):
            (cc, nm, u), blob, how = f.result()
            if not blob:
                continue
            d = f'{ROOT}/public/logos/{cc.lower()}'
            os.makedirs(d, exist_ok=True)
            name = f"{cc.lower()}-cur{abs(hash(u)) % (10 ** 10):010d}.webp"
            open(os.path.join(d, name), 'wb').write(blob)
            got[u] = f'/logos/{cc.lower()}/{name}'
            added += 1
            print(f'   + {cc} {nm[:34]:36s} {how}', flush=True)

    print(f'\n共补 {len(got)} 个（联网抓 {added}）')
    if apply and got:
        logos.update(got)
        json.dump(dict(sorted(logos.items())), open(f'{ROOT}/src/data/logos.json', 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        open(f'{ROOT}/src/data/logos.json', 'a').write('\n')
        print(f'logos.json 现有 {len(logos)} 条')


if __name__ == '__main__':
    main()
