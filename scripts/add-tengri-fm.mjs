// 一次性：哈萨克斯坦新增 Tengri FM（http-only 流，经 /api/stream 边缘代理播放）
// 1) asia.ts 已在 notableRadios 末尾追加 Tengri FM（本脚本只同步 i18n）
// 2) 为 source.json（zh-CN）+ 7 语言文件的 kazakhstan.radios 追加 Tengri FM 译文条目
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const I18N_DIR = join(ROOT, 'src', 'data', 'i18n');

const writeJSON = (p, data, pretty) =>
  writeFileSync(p, (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n', 'utf8');

// Tengri FM 的 8 语言 entry（name 为专有名词，各语言保持一致）
const ENTRY = {
  'zh-CN': { name: 'Tengri FM', genre: '流行 / 经典金曲', note: '哈萨克斯坦的流行音乐电台，主打当代热单与经典金曲。' },
  'zh-TW': { name: 'Tengri FM', genre: '流行 / 經典金曲', note: '哈薩克斯坦的流行音樂電臺，主打當代熱單與經典金曲。' },
  en: { name: 'Tengri FM', genre: 'Pop / Classic hits', note: 'A Kazakh pop music station playing contemporary hits and classic favourites.' },
  cy: { name: 'Tengri FM', genre: 'Pop / Hits clasurol', note: 'Gorsaf gerddoriaeth bop o Kazakhstan yn chwarae hits cyfoes a chlasuron.' },
  fr: { name: 'Tengri FM', genre: 'Pop / Hits classiques', note: 'Une station de pop kazakhe diffusant des tubes contemporains et des classiques.' },
  de: { name: 'Tengri FM', genre: 'Pop / Klassische Hits', note: 'Ein kasachischer Pop-Sender mit aktuellen Hits und klassischen Favoriten.' },
  it: { name: 'Tengri FM', genre: 'Pop / Hit classici', note: 'Una stazione pop kazaka con hit contemporanei e classici.' },
  es: { name: 'Tengri FM', genre: 'Pop / Éxitos clásicos', note: 'Una emisora de pop kazajo con éxitos contemporáneos y clásicos.' },
};

// source.json（多行、zh-CN 原文）
{
  const src = JSON.parse(readFileSync(join(I18N_DIR, 'source.json'), 'utf8'));
  const radios = src.kazakhstan.radios;
  if (radios.some((r) => r.name === 'Tengri FM')) throw new Error('source.json 已存在 Tengri FM');
  radios.push(ENTRY['zh-CN']);
  writeJSON(join(I18N_DIR, 'source.json'), src, true);
  console.log('source.json: 已追加 Tengri FM');
}

// 7 语言（单行）
for (const lang of ['en', 'cy', 'fr', 'de', 'it', 'es', 'zh-TW']) {
  const file = join(I18N_DIR, `${lang}.json`);
  const d = JSON.parse(readFileSync(file, 'utf8'));
  const radios = d.kazakhstan.radios;
  if (radios.some((r) => r.name === 'Tengri FM')) throw new Error(`${lang}.json 已存在 Tengri FM`);
  radios.push(ENTRY[lang]);
  writeJSON(file, d, false);
  console.log(`${lang}.json: 已追加 Tengri FM`);
}

console.log('完成。');
