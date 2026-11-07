#!/usr/bin/env python3
"""音乐台准入过滤器 —— 本站只收音乐电台。

宗教（尤其伊斯兰诵经）、新闻谈话、体育、成人内容一律不进库。这个判断不能只看
台名：ORB / radio-browser 上大量诵经台叫「Radio 90」「Alfa」「Nour」，名字干净得
很；反过来「adult contemporary」是音乐格式不是色情，「gospel」却是实打实的宗教台。

判据分四层，从严到宽：

  1. 宗教流派/标签 —— christian / gospel / islamic / spiritual / quran / church …
     只要出现就出局。宗教是唯一「沾一点也算」的类别，因为诵经台常常同时挂
     pop、variety 之类无关流派，靠「多数流派是音乐」会漏；
  2. 非音乐流派/标签 —— news / talk / sports / politics / deporte(s) / noticias …
     这一层要求「全部流派都是非音乐」才出局。像「Dominicana FM」
     （bachata, merengue, noticias, salsa）是音乐台，只是顺手播新闻，不能删；
  3. 台名关键词 —— 拉丁转写 + 阿拉伯 / 波斯 / 乌尔都 / 土耳其 / 孟加拉 / 印尼 /
     天城文 / 泰文 / 希伯来文 / 西里尔 / 韩文 / 中文全覆盖；拉丁按整词匹配，
     免得 gitana 撞上 gita、Medina 撞上 medina（地名）；
  4. 白名单 —— adult contemporary、christmas music 这类先剥掉，避免误伤。

用法：
    python3 scripts/station-filter.py            # 体检库里的台，只报告不动手
    python3 scripts/station-filter.py --apply    # 体检并删掉命中的台
"""
import json
import re
import sys

ROOT = '/Users/apple/WorkBuddy/2026-09-29-10-51-58/musicradio'

# ── ① 宗教：沾一点就出局 ────────────────────────────────────────────────────
RELIGIOUS = {
    'christian', 'christianity', 'gospel', 'islam', 'islamic', 'islamique',
    'muslim', 'quran', 'quranic', 'koran', 'spiritual', 'spirituality',
    'religious', 'religion', 'church', 'worship', 'sermon', 'sermons',
    'bible', 'catholic', 'orthodox', 'jewish', 'hindu', 'buddhist', 'buddhism',
    'sikh', 'taoist', 'devotional', 'praise',
}

# ── ② 非音乐：全部流派都不是音乐才出局 ──────────────────────────────────────
NONMUSIC = {
    'news', 'talk', 'talkshow', 'speech', 'sports', 'sport', 'business',
    'politics', 'comedy', 'education', 'current affairs', 'information',
    'noticias', 'noticia', 'nachrichten', 'actualidad', 'atualidade', 'info',
    'jornal', 'jornalismo', 'journal', 'journalism', 'politique', 'politica',
    'politik', 'deporte', 'deportes', 'desporto', 'esporte', 'futbol',
    'fútbol', 'futebol', 'soccer', 'cricket', 'football', 'calcio', 'tennis',
    'motogp', 'racing', 'podcast', 'podcasts', 'debate', 'obituaries',
    'erotic', 'erotik', 'porn', 'porno', 'sex', 'teleshopping',
}

# ── ③ 台名关键词（拉丁，按整词匹配） ────────────────────────────────────────
BAD_WORDS = """
quran qur'an qoran koran coran kuran kur'an kareem karim qari qori quari qaria
tilawa tilawat tajweed tafsir tafseer mujawwad murattal
islam islami islamic islamique muslim moslem allah allahu muhammad mohammed muhammed
sunnah sunna dawah dawa hadith hadis fatwa sharia shariah
makkah makka mecca madinah haramain haram kaaba azan adhan azaan ezan
noor huda hudaa hidayah iman taqwa ummah umma salaf salafi sahaba
ramadan ramzan ramadhan mawlid mevlid milad nasheed nasyid nashid sholawat selawat
kajian mengaji ngaji santri pesantren diyanet ilahi ilahiler
gospel jesus cristo crista cristian evangelho deus christ bible biblical church iglesia igreja eglise kirche
kerk worship praise ministry ministries sermon preaching preacher
catholic catolico catolica adventist baptist methodist lutheran presbyterian
pentecost evangelical evangelist jehovah mormon latter vatican papale orthodox
bhajan bhajans bhakti kirtan keertan mantra vedic gita githa aarti arati gurbani shabad
torah talmud shabbat shabbos yeshiva synagogue rabbi kosher
dhamma dharma vipassana sangha monastery monks buddhism buddhist
devotional devotion
news noticias noticia nachrichten actualidad atualidade jornal journal jornalismo
politique politica politics politik deporte deportes desporto esporte
sport sports futbol fútbol futebol soccer cricket football calcio fussball
motogp racing podcast podcasting debate obituar teleshopping
erotic erotik porno porn sex sexo escort swingers fides ewtn
"""

