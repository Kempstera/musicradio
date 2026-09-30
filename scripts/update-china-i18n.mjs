// 一次性更新中国（china）的 music / musicians 到 source.json、zh-TW.json、en.json
import * as OpenCC from 'opencc-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'src', 'data', 'i18n');

// ---------- 中文原文 ----------
const zh = {
  music: [
    '中国音乐的底色，是根植于哲学与诗意的「留白」。从古琴拨弦间的「大音希声」，到戏曲唱腔里的水墨气韵，中国古典音乐从不追求物理音响的极致丰满，而是向内探寻心境的旷达与幽微。',
    '进入二十世纪，这片古老的声场迎来了与西方交响乐的深刻碰撞。1879 年上海公共乐队（上海交响乐团前身）的成立，标志着西方古典音乐体系在中国落地。然而，中国音乐家并未止步于做西方技法的模仿者。近百年来，几代作曲家与演奏家致力于一种艰难而迷人的探索：用西洋乐器的骨架，去承载中国文人画般的意境；用交响乐的宏大织体，去转译东方哲学的深邃。从早期试图在钢琴上寻找笛声与古琴韵味的先驱，到如今在世界顶级音乐厅里用交响乐重塑《诗经》与唐诗的当代大师，中国音乐史不仅是一部民族觉醒的史诗，更是一场绵延百年的、东西方文明的美学对话。',
  ],
  musicians: [
    { name: '管平湖', role: '古琴宗师，中国传统文人音乐的最高境地', desc: '代表作《流水》（Flowing Water）。要理解中国音乐的源头，不能不听古琴：管平湖是 20 世纪中国最重要的古琴大师，指法古朴刚健、气韵深宏。1977 年，他演奏的《流水》被镌刻在旅行者 1 号金唱片上送入太空，在浩瀚宇宙中代表人类文明的回音。这不仅是音乐，更是中国古人「天人合一」宇宙观的声学表达。' },
    { name: '黄自', role: '作曲家，中国近代专业音乐教育的奠基人', desc: '将西方作曲技法与中国诗词完美融合的先驱。代表作《长恨歌》（The Song of Everlasting Sorrow）：在 20 世纪初的动荡中，黄自以极高的学院派素养写下了中国第一部大型管弦乐清唱剧，用类似德奥浪漫主义的严密和声谱写白居易笔下大唐盛世的爱情悲剧，是中国交响乐史上一座典雅的丰碑。' },
    { name: '马思聪', role: '小提琴家 / 作曲家，中国小提琴艺术的开拓者', desc: '被誉为「中国小提琴第一人」。代表作《思乡曲》（Nostalgia）：马思聪用一把西方的小提琴拉出了最醇厚的中国乡愁，将内蒙古民歌的苍凉旋律与古典小提琴的柔美发音融为一体。在战火纷飞的年代，这首曲子成为无数海外游子与文人知识分子的精神寄托。' },
    { name: '傅聪', role: '钢琴家，享誉世界的钢琴泰斗', desc: '被《时代》周刊誉为「当今时代最伟大的钢琴诗人」。代表作肖邦《夜曲》与《马祖卡》（Chopin: Nocturnes & Mazurkas）：傅聪的伟大，在于他用中国士大夫的灵魂去弹奏西方古典，将李白、杜甫、李清照的诗意与中国水墨画的「虚实相生」完美注入肖邦的琴键，是极少数能让欧洲古典乐坛心悦诚服的东方演绎者。' },
    { name: '陈其钢', role: '作曲家，当代享誉全球的作曲大师', desc: '法国现代音乐巨匠梅西安的关门弟子。代表作《逝去的时光》（Reflet d\'un temps disparu）：如果说有人能把法国印象派的斑斓色彩与中国传统文化的哀婉凄美结合到极致，那一定是陈其钢。在这部大提琴协奏曲中，他以古曲《梅花三弄》为隐秘线索，用世界级的交响语言极其高级地展现了东方人对时间流逝、生命脆弱的哲思。' },
  ],
};

