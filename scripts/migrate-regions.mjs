// 迁移脚本：把现有数据文件里的 region 字段替换为 continent + subregion
// 非洲 isGroup 大区暂不处理（后续手写拆国）
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGIONS_DIR = join(__dirname, '..', 'src', 'data', 'regions');

// ISO -> [continent, subregion]
const MAP = {
  // 欧洲
  AL: ['europe', 'southern-europe'], AD: ['europe', 'southern-europe'],
  AT: ['europe', 'central-europe'], BY: ['europe', 'eastern-europe'],
  BE: ['europe', 'western-europe'], BA: ['europe', 'southern-europe'],
  BG: ['europe', 'eastern-europe'], HR: ['europe', 'southern-europe'],
  CY: ['asia', 'west-asia'], CZ: ['europe', 'central-europe'],
  DK: ['europe', 'northern-europe'], EE: ['europe', 'northern-europe'],
  FI: ['europe', 'northern-europe'], FR: ['europe', 'western-europe'],
  DE: ['europe', 'central-europe'], GR: ['europe', 'southern-europe'],
  HU: ['europe', 'central-europe'], IS: ['europe', 'northern-europe'],
  IE: ['europe', 'western-europe'], IT: ['europe', 'southern-europe'],
  LV: ['europe', 'northern-europe'], LT: ['europe', 'northern-europe'],
  LI: ['europe', 'central-europe'], LU: ['europe', 'western-europe'],
  MT: ['europe', 'southern-europe'], MD: ['europe', 'eastern-europe'],
  MC: ['europe', 'western-europe'], ME: ['europe', 'southern-europe'],
  NL: ['europe', 'western-europe'], MK: ['europe', 'southern-europe'],
  NO: ['europe', 'northern-europe'], PL: ['europe', 'central-europe'],
  PT: ['europe', 'southern-europe'], RO: ['europe', 'eastern-europe'],
  RU: ['europe', 'eastern-europe'], SM: ['europe', 'southern-europe'],
  RS: ['europe', 'southern-europe'], SK: ['europe', 'central-europe'],
  SI: ['europe', 'southern-europe'], ES: ['europe', 'southern-europe'],
  SE: ['europe', 'northern-europe'], CH: ['europe', 'central-europe'],
  UA: ['europe', 'eastern-europe'], GB: ['europe', 'western-europe'],
  GE: ['asia', 'west-asia'], AM: ['asia', 'west-asia'], AZ: ['asia', 'west-asia'],
  // 北美
  US: ['north-america', 'northern-america'], CA: ['north-america', 'northern-america'],
  MX: ['north-america', 'central-america'],
  // 南美
  AR: ['south-america', 'south-america'], BR: ['south-america', 'south-america'],
  CL: ['south-america', 'south-america'], CO: ['south-america', 'south-america'],
  PE: ['south-america', 'south-america'], VE: ['south-america', 'south-america'],
  UY: ['south-america', 'south-america'], EC: ['south-america', 'south-america'],
  BO: ['south-america', 'south-america'], PY: ['south-america', 'south-america'],
  // 大洋洲
  AU: ['oceania', 'australasia'], NZ: ['oceania', 'australasia'],
  // 东亚
  CN: ['asia', 'east-asia'], JP: ['asia', 'east-asia'], KR: ['asia', 'east-asia'],
  // 西亚 / 南亚
  TR: ['asia', 'west-asia'], IR: ['asia', 'west-asia'], IN: ['asia', 'south-asia'],
  // 东南亚
  TH: ['asia', 'southeast-asia'], VN: ['asia', 'southeast-asia'], ID: ['asia', 'southeast-asia'],
  MY: ['asia', 'southeast-asia'], PH: ['asia', 'southeast-asia'], SG: ['asia', 'southeast-asia'],
  MM: ['asia', 'southeast-asia'], KH: ['asia', 'southeast-asia'], LA: ['asia', 'southeast-asia'],
  BN: ['asia', 'southeast-asia'], TL: ['asia', 'southeast-asia'],
};

const FILES = ['europe1.ts', 'europe2.ts', 'asia.ts', 'americas.ts', 'oceania.ts'];

let total = 0;
for (const f of FILES) {
  const p = join(REGIONS_DIR, f);
  let src = readFileSync(p, 'utf8');

  // 按条目切分（以 "  {" 开头），逐个处理
  const blocks = src.split(/\n  \{\n/);
  const head = blocks.shift(); // 文件头（import 等）
  const outBlocks = [head];

  for (const block of blocks) {
    const isoMatch = block.match(/iso: '([A-Za-z-]+)'/);
    const regionMatch = block.match(/region: '[a-z-]+'/);
    if (!isoMatch || !regionMatch) {
      outBlocks.push(block);
      continue;
    }
    const iso = isoMatch[1];
    const m = MAP[iso];
    if (!m) {
      outBlocks.push(block); // 非洲大区等，跳过
      continue;
    }
    const [continent, subregion] = m;
    const newLine = `continent: '${continent}',\n    subregion: '${subregion}'`;
    const newBlock = block.replace(/region: '[a-z-]+'/, newLine);
    outBlocks.push(newBlock);
    total++;
  }

  writeFileSync(p, outBlocks.join('\n  {\n'));
  console.log(`${f}: 迁移完成`);
}
console.log(`\n共迁移 ${total} 个国家条目的 region → continent+subregion`);
