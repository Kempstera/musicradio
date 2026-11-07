#!/usr/bin/env python3
"""
第二轮补救：对 fetch-station-logos.py 仍然抓不到台标的电台，
改从 icon.horse 的图标缓存取（它保存了很多站点宕机前/改版前的图标）。

只补缺口，不覆盖任何已有映射。
质量门槛比第一轮高一档（MIN_SIDE=48），因为第三方缓存常有 16px 放大件，
那种糊图不如用本站兜底标识。

用法：python3 scripts/rescue-station-logos.py [--dry-run]
"""
import hashlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RADIOS = os.path.join(ROOT, 'src/data/radios.json')
LOGOS_JSON = os.path.join(ROOT, 'src/data/logos.json')
OUT_ROOT = os.path.join(ROOT, 'public/logos')

PROXY = os.environ.get('LOGO_PROXY', 'http://127.0.0.1:9674')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
MIN_SIDE = 48
TARGET = 128
QUALITY = 84

# 复用第一轮脚本里的转码与嗅探（同目录）
spec = importlib.util.spec_from_file_location('fsl', os.path.join(ROOT, 'scripts/fetch-station-logos.py'))
fsl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fsl)


# 这些主机返回的是平台/服务商图标，不是电台自己的标识，宁可留着本站兜底
BAD_HOSTS = (
    'sites.google.com', 'google.com', 'blogspot.', 'wordpress.com', 'wixsite.com',
    'weebly.com', 'jimdo.com', 'webnode.', 'github.io', 'netlify.app', 'vercel.app',
    'zvuch.com', 'server89.com', 'radioking.com', 'zeno.fm', 'radio.co',
    'listen2myradio.com', 'radionomy.com', 'streamguys', 'shoutcast',
)


def grab(host):
    """icon.horse → 字节；失败再用 Google s2 的 sz=256"""
    url = f'https://icon.horse/icon/{host}'
    try:
        p = subprocess.run(['curl', '-sL', '--proxy', PROXY, '-m', '12', '-A', UA, url],
                           capture_output=True, timeout=18)
        b = p.stdout
        if fsl.sniff(b):
            return b, fsl.sniff(b)
    except Exception:
        pass
    url = f'https://www.google.com/s2/favicons?domain={host}&sz=256'
    try:
        p = subprocess.run(['curl', '-sL', '--proxy', PROXY, '-m', '12', '-A', UA, url],
                           capture_output=True, timeout=18)
        b = p.stdout
        if fsl.sniff(b):
            return b, fsl.sniff(b)
    except Exception:
        pass
    return None, None


def convert(raw, kind):
    """转 WebP，并把尺寸门槛提到 MIN_SIDE（第三方缓存的小图直接放弃）"""
    from PIL import Image, ImageStat
    if kind == 'svg':
        return raw, 'svg'
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception:
        return None, None
    if max(im.size) < MIN_SIDE:
        return None, None
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
    dry = '--dry-run' in sys.argv
    data = json.load(open(RADIOS, encoding='utf-8'))
    logos = json.load(open(LOGOS_JSON, encoding='utf-8'))

    by_host = {}
    for cc, st in data.items():
        for s in st:
            if s['url'] in logos or not s.get('homepage'):
                continue
            host = urlparse(s['homepage']).netloc.lower().replace('www.', '')
            host = host.split(':')[0]
            if not host or any(b in host for b in BAD_HOSTS):
                continue
            by_host.setdefault(host, []).append((cc, s))

    print(f'仍缺台标且有官网：{sum(len(v) for v in by_host.values())} 家 → {len(by_host)} 个域名')
    if dry:
        print('（dry-run）域名示例：' + '、'.join(list(by_host)[:15]))
        return

    results = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(grab, h): h for h in by_host}
        done = 0
        for f in as_completed(futs):
            h = futs[f]
            try:
                results[h] = f.result()
            except Exception:
                results[h] = (None, None)
            done += 1
            if done % 40 == 0 or done == len(futs):
                ok = sum(1 for b, _ in results.values() if b)
                print(f'  … {done}/{len(futs)} 域名，拿到 {ok} 张', flush=True)

    # 转码 + 同图去重 + 通用图标剔除
    hash_domains = {}
    pending = []
    for host, (raw, kind) in results.items():
        if not raw:
            continue
        b, ext = convert(raw, kind)
        if not b:
            continue
        h = hashlib.sha1(b).hexdigest()
        hash_domains.setdefault(h, set()).add(host)
        pending.append((host, b, ext, h))
    generic = {h for h, ds in hash_domains.items() if len(ds) >= 3}
    if generic:
        print(f'剔除通用图标 {len(generic)} 张')

    saved = {}
    written = 0
    for host, raw, ext, h in pending:
        if h in generic:
            continue
        for cc, s in by_host[host]:
            if h in saved:
                logos[s['url']] = saved[h]
                continue
            d = os.path.join(OUT_ROOT, cc.lower())
            os.makedirs(d, exist_ok=True)
            slug = (s.get('stationuuid') or h[:10]).replace('-', '')[:10]
            name = f'{cc.lower()}-{slug}.{ext}'
            with open(os.path.join(d, name), 'wb') as fh:
                fh.write(raw)
            rel = f'/logos/{cc.lower()}/{name}'
            saved[h] = rel
            logos[s['url']] = rel
            written += 1

    logos = dict(sorted(logos.items()))
    with open(LOGOS_JSON, 'w', encoding='utf-8') as fh:
        json.dump(logos, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    total = sum(len(v) for v in data.values())
    print(f'\n补救新增 {written} 家 · 映射 {len(logos)} 条 / 全站 {total} 家 → {len(logos)/total:.1%}')


if __name__ == '__main__':
    main()
