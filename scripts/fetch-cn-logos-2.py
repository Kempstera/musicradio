#!/usr/bin/env python3
"""第二轮补台标：按「城市两字头」检索 radio5，救回改过名的台。

第一轮的 fetch-cn-logos.py 按**全名**搜，漏掉一批「我们叫 A、radio5 叫 B」的台：

  苏州都市音乐广播   ← 苏州音乐广播FM102.8       （自在 1028）
  扬州经济音乐广播   ← 扬州音乐广播YES FM94.9
  江西文艺音乐广播   ← 江西音乐广播FM103.4
  成都天府音乐听91.4 ← 成都交通文艺广播FM91.4     （频点对上）
  广州金曲音乐广播   ← 广州汽车音乐电台FM102.7   （102.7 就是金曲台改的名）
  杭州音乐时尚广播   ← 杭州Z907音乐台FM90.7

三条教训：
  1) radio5 的台名带频率，我们不带 → 光比字符串永远不够像
  2) 图 alt 有时只剩「杭州Z907」，关键词在**文章标题**里 → 判定要用标题
  3) 搜索结果分页，只读第一页会漏

下面这张表是**人工逐张看过图**才敢写进来的（不是自动匹配的输出）：
自动打分只负责找候选，写不写进 logos.json 由人定。
"""
import hashlib
import io
import json
import os
import re
import subprocess
import sys
from urllib.parse import quote

ROOT = '/Users/apple/WorkBuddy/2026-09-29-10-51-58/musicradio'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')

# (我们的台名, radio5 页面上的台名)  —— 配对逐张看过图才写进来的
# 图不写死地址：radio5 换文件名的概率比换台名高，按台名现找更耐放
MATCHES = [
    ('苏州都市音乐广播', '苏州音乐广播FM102.8'),
    ('扬州经济音乐广播', '扬州音乐广播YES FM94.9'),
    ('江西文艺音乐广播', '江西音乐广播FM103.4'),
    ('成都天府音乐听 FM91.4', '成都交通文艺广播FM91.4'),
    ('广州金曲音乐广播', '广州汽车音乐电台FM102.7'),
    ('杭州音乐时尚广播', '杭州Z907音乐台FM90.7'),
]


IMG_OVERRIDE = {}

def find_img(r5name, pages=2):
    """按 radio5 台名回查台标图地址"""
    for pg in range(1, pages + 1):
        u = 'https://radio5.cn/?s=' + quote(r5name) + (f'&paged={pg}' if pg > 1 else '')
        h = get(u).decode('utf-8', 'ignore')
        for m in re.finditer(r'<article[^>]*>(.*?)</article>', h, re.S):
            blk = m.group(1)
            ttl = re.search(r'entry-title[^>]*>\s*<a[^>]*>(.*?)</a>', blk, re.S)
            title = re.sub(r'<[^>]+>', '', ttl.group(1)).strip() if ttl else ''
            src = re.search(r'<img[^>]+src="([^"]+)"', blk)
            if src and title and title.replace(' ', '') == r5name.replace(' ', ''):
                return src.group(1)
        if 'Nothing Found' in h:
            break
    return None


def get(url, to=25):
    try:
        p = subprocess.run(['curl', '-sL', '--noproxy', '*', '-m', str(to), '-A', UA, url],
                           capture_output=True, timeout=to + 6)
        return p.stdout
    except Exception:
        return b''


def to_webp(raw):
    from PIL import Image, ImageStat
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception:
        return None
    if min(im.size) < 60:
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


def curated_cn():
    """{台名: 流地址} —— 中国精选台全表"""
    out = {}
    import glob
    for f in glob.glob(f'{ROOT}/src/data/regions/*.ts'):
        t = open(f, encoding='utf-8').read()
        for block in re.split(r"\n  \{\n    slug: '", t)[1:]:
            iso = re.search(r"^\s*iso: '([A-Z]{2})'", block, re.M)
            if not iso or iso.group(1) != 'CN':
                continue
            for m in re.finditer(r"\{ name: '([^']+)'[^}]*?url: '([^']+)'[^}]*\}", block):
                out.setdefault(m.group(1), m.group(2))
    return out


def main():
    apply = '--apply' in sys.argv
    logos = json.load(open(f'{ROOT}/src/data/logos.json', encoding='utf-8'))
    urls = curated_cn()

    # 去重只在「中国台标」目录里做：全站 4000 多个文件逐个读会被沙箱
    # 的文件读取限额掐掉（SIGTERM），而且跨洲撞同一张图的概率本来就低
    used = set()
    for p in set(logos.values()):
        if not p.startswith('/logos/cn'):
            continue
        f = f'{ROOT}/public{p}'
        if os.path.exists(f):
            used.add(hashlib.sha1(open(f, 'rb').read()).hexdigest())

    got = []
    for name, r5name in MATCHES:
        url = urls.get(name)
        if not url:
            print(f'  ? {name} 不在精选台表里，跳过')
            continue
        if url in logos:
            print(f'  = {name} 已有台标（{logos[url]}），跳过')
            continue
        img = IMG_OVERRIDE.get(r5name) or find_img(r5name)
        if not img:
            print(f'  ✗ {name} 在 radio5 上找不到「{r5name}」')
            continue
        blob = to_webp(get(img))
        if not blob:
            print(f'  ✗ {name} 取图失败 {img}')
            continue
        h = hashlib.sha1(blob).hexdigest()
        if h in used:
            print(f'  ~ {name} 图与已有台重复，跳过')
            continue
        used.add(h)
        got.append((name, url, r5name, blob))
        print(f'  + {name[:20]:22s} <- {r5name}')

    print(f'\n可补 {len(got)} 个')
    if not apply or not got:
        return
    d = f'{ROOT}/public/logos/cn'
    if not os.path.exists(d):
        os.makedirs(d)
    for name, url, r5name, blob in got:
        fn = f'cn-r5{hashlib.sha1(url.encode()).hexdigest()[:10]}.webp'
        open(os.path.join(d, fn), 'wb').write(blob)
        logos[url] = f'/logos/cn/{fn}'
    json.dump(dict(sorted(logos.items())), open(f'{ROOT}/src/data/logos.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    open(f'{ROOT}/src/data/logos.json', 'a').write('\n')
    print(f'已写入，logos.json 现有 {len(logos)} 条')


if __name__ == '__main__':
    main()
