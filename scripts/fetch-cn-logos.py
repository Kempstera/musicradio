#!/usr/bin/env python3
"""从 radio5.cn（瑞丢网络收音机）给中国电台找台标。

radio5 是个 WordPress 站，每个电台是一篇 station 文章，带 300×300 的台标。
它的站内搜索 `?s=<台名>` 能直接搜到，页面上每张图的 alt 就是台名 ——
比之前那些「按拼音猜域名、icon.horse 回灰字母」的路子靠谱得多。

用法：
    python3 scripts/fetch-cn-logos.py            # 只报告
    python3 scripts/fetch-cn-logos.py --apply
"""
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = '/Users/apple/WorkBuddy/2026-09-29-10-51-58/musicradio'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')
MIN_SIDE = 60
MIN_SCORE = 0.72          # radio5 的台名一般带着频率，比我们的名字长，阈值不能太高

# radio5 上叫法和我们不一样的（人工核对过是同一条流）
MANUAL = {
    'CNR-2 经济之声（中央人民广播电台）': '经济之声',
    'CNR-9 藏语广播（中央人民广播电台）': '中央台藏语广播',
    'CNR-15 中国乡村之声（中央人民广播电台）': '中央台中国乡村之声',
}

# radio5 没有、但官网给了可用图标的
DIRECT = {
    '正声广播电台 FM104（中国台湾）':
        'https://www.csbc.com.tw/wp-content/uploads/2019/12/cropped-6044e1b77e91b4fe89b435-2-180x180.png',
}


def get(url, to=20):
    try:
        p = subprocess.run(['curl', '-sL', '--noproxy', '*', '-m', str(to), '-A', UA, url],
                           capture_output=True, timeout=to + 6)
        return p.stdout
    except Exception:
        return b''


def norm(s):
    s = re.sub(r'[（(][^）)]*[）)]', '', s)          # 去括号注释
    s = re.sub(r'(中国台湾|中国香港|中国澳门|中央人民广播电台)', '', s)
    s = s.lower()
    s = re.sub(r'[^0-9a-z\u4e00-\u9fff]+', '', s)
    return s


def search_stations(q):
    """返回 [(alt, img_url, slug)]"""
    h = get('https://radio5.cn/?s=' + urllib.parse.quote(q)).decode('utf-8', 'ignore')
    out, seen = [], set()
    for m in re.finditer(r'<article[^>]*class="[^"]*\bstation\b[^"]*"[^>]*>(.*?)</article>', h, re.S):
        blk = m.group(1)
        src = re.search(r'<img[^>]+src="([^"]+)"', blk)
        alt = re.search(r'alt="([^"]*)"', blk)
        # 有些条目的 img alt 是空的（或塞了一串编号），退回文章标题
        title = re.search(r'entry-title[^>]*>\s*<a[^>]*>(.*?)</a>', blk, re.S)
        label = (alt.group(1) if alt else '').strip()
        # alt 里塞文件名编号的也算没有
        if (not label or re.fullmatch(r'[\d_\-.]+', label)) and title:
            label = re.sub(r'<[^>]+>', '', title.group(1)).strip()
        if not src or src.group(1) in seen:
            continue
        seen.add(src.group(1))
        out.append((label, src.group(1)))
    return out


def to_webp(raw):
    from PIL import Image, ImageStat
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception:
        return None
    if min(im.size) < MIN_SIDE:
        return None
    try:
        if max(ImageStat.Stat(im.convert('RGB').resize((32, 32))).stddev) < 5:
            return None
    except Exception:
        pass
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, (255, 255, 255, 0))
        bg.alpha_composite(im)
        im = bg
    else:
        im = im.convert('RGB')
    im.thumbnail((128, 128), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=86, method=4)
    return buf.getvalue()


def collect_missing(logos):
    """中国精选台里还没有台标的（每次现算，避免用过期清单）"""
    out = []
    import glob
    for f in glob.glob(f'{ROOT}/src/data/regions/*.ts'):
        t = open(f, encoding='utf-8').read()
        for block in re.split(r"\n  \{\n    slug: '", t)[1:]:
            iso = re.search(r"^\s*iso: '([A-Z]{2})'", block, re.M)
            if not iso or iso.group(1) != 'CN':
                continue
            for m in re.finditer(r"\{ name: '([^']+)'[^}]*?url: '([^']+)'[^}]*\}", block):
                if m.group(2) not in logos:
                    out.append({'name': m.group(1), 'url': m.group(2)})
    return out


def main():
    import difflib
    apply = '--apply' in sys.argv
    logos = json.load(open(f'{ROOT}/src/data/logos.json', encoding='utf-8'))
    missing = collect_missing(logos)

    used = set()
    for p in set(logos.values()):
        f = f'{ROOT}/public{p}'
        if os.path.exists(f):
            used.add(hashlib.sha1(open(f, 'rb').read()).hexdigest())

    def work(item):
        name = item['name']
        if name in DIRECT:
            blob = to_webp(get(DIRECT[name]))
            return item, ('官网图标', DIRECT[name]), blob, 1.0
        q = MANUAL.get(name) or re.sub(r'[（(][^）)]*[）)]', '', name)
        q = re.sub(r'^CNR-\d+\s*', '', q).strip() or name
        cands = search_stations(q)
        if not cands:
            cands = search_stations(q.split()[0])
        best, score = None, 0.0
        # 有手动指定时，按 radio5 自己的叫法比对，不拿我们的名字硬套
        t = norm(MANUAL.get(name, name))
        for alt, url in cands:
            a = norm(alt)
            sc = difflib.SequenceMatcher(None, t, a).ratio()
            # radio5 的台名常带频率（「石家庄音乐广播FM94.6」），包含关系比相似度高可信：
            # 我们的名字整串出现在对方名字里，基本就是同一家
            if len(t) >= 4 and (t in a or a in t):
                sc = max(sc, 0.95)
            if sc > score:
                best, score = (alt, url), sc
        if not best or score < MIN_SCORE:
            return item, None, None, score
        blob = to_webp(get(best[1]))
        return item, best, blob, score

    got = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        for f in as_completed([ex.submit(work, x) for x in missing]):
            item, best, blob, score = f.result()
            if not blob:
                print(f'  ✗ {item["name"][:30]:32s} {("匹配到 "+best[0][:24]) if best else "无结果"} ({score:.2f})')
                continue
            h = hashlib.sha1(blob).hexdigest()
            if h in used:
                print(f'  ~ {item["name"][:30]:32s} 图与已有台重复，跳过')
                continue
            used.add(h)
            got.append((item, best[0], blob, score))
            print(f'  + {item["name"][:30]:32s} <- {best[0][:28]} ({score:.2f})')

    print(f'\n可补 {len(got)} / {len(missing)}')
    if not apply or not got:
        return
    for item, alt, blob, _ in got:
        d = f'{ROOT}/public/logos/cn'
        if not os.path.exists(d):
            os.makedirs(d)
        fn = f'cn-r5{hashlib.sha1(item["url"].encode()).hexdigest()[:10]}.webp'
        open(os.path.join(d, fn), 'wb').write(blob)
        logos[item['url']] = f'/logos/cn/{fn}'
    json.dump(dict(sorted(logos.items())), open(f'{ROOT}/src/data/logos.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    open(f'{ROOT}/src/data/logos.json', 'a').write('\n')
    print(f'已写入，logos.json 现有 {len(logos)} 条')


if __name__ == '__main__':
    main()
