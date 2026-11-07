#!/usr/bin/env python3
"""清理「一张图挂在几十个不相干的台上」的台标。

来历：补图脚本抓不到某台时会退到「同国同名借用」或聚合站的兜底图标，
于是 44 个中国地方音乐台全部指向同一张 60×60 的小图（蜻蜓FM 那边的通用图），
希腊一批台挂的是 Facebook 图标，委内瑞拉那张则被 22 个非洲台共用。

判据：同一张图被多个「名字明显不是一家」的台共用 → 全组判为无效，删映射和文件。
同一品牌的分频道（1.FM - Blues / 1.FM - Bombay、DR P1 / DR P5、
Naxi Rock / Naxi Gold）共用一张是合理的，按「名字公共前缀」识别后保留。

    python3 scripts/dedupe-logos.py            # 只报告
    python3 scripts/dedupe-logos.py --apply
"""
import collections
import glob
import json
import os
import re
import sys

ROOT = '/Users/apple/WorkBuddy/2026-09-29-10-51-58/musicradio'

# 公共前缀够长才算同品牌（"fred film radio" 这种）
BRAND_PREFIX = 6
# 同国且前缀较短也算（"1.FM " 这种母语牌子）
BRAND_PREFIX_SAME_CC = 3

# 人工确认过的合理共用：同一家广播机构的不同频率，台标本来就一样
KEEP = {
    '/logos/dk/dk-ea5ba2ea6a.webp',  # DR P1 / P3 / P4 / P5 / P8 —— 丹麦广播公司
}


def norm(s):
    s = s.lower().replace('&#39;', "'")
    s = re.sub(r'[^0-9a-z\u4e00-\u9fff\u00c0-\u024f ]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def common_prefix(names):
    if not names:
        return ''
    p = names[0]
    for n in names[1:]:
        i = 0
        while i < min(len(p), len(n)) and p[i] == n[i]:
            i += 1
        p = p[:i]
        if not p:
            break
    return p.strip()


def load_names():
    """url → (iso, name)；radios.json 的采集台 + regions 里的精选台"""
    out = {}
    for cc, lst in json.load(open(f'{ROOT}/src/data/radios.json')).items():
        for s in lst:
            out.setdefault(s['url'], (cc, s['name']))
    for f in glob.glob(f'{ROOT}/src/data/regions/*.ts'):
        t = open(f, encoding='utf-8').read()
        for block in re.split(r"\n  \{\n    slug: '", t)[1:]:
            iso = re.search(r"^\s*iso: '([A-Z]{2})'", block, re.M)
            if not iso:
                continue
            for m in re.finditer(r"\{ name: '([^']+)'[^}]*?url: '([^']+)'[^}]*\}", block):
                out.setdefault(m.group(2), (iso.group(1), m.group(1)))
    return out


def main():
    apply = '--apply' in sys.argv
    logos = json.load(open(f'{ROOT}/src/data/logos.json', encoding='utf-8'))
    names = load_names()

    by_file = collections.defaultdict(list)
    for u, p in logos.items():
        by_file[p].append(u)

    drop_files, keep_brand = {}, []
    for p, urls in by_file.items():
        if len(urls) < 2:
            continue
        info = [names.get(u) for u in urls]
        labels = [norm(i[1]) for i in info if i]
        ccs = {i[0] for i in info if i}
        if len(set(labels)) < 2:
            continue  # 同名（同一台的两个流）共用一张，正常
        # 词序不同但词一样，其实是同一家（'Bay 89.7' / '89.7 Bay'）
        if len({tuple(sorted(l.split())) for l in set(labels)}) == 1:
            continue
        if p in KEEP:
            keep_brand.append((p, len(urls), '（人工保留）'))
            continue
        pre = common_prefix(sorted(set(labels)))
        same_cc = len(ccs) == 1
        if len(pre) >= BRAND_PREFIX or (same_cc and len(pre) >= BRAND_PREFIX_SAME_CC):
            keep_brand.append((p, len(urls), pre))
        else:
            drop_files[p] = (urls, sorted(set(labels))[:3], sorted(ccs)[:4])

    print(f'共用同一张图、且不像同品牌 → 判无效 {len(drop_files)} 组：')
    for p, (urls, labels, ccs) in sorted(drop_files.items(), key=lambda x: -len(x[1][0])):
        print(f'  x{len(urls):3d} {p}  {ccs}  例: {" / ".join(labels)}')
    print(f'\n同品牌共用、保留 {len(keep_brand)} 组：')
    for p, n, pre in sorted(keep_brand, key=lambda x: -x[1])[:12]:
        print(f'  x{n:3d} {p}  前缀「{pre}」')

    if not apply:
        print('\n（预览，未落盘）')
        return

    removed = 0
    for p in drop_files:
        for u in [u for u, q in logos.items() if q == p]:
            del logos[u]
            removed += 1
        f = f'{ROOT}/public{p}'
        if os.path.exists(f):
            os.remove(f)
    json.dump(dict(sorted(logos.items())), open(f'{ROOT}/src/data/logos.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    open(f'{ROOT}/src/data/logos.json', 'a').write('\n')
    print(f'\n删除映射 {removed} 条，logos.json 现有 {len(logos)} 条')


if __name__ == '__main__':
    main()