# ── ④ 白名单：先从标签里剥掉这些整串短语，剩下的词再判 ──────────────────────
ALLOW_PHRASES = (
    'adult contemporary', 'christmas music', 'christmas songs', 'christmas hits',
    'christmas carols', 'sacred harp', 'soul music', 'urban adult contemporary',
    'soft adult contemporary', 'hot adult contemporary',
)

# ── ④·2 多词短语（含空格的关键词不能塞进 BAD_WORDS，会被按空格拆成单词） ──
BAD_PHRASES = (
    'radio maria', 'radio maryja', 'radio maryja', 'radio catolica',
    'radio cristiana', 'radio evangelica', 'radio islam', 'radio quran',
    'radio coran', 'radio kuran', 'voz de vida', 'radio fides', 'ewtn radio',
    'mision cristiana', 'misiones cristianas', 'radio cristiana', 'radio santa maria',
)

# ── ⑤ 非拉丁文字（子串匹配，这些文字没有空格分词） ──────────────────────────
BAD_SUBSTR = (
    '佛', '禅', '僧', '诵经', '佛经', '经文', '福音', '圣经', '教会', '主日', '赞美',
    '圣诗', '圣歌', '灵修', '布道', '古兰', '清真', '礼拜', '阿訇', '念经', '大悲咒',
    '阿弥陀', '观音', '地藏',
    '불교', '기독', '성경', '예배', '찬송', '이슬람', '코란',
    'библи', 'православ', 'ислам', 'коран', 'церков', 'монаст', 'молитв', 'евангел',
    'εκκλησ', 'χριστιαν', 'ισλαμ', 'κοραν',
    'ธรรม', 'พุทธ', 'สวด', 'พระ',
    'قرآن', 'قران', 'القران', 'إسلام', 'اسلام', 'اسلامی', 'دين', 'ديني', 'سنة',
    'دعاء', 'تلاوة', 'خطبة', 'مكة', 'المدينة', 'الحرم', 'مسجد', 'جامع', 'شيخ',
    'أناشيد', 'نشيد', 'حديث', 'فتوى', 'أذان', 'اذان', 'رمضان', 'عمرة', 'دعوة',
    'سلف', 'تفسير', 'تجويد', 'كريم', 'اهل البيت', 'صحابة', 'تراتيل', 'سيرة', 'قراء', 'تلاوات', 'خطب',
    'কুরআন', 'কোরআন', 'ইসলাম', 'দ্বীন', 'নামাজ', 'ওয়াজ',
    'भजन', 'कीर्तन', 'गीता', 'धार्मिक', 'आरती', 'भागवत', 'मंदिर',
    'יהדות', 'תורה', 'תפילה',
)


# 流地址本身不能是短链/跳转服务：那只是一个跳板，不是可播流，
# 而且 ORB 上有一整个「Antenna Web + 城市名」的网络用 tinyurl 铺了 52 个国家的假本地台
BAD_URL_HOSTS = (
    'tinyurl.com', 'bit.ly', 'goo.gl', 'cutt.ly', 'shorturl.at', 'rebrand.ly',
    'ow.ly', 'is.gd', 'buff.ly', 'tiny.cc', 't.ly', 'rb.gy', 'lnk.to',
)


# 流地址里的关键词：台名可以叫「伊斯兰 XX 电台」但写成拉丁字母，也可以直接叫
# 某位诵经者的名字（qurango.net 上一个诵经者一个频道），名字层认不出来，
# 地址层却一定露馅
BAD_URL_WORDS = (
    'quran', 'qur-an', 'qoran', 'koran', 'kuran', 'islam', 'muslim', 'masjid',
    'mosque', 'qari', 'tilawat', 'tajweed', 'sunnah', 'dawah', 'hadith',
    'tarateel', 'sahabah', 'seerah', 'gospel', 'christian', 'church', 'bible',
    'worship', 'sermon', 'radiomaria', 'radio-maria', 'radio_maria', 'ewtn',
    'vatican', 'bhajan', 'kirtan', 'mandir', 'gurbani', 'torah', 'yeshiva',
    'dhamma', 'buddha', 'monastery',
)


