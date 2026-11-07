#!/usr/bin/env python3
"""同一路流只留一条。

ORB 上同一个台常有多个条目，名字只差一个字母或大小写：
「Antinea Radio / A ntinea Radio」「Diwan FM / diwanfm」「Radio Bizi Inter / Rqdio Bizi Inter」。
同一路流在列表里出现两三次，用户会以为是不同的台，点开却是同一个声音。

保留规则：单字母词少的优先（「A ntinea」这种是抓取时断词断错了），
其次不含 rqdio 这类明显错拼，再次大写字母多的（说明是正式写法）。

    python3 scripts/dedupe-radios.py            # 只报告
    python3 scripts/dedupe-radios.py --apply    # 真删
"""
import json
import re
import sys
from collections import defaultdict

ROOT = '/Users/apple/WorkBuddy/2026-09-29-10-51-58/musicradio'
PATH = f'{ROOT}/src/data/radios.json'


def quality(name):
    toks = name.split()
    # 只统计「拉丁字母的单字母词」；格鲁吉亚语这类非拉丁词干会被过滤成空串，
    # 不能当成单字母词，否则纯外文台名会莫名胜出
    singles = 0
    for t in toks:
        t2 = re.sub(r'[^A-Za-z0-9]', '', t)
        if t2 and len(t2) <= 1:
            singles += 1
    typo = 1 if re.search(r'rqdio|r[ai]dio\s*\d', name.lower()) else 0
    upper = sum(1 for c in name if c.isupper())
    return (singles, typo, -upper, -len(name), name)


def main():
    apply = '--apply' in sys.argv
    radios = json.load(open(PATH, encoding='utf-8'))

    idx = defaultdict(list)
    for cc, lst in radios.items():
        for s in lst:
            idx[s['url'].rstrip('/').lower()].append((cc, s))

    drop = set()
    report = []
    for url, group in idx.items():
        if len(group) < 2:
            continue
        group.sort(key=lambda p: quality(p[1]['name']))
        keep = group[0]
        for cc, s in group[1:]:
            # 有些台（早期手工补的）没有 stationuuid，只能按对象身份记
            drop.add(id(s))
            report.append((cc, s['name'], keep[1]['name']))

    print(f'重复流 {len([g for g in idx.values() if len(g) > 1])} 组，将删除 {len(drop)} 条')
    for cc, gone, kept in report:
        print(f'  {cc} | 删「{gone[:38]}」保留「{kept[:38]}」')

    if apply and drop:
        for cc in list(radios):
            radios[cc] = [s for s in radios[cc] if id(s) not in drop]
        json.dump(radios, open(PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'\n剩 {sum(len(v) for v in radios.values())} 台')


if __name__ == '__main__':
    main()
