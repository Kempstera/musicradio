import type { Country } from '../../lib/country';

export const oceania: Country[] = [
  {
    slug: 'australia',
    name: '澳大利亚',
    nameEn: 'Australia',
    nameLocal: 'Australia',
    region: 'oceania',
    flag: '🇦🇺',
    capital: '堪培拉',
    languages: ['英语'],
    iso: 'AU',
    intro: '迪吉里杜管的古老嗡鸣与琼·萨瑟兰的歌剧奇迹。',
    history: [
      '澳大利亚是地球上最古老的大陆之一，原住民文化延续了至少六万年，迪吉里杜管（didgeridoo）的嗡鸣是这片土地最古老的声音。18 世纪英国殖民后，它发展成多元的移民国家。',
      '悉尼歌剧院的风帆造型是 20 世纪最伟大的建筑之一，也让澳大利亚成为南半球古典音乐的重要中心。',
    ],
    music: [
      '古典方面，澳大利亚贡献了 20 世纪最伟大的花腔女高音之一琼·萨瑟兰，以及作曲家珀西·格兰杰；悉尼交响乐团与墨尔本交响乐团是南半球乐坛的支柱，而 ABC Classic 电台则让古典音乐深入千家万户。',
      '流行领域，AC/DC、INXS、凯莉·米洛等名字让澳大利亚成为摇滚与流行的重要源头。',
    ],
    musicians: [
      { name: '琼·萨瑟兰', nameEn: 'Dame Joan Sutherland', role: '女高音', desc: '「世纪之声」，20 世纪最伟大的花腔女高音之一，被誉为「La Stupenda」。' },
      { name: '珀西·格兰杰', nameEn: 'Percy Grainger', role: '作曲家 / 钢琴家', desc: '以《乡村花园》等作品闻名的澳大利亚作曲家，热衷搜集民间音乐。' },
      { name: 'AC/DC', nameEn: 'AC/DC', role: '摇滚乐队', desc: '澳大利亚最成功的摇滚乐队，《Back in Black》是史上销量最高的专辑之一。' },
    ],
    notableRadios: [
      { name: 'ABC Classic', genre: '古典', note: '澳大利亚广播公司的古典频道，南半球最重要的古典电台。' },
      { name: 'Double J', genre: '独立 / 多元', note: '澳大利亚广播的音乐频道，聚焦独立音乐。' },
    ],
  },
  {
    slug: 'new-zealand',
    name: '新西兰',
    nameEn: 'New Zealand',
    nameLocal: 'Aotearoa',
    region: 'oceania',
    flag: '🇳🇿',
    capital: '惠灵顿',
    languages: ['英语', '毛利语'],
    iso: 'NZ',
    intro: '毛利战舞与基里·特·卡纳瓦的故乡，南半球的纯净之声。',
    history: [
      '新西兰（毛利语 Aotearoa，意为「长白云之乡」）由南北两岛组成，以壮丽的峡湾、火山与毛利文化闻名。毛利人的「哈卡」（haka）战舞已成为这个国家的文化符号。',
      '《指环王》系列在此取景，让世界看到了它宛如中土的奇幻山水。',
    ],
    music: [
      '新西兰的毛利音乐以哈卡、波伊（poi）歌舞与鼻笛（koauau）为特色，充满力量与仪式感。古典方面，女高音基里·特·卡纳瓦是世界歌剧舞台的传奇，新西兰交响乐团则让这个岛国拥有了南半球一流的古典力量。',
      '流行领域，洛德（Lorde）以《Royals》成为当代最耀眼的新西兰声音。',
    ],
    musicians: [
      { name: '基里·特·卡纳瓦', nameEn: 'Dame Kiri Te Kanawa', role: '女高音', desc: '毛利裔的世界级女高音，其莫扎特与施特劳斯作品诠释享誉全球。' },
      { name: '洛德', nameEn: 'Lorde', role: '歌手', desc: '新西兰新生代唱作人代表，《Royals》获得格莱美奖。' },
    ],
    notableRadios: [
      { name: 'RNZ Concert', genre: '古典', note: '新西兰广播的古典频道。' },
      { name: 'RNZ National', genre: '综合 / 文化', note: '新西兰广播的全国频道，兼播毛利音乐。' },
    ],
  },
];
