// Однократно: скачивает шрифты Google Fonts (OFL) в fonts/ и пишет fonts/fonts.css. node tools/fetch-fonts.mjs
import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const families = [
  'family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500',
  'family=Ruslan+Display',
];
const css = await (await fetch(`https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`, { headers: { 'User-Agent': UA } })).text();
let out = '/* Cormorant Garamond и Ruslan Display — SIL Open Font License. Подмножества: cyrillic, latin. */\n';
for (const block of css.split('/*').slice(1)) {
  const subset = block.slice(0, block.indexOf('*/')).trim();
  if (!['cyrillic', 'latin'].includes(subset)) continue;
  const body = block.slice(block.indexOf('*/') + 2).trim();
  const fam = /font-family: '([^']+)'/.exec(body)[1];
  const style = /font-style: (\w+)/.exec(body)[1];
  const weight = /font-weight: (\d+)/.exec(body)[1];
  const url = /url\((https:[^)]+\.woff2)\)/.exec(body)[1];
  const range = /unicode-range: ([^;]+);/.exec(body)[1];
  const file = `${fam.replace(/\s+/g, '-').toLowerCase()}-${style}-${weight}-${subset}.woff2`;
  fs.writeFileSync(`fonts/${file}`, Buffer.from(await (await fetch(url)).arrayBuffer()));
  out += `@font-face { font-family: '${fam}'; font-style: ${style}; font-weight: ${weight}; font-display: swap; src: url('./${file}') format('woff2'); unicode-range: ${range}; }\n`;
  console.log(file);
}
fs.writeFileSync('fonts/fonts.css', out);