// ---------- 英文翻译 ----------
const en = {
  music: [
    'The bedrock of Chinese music is the "blank space" rooted in philosophy and poetry. From the "great sound is rarefied" of the guqin strings to the ink-wash spirit of operatic singing, Chinese classical music never pursues the fullest physical sonority, but looks inward, seeking a state of mind that is at once expansive and subtle.',
    'In the twentieth century, this ancient soundscape met Western symphonic music in a profound collision. The founding of the Shanghai Public Band (forerunner of the Shanghai Symphony Orchestra) in 1879 marked the arrival of the Western classical system in China. Yet Chinese musicians never settled for being mere imitators of Western technique. For nearly a century, generations of composers and performers have pursued a difficult and fascinating quest: to carry the artistic conception of Chinese literati painting on the skeleton of Western instruments, and to translate the depth of Eastern philosophy through the grand textures of the symphony. From the early pioneers who sought the flavour of the flute and guqin on the piano, to today\'s masters who reshape the Book of Songs and Tang poetry through the symphony in the world\'s finest concert halls, the history of Chinese music is not only an epic of national awakening, but a century-long aesthetic dialogue between Eastern and Western civilisations.',
  ],
  musicians: [
    { name: 'Guan Pinghu', role: 'Qin master, the supreme realm of traditional Chinese literati music', desc: 'Signature work: Flowing Water. To understand the wellspring of Chinese music one must listen to the guqin. Guan Pinghu was the most important guqin master of twentieth-century China, with a technique at once archaic and vigorous, and a profound, expansive breath. In 1977, his performance of Flowing Water was engraved on the Voyager 1 Golden Record and sent into space, representing the echo of human civilisation across the cosmos. It is not merely music, but an acoustic expression of the ancient Chinese cosmology of "the unity of Heaven and humanity".' },
    { name: 'Huang Zi', role: 'Composer, founder of modern Chinese professional music education', desc: 'A pioneer who perfectly fused Western compositional technique with Chinese poetry. Signature work: The Song of Everlasting Sorrow. Amid the upheaval of the early twentieth century, Huang Zi wrote China\'s first large-scale orchestral cantata with the highest academic rigour, setting Bai Juyi\'s tragic love story of the great Tang dynasty to the strict harmony of the Austro-German Romantic tradition — an elegant monument in the history of Chinese symphonic music.' },
    { name: 'Ma Sicong', role: 'Violinist / Composer, pioneer of Chinese violin art', desc: 'Hailed as "China\'s first violinist". Signature work: Nostalgia. With a single Western violin, Ma Sicong drew out the most mellow Chinese homesickness, blending the desolate melody of an Inner Mongolian folk song with the soft tone of the classical violin. In the war-torn years, this piece became a spiritual anchor for countless overseas travellers and intellectuals.' },
    { name: 'Fou Ts\'ong', role: 'Pianist, a world-renowned titan of the piano', desc: 'Hailed by Time magazine as "the greatest living poet of the piano". Signature works: Chopin\'s Nocturnes and Mazurkas. Fou Ts\'ong\'s greatness lies in playing Western classics with the soul of a Chinese scholar-official. He infused the poetry of Li Bai, Du Fu and Li Qingzhao, and the "interplay of void and substance" of Chinese ink painting, flawlessly into Chopin\'s keys — one of the very few Eastern interpreters to win the wholehearted respect of the proud European classical world.' },
    { name: 'Chen Qigang', role: 'Composer, a contemporary master celebrated worldwide', desc: 'The last pupil of the great French modernist composer Olivier Messiaen. Signature work: Reflet d\'un temps disparu. If anyone could fuse the iridescent colours of French Impressionism with the plaintive beauty of traditional Chinese culture to perfection, it is Chen Qigang. In this cello concerto, he uses the ancient melody Three Variations on the Plum Blossom as a hidden thread, and through a world-class symphonic language expresses with supreme refinement the Eastern meditation on the passage of time and the fragility of life.' },
  ],
};

function writeJSON(path, data, pretty) {
  writeFileSync(path, (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n', 'utf8');
}

// 1. source.json（多行缩进）
const src = JSON.parse(readFileSync(join(DIR, 'source.json'), 'utf8'));
src.china.music = zh.music;
src.china.musicians = zh.musicians.map((m) => ({ name: m.name, role: m.role, desc: m.desc }));
writeJSON(join(DIR, 'source.json'), src, true);

// 2. zh-TW.json（单行 + opencc 简繁）
const cvt = OpenCC.Converter({ from: 'cn', to: 'tw' });
const T = (s) => (typeof s === 'string' ? cvt(s) : s);
const tw = JSON.parse(readFileSync(join(DIR, 'zh-TW.json'), 'utf8'));
tw.china.music = zh.music.map(T);
tw.china.musicians = zh.musicians.map((m) => ({ name: T(m.name), role: T(m.role), desc: T(m.desc) }));
writeJSON(join(DIR, 'zh-TW.json'), tw, false);

// 3. en.json（单行）
const enFile = JSON.parse(readFileSync(join(DIR, 'en.json'), 'utf8'));
enFile.china.music = en.music;
enFile.china.musicians = en.musicians;
writeJSON(join(DIR, 'en.json'), enFile, false);

console.log('已更新 source.json / zh-TW.json / en.json 的 china');
