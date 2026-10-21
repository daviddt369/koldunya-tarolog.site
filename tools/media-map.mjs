// Собирает карту материалов ФАЙЛ → ТИП → НАЗНАЧЕНИЕ → СЕКЦИЯ из media/manifest-*.json в MEDIA-MAP.md
import fs from 'node:fs';

const rows = fs.readdirSync('media').filter((f) => /^manifest-.*\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(`media/${f}`, 'utf8')));
const order = ['Hero', 'Обо мне', 'Обряды', 'Видеоотзывы', 'Фотоотзывы', 'Карта дня', 'Контакты'];
rows.sort((a, b) => order.findIndex((o) => a.section.startsWith(o)) - order.findIndex((o) => b.section.startsWith(o)) || a.file.localeCompare(b.file, 'ru'));
let md = '# Карта материалов\n\nИсходники лежат в `Изабелла/` и не изменяются. Веб-копии создаёт `npm run media` (FFmpeg + sharp) в `media/`.\n\n| Файл заказчика | Тип | Назначение | Секция сайта | Результат |\n| --- | --- | --- | --- | --- |\n';
for (const r of rows) md += `| ${r.file} | ${r.type} | ${r.purpose} | ${r.section} | \`${r.out}\` |\n`;
fs.writeFileSync('MEDIA-MAP.md', md + '\n`Обязательно расписать в сайте.txt` — весь текст перенесён на сайт (блок «Услуги», «Обо мне», «Контакты», подвал).\n');
console.log(rows.length, 'строк в MEDIA-MAP.md');
