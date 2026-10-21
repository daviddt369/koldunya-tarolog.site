// Проверка ссылок на файлы: все локальные ресурсы из HTML/CSS и из данных сайта должны существовать.
// node tools/check.mjs [папка]   (по умолчанию корень проекта; для сборки — dist)
import fs from 'node:fs';
import path from 'node:path';
import { RITUALS, VIDEO_REVIEWS, PHOTO_REVIEWS } from '../js/data.js';

const root = path.resolve(process.argv[2] || '.');
const missing = [];
const refs = new Set();
const add = (r) => refs.add(r.replace(/^\.\//, '').split(/[?#]/)[0]);

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:src|href|srcset)="(\.\/[^"]+|\/[^"/][^"]*)"/g)) add(m[1].replace(/^\//, ''));
const cssFile = path.join(root, 'styles.css');
for (const m of fs.readFileSync(cssFile, 'utf8').matchAll(/url\(['"]?(\.\/[^'")]+)['"]?\)/g)) add(m[1]);

for (const r of RITUALS) for (const s of ['.mp4', '.webp', '-orb.mp4', '-orb.webp']) add(`media/rituals/${r.slug}${s}`);
for (let i = 1; i <= VIDEO_REVIEWS; i += 1) for (const s of ['.mp4', '.webp']) add(`media/reviews/video/v${String(i).padStart(2, '0')}${s}`);
for (let i = 1; i <= PHOTO_REVIEWS; i += 1) for (const s of ['.webp', '-s.webp']) add(`media/reviews/photo/r${String(i).padStart(2, '0')}${s}`);
for (const f of ['photo/index.json', 'video/index.json']) add(`media/reviews/${f}`);
for (const f of ['special/card-day.mp4', 'special/card-day.webp', 'special/greeting.mp4', 'special/greeting-poster.webp', 'audio/about-voice.m4a', 'audio/about-voice.mp3']) add(`media/${f}`);

for (const r of refs) if (r && !r.startsWith('http') && !fs.existsSync(path.join(root, r))) missing.push(r);
console.log(`проверено ссылок: ${refs.size}`);
if (missing.length) {
  console.log('НЕ НАЙДЕНО:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('все ресурсы на месте');