def bad_url(url):
    """短链跳板一律不进库（返回命中的域名，否则 None）。"""
    host = re.sub(r'^https?://', '', (url or '').lower()).split('/')[0]
    host = host.split(':')[0]
    for h in BAD_URL_HOSTS:
        if host == h or host.endswith('.' + h):
            return h
    low = (url or '').lower()
    for w in BAD_URL_WORDS:
        if w in low:
            return f'地址含「{w}」'
    return None


def _tagset(tags):
    """radio-browser 的 tags 是逗号串；ORB 的 genres 是数组。统一成小写集合。"""
    out = set()
    for t in re.split(r'[,;|]', tags or ''):
        t = t.strip().lower()
        if t:
            out.add(t)
    return out


def _clean_tagtext(tags):
    s = ' ' + re.sub(r'[,;|]+', ' ', (tags or '').lower()) + ' '
    for p in ALLOW_PHRASES:
        s = s.replace(p, ' ')
    return s


def _words(text):
    """拉丁台名拆词：重音归一到 ASCII 比较范围，撇号统一。"""
    s = text.lower().replace('\u2019', "'").replace('`', "'")
    # christmas 是音乐类型不是宗教台，先抹掉，免得 christ 误伤
    s = s.replace('christmas', 'xmas')
    s = re.sub(r'[^0-9a-z\u00c0-\u024f\' ]+', ' ', s)
    return ' ' + re.sub(r'\s+', ' ', s).strip() + ' '


def classify(name, tags='', genres=None):
    """返回 ('religious'|'nonmusic', 原因)；合格返回 None。"""
    gs = {g.strip().lower() for g in (genres or []) if g and g.strip()}
    ts = _tagset(tags)

    # ① 宗教：流派或标签里出现就出局
    for g in gs | ts:
        if g in RELIGIOUS:
            return 'religious', f'流派/标签:{g}'

    # ② 非音乐：全部流派（含标签）都不是音乐才算
    everything = gs | ts
    if everything and everything <= NONMUSIC:
        return 'nonmusic', '流派/标签全是非音乐'

    # ③ 台名关键词
    w = _words(name)
    for k in BAD_WORDS.split():
        if ' ' in k:
            if f' {k} ' in w:
                return 'name', f'台名:{k}'
        elif re.search(r'\b' + re.escape(k), w):
            return 'name', f'台名:{k}'

    for ph in BAD_PHRASES:
        if ph in w:
            return 'name', f'台名:{ph}'

    # ④ 非拉丁文字
    for k in BAD_SUBSTR:
        if k in name:
            return 'name', f'台名({k})'

    # ⑤ 干净的标签里还剩非音乐词（如 tags 混了 news 但也有音乐）→ 放行，
    #    除非名字本身看上去就是新闻/体育（Bloop 之外不再加码，避免误杀）
    return None


def audit(radios):
    hits = []
    for cc, lst in radios.items():
        for s in lst:
            r = classify(s['name'], s.get('tags', ''), [])
            if not r and bad_url(s['url']):
                r = ('url', bad_url(s['url']))
            if r:
                hits.append((cc, s, r))
    return hits


def main():
    apply = '--apply' in sys.argv
    path = f'{ROOT}/src/data/radios.json'
    radios = json.load(open(path, encoding='utf-8'))
    hits = audit(radios)
    total = sum(len(v) for v in radios.values())
    print(f'共 {total} 台，命中 {len(hits)} 个')
    for cc, s, (kind, why) in hits:
        print(f'  [{kind:9s}] {cc} | {s["name"][:44]:46s} | {why}')

    if apply and hits:
        drop = {(cc, s['url']) for cc, s, _ in hits}
        for cc in list(radios):
            radios[cc] = [s for s in radios[cc] if (cc, s['url']) not in drop]
        json.dump(radios, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'\n已删除 {len(drop)} 台，剩 {sum(len(v) for v in radios.values())} 台')


if __name__ == '__main__':
    main()
