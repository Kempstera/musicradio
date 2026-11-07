#!/usr/bin/env python3
"""给「没有台标」的电台单独找图 —— 一次一个台，不再共用一张。

背景：补图脚本为了追求覆盖率，抓不到时会退到聚合站/同国同名的兜底图，
结果 44 个中国地方音乐台全挂同一张小图。那种图被 scripts/dedupe-logos.py 清掉了，
这里负责用「一台一图」的方式重新补：同名匹配从严（≥0.92），
且**同一张图不允许挂到两个不同名字的台上**（按图片内容哈希去重）。

    python3 scripts/refill-missing-logos.py --cc CN,GR,VE
    python3 scripts/refill-missing-logos.py --cc CN --apply
"""
import hashlib
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
MIN_SCORE = 0.92

BAD_ICON_HOSTS = ('facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com',
                  'youtube.com', 'youtu.be', 'play.google.com', 'apps.apple.com',
                  'tiktok.com', 'linkedin.com', 'wa.me', 'whatsapp.com', 't.me',
                  'google.com', 'apple.com', 'soundcloud.com', 'spotify.com')


def fetch(url, to=15):
    try:
        p = subprocess.run(['curl', '-sL', '--proxy', PROXY, '-m', str(to), '-A', UA, url],
                           capture_output=True, timeout=to + 6)
        return p.stdout or b''
    except Exception:
        return b''


def is_letterbox(im):
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


def to_webp(raw):
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
    if is_letterbox(im):
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


def norm(s):
    s = s.lower().replace('&#39;', "'")
    # 保留各语系的字母：之前只留拉丁 + 中文，导致西里尔／格鲁吉亚／希腊台名
    # 全部归一成空串、彼此「完全匹配」，抓回来一堆别家的图标。
    s = re.sub(r'[^0-9a-z\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff\u0530-\u058f'
               r'\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f'
               r'\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]+', '', s)
    return s


def rb_pool(cc):
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
    q = name.replace(' ', '%20')
    raw = fetch(f'https://de1.api.radio-browser.info/json/stations/search'
                f'?name={q}&countrycode={cc}&limit=15&hidebroken=true')
    try:
        return json.loads(raw)
    except Exception:
        return []


def candidates(cc, name):
    """按匹配度返回候选 (score, station)，严格到 0.92"""
    import difflib
    t = norm(name)
    if len(t) < 3:
        return []          # 归一化后几乎没剩下可比的东西，宁可不配
    pool = rb_pool(cc)
    if not pool:
        pool = rb_search(name, cc)
    scored = []
    for st in pool:
        sc = difflib.SequenceMatcher(None, t, norm(st.get('name', ''))).ratio()
        if sc >= MIN_SCORE:
            scored.append((sc, st))
    if not scored:
        for st in rb_search(name, cc):
            sc = difflib.SequenceMatcher(None, t, norm(st.get('name', ''))).ratio()
            if sc >= MIN_SCORE:
                scored.append((sc, st))
    scored.sort(key=lambda x: -x[0])
    return scored


def stations(cc):
    """该国未挂台标的台（采集台 + 精选台），带原始字段"""
    logos = json.load(open(f'{ROOT}/src/data/logos.json', encoding='utf-8'))
    out = []
    radios = json.load(open(f'{ROOT}/src/data/radios.json', encoding='utf-8'))
    for s in radios.get(cc, []):
        if s['url'] not in logos:
            out.append((s['url'], s['name']))
    import glob
    for f in glob.glob(f'{ROOT}/src/data/regions/*.ts'):
        t = open(f, encoding='utf-8').read()
        for block in re.split(r"\n  \{\n    slug: '", t)[1:]:
            iso = re.search(r"^\s*iso: '([A-Z]{2})'", block, re.M)
            if not iso or iso.group(1) != cc:
                continue
            for m in re.finditer(r"\{ name: '([^']+)'[^}]*?url: '([^']+)'[^}]*\}", block):
                if m.group(2) not in logos:
                    out.append((m.group(2), m.group(1)))
    return out


def main():
    apply = '--apply' in sys.argv
    ccs = ['CN']
    for i, a in enumerate(sys.argv):
        if a == '--cc' and i + 1 < len(sys.argv):
            ccs = sys.argv[i + 1].split(',')
    logos = json.load(open(f'{ROOT}/src/data/logos.json', encoding='utf-8'))

    # 已有图片的内容哈希 → 用来防止「一图多台」
    used = set()
    for p in set(logos.values()):
        f = f'{ROOT}/public{p}'
        if os.path.exists(f):
            used.add(hashlib.sha1(open(f, 'rb').read()).hexdigest())

    todo = []
    for cc in ccs:
        todo += [(cc,) + s for s in stations(cc)]
    print(f'待补 {len(todo)} 个台（{",".join(ccs)}）', flush=True)

    got = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {}
        for cc, url, name in todo:
            futs[ex.submit(candidates, cc, name)] = (cc, url, name)
        for f in as_completed(futs):
            cc, url, name = futs[f]
            for score, st in f.result()[:3]:
                blob = None
                fav = st.get('favicon') or ''
                host = re.sub(r'^https?://', '', fav).split('/')[0].lower()
                if fav.startswith('http') and not any(host == h or host.endswith('.' + h) for h in BAD_ICON_HOSTS):
                    blob = to_webp(fetch(fav))
                if not blob:
                    hp = st.get('homepage') or ''
                    h = re.sub(r'^https?://', '', hp).split('/')[0].lower()
                    if h and '.' in h and not any(h == x or h.endswith('.' + x) for x in BAD_ICON_HOSTS):
                        blob = to_webp(fetch(f'https://icon.horse/icon/{h}'))
                if not blob:
                    continue
                h = hashlib.sha1(blob).hexdigest()
                if h in used:
                    print(f'  ~ {cc} {name[:26]:28s} 图与别台重复，跳过', flush=True)
                    continue
                used.add(h)
                got.append((cc, url, name, blob, score, st.get('name', '')[:24]))
                break

    for cc, url, name, blob, score, rbname in got:
        print(f'  + {cc} {name[:26]:28s} <- {rbname} ({score:.2f})')

    if apply and got:
        for cc, url, name, blob, *_ in got:
            d = f'{ROOT}/public/logos/{cc.lower()}'
            if not os.path.exists(d):
                os.makedirs(d)
            fn = f"{cc.lower()}-own{hashlib.sha1(url.encode()).hexdigest()[:10]}.webp"
            open(os.path.join(d, fn), 'wb').write(blob)
            logos[url] = f'/logos/{cc.lower()}/{fn}'
        json.dump(dict(sorted(logos.items())), open(f'{ROOT}/src/data/logos.json', 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=2)
        open(f'{ROOT}/src/data/logos.json', 'a').write('\n')
        print(f'补 {len(got)} 个，logos.json 现有 {len(logos)} 条')


if __name__ == '__main__':
    main()
