// 修正口径：可播放 = notable(有url) + radios.json 自动采集（除非 radioMode==='notable-only'）
import { build } from 'esbuild';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const radiosData = require('../src/data/radios.json');

const dir = mkdtempSync(join(tmpdir(), 'count-radios-'));
const outfile = join(dir, 'bundle.mjs');

await build({
  entryPoints: ['src/data/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'silent',
});

const { allCountries } = await import(outfile);

const rows = allCountries.map((c) => {
  const notable = c.notableRadios || [];
  const notablePlayable = notable.filter((r) => r.url).length;
  const fetched = radiosData[c.iso] || [];
  const isNotableOnly = c.radioMode === 'notable-only';
  const fetchedCount = isNotableOnly ? 0 : fetched.length;
  const playable = notablePlayable + fetchedCount;
  return {
    iso: c.iso,
    slug: c.slug,
    name: c.name,
    continent: c.continent,
    subregion: c.subregion,
    notablePlayable,
    fetchedCount,
    playable,
    notesOnly: notable.filter((r) => !r.url).length,
    radioNote: c.radioNote ? 1 : 0,
    notableOnly: isNotableOnly ? 1 : 0,
  };
});

const low = rows.filter((r) => r.playable <= 2).sort((a, b) => a.playable - b.playable || a.iso.localeCompare(b.iso));

console.log('=== 可播放电台数 ≤ 2 的国家（共 ' + low.length + ' 个）===');
console.log('ISO\t可播\t精选\t采集\tnote\t仅简介\t洲\t\t名称');
for (const r of low) {
  console.log(
    `${r.iso}\t${r.playable}\t${r.notablePlayable}\t${r.fetchedCount}\t${r.radioNote}\t${r.notesOnly}\t${r.continent.padEnd(12)}\t${r.name}`
  );
}

console.log('\n=== 汇总 ===');
console.log('国家总数:', rows.length);
console.log('0 台可播放:', rows.filter((r) => r.playable === 0).length);
console.log('1 台可播放:', rows.filter((r) => r.playable === 1).length);
console.log('2 台可播放:', rows.filter((r) => r.playable === 2).length);
console.log('3+ 台可播放:', rows.filter((r) => r.playable >= 3).length);
