#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成社交分享图（1200×630）。

为什么自己画而不用大陆地图之类的素材：og:image 只需要让人一眼看出「这是什么站」，
用站点自己的纸色 + 朱红 + 宋体，比配一张风景照更稳，也不会和别人的图撞。

字距是逐字排的：PIL 没有 letter-spacing，英文小标必须自己控制间距，
否则「WORLD MUSIC RADIO」会挤成一团。
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PAPER = (246, 242, 233)
INK = (35, 33, 28)
INK2 = (87, 83, 74)
RED = (177, 80, 58)
BLUE = (51, 96, 143)
OCHRE = (169, 118, 47)
GREEN = (77, 115, 86)

SONGTI = "/System/Library/Fonts/Supplemental/Songti.ttc"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "public", "img", "og-cover.png")


def font(size, index=1):
    return ImageFont.truetype(SONGTI, size, index=index)


def spaced(draw, xy, text, f, fill, gap=6):
    """逐字画，用来模拟字距。"""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += f.getlength(ch) + gap
    return x - gap


img = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(img)

M = 96
spaced(d, (M, 118), "WORLD MUSIC RADIO", font(22), RED, gap=7)
d.line([(M, 168), (M + 86, 168)], fill=RED, width=3)

d.text((M - 4, 196), "如聽仙樂", font=font(104, 2), fill=INK)   # index 2 = 宋体-简 粗
d.text((M - 4, 316), "耳暫明", font=font(104, 2), fill=INK)

d.text((M, 456), "世界音乐电台巡礼 · 195 个国家与地区", font=font(34, 1), fill=INK2)
d.text((M, 508), "点开地图，落在某个城市的声音里", font=font(28, 1), fill=(139, 132, 120))

# 左下角四色方块：对应站点用来区分大洲的四种颜色，和文字共用一条左侧轴线。
# y 必须落在第三行副标题（基线 508、字号 28）之下，否则会压字。
x0, y0, s, gap = M, H - 56, 18, 12
for i, c in enumerate((RED, BLUE, OCHRE, GREEN)):
    x = x0 + i * (s + gap)
    d.rectangle([(x, y0), (x + s, y0 + s)], fill=c)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print("写入 %s (%.0f KB)" % (OUT, os.path.getsize(OUT) / 1024))
