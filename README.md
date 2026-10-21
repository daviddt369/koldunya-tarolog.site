# Изабелла — koldunya-tarolog.site

Одностраничный сайт: экстрасенс | маг | чернокнижник, личный приём — Шымкент. Статический HTML + CSS + нативный JS (ES-модули), без фреймворков.

## Команды

```bash
npm install            # зависимости только для инструментов (ffmpeg, sharp, esbuild, playwright-core)
npm run dev            # локальный сервер: http://localhost:8080 (с поддержкой Range для видео)
npm run media          # веб-копии материалов из Изабелла/ в media/ (FFmpeg + sharp)
npm run build          # production-сборка в dist/ (минификация JS/CSS + копия media и fonts)
npm run check          # проверка, что все ресурсы на месте
node tools/qa.mjs      # автотесты в Chrome (нужен запущенный сервер, URL аргументом)
```

Корень проекта можно публиковать как есть (GitHub Pages, `CNAME`), `dist/` — минифицированная копия.

## Структура

- `index.html`, `styles.css` — разметка и оформление; `js/` — модули: `media-hub` (единый звук), `modal`, `voice`, `orbs`, `flow` (3D-галерея), `carousel`, `cardday`, `fx` (пепел, свет, скример), `ui`.
- Скорость вращения 3D-карусели и ленты фотоотзывов: `FLOW_CONFIG.secondsPerTurn` в `js/flow.js` (или атрибут `data-seconds-per-turn` у `#flow`), `CAROUSEL_CONFIG.pxPerSecond` в `js/carousel.js`.
- `js/data.js` — контакты, обряды и их «направления», карты Таро.
- `media/` — оптимизированные материалы; `Изабелла/` — оригиналы заказчика (не коммитятся, не изменяются); `MEDIA-MAP.md` — карта «файл → назначение → секция».
- `fonts/` — Cormorant Garamond и Ruslan Display (OFL), подключены локально.
- `tools/` — инструменты сборки и проверки.

## Важно

- Обязательный текст заказчика размещён в блоке `.manifest` дословно; `tools/qa.mjs` сверяет его с исходным документом.
- Контакты: +7 705 523 5378 (телефон, WhatsApp `wa.me/77055235378`, Telegram `t.me/+77055235378` + кнопка копирования номера).
- Защитный скрипт `site-copytrap` из основы не подключён: он содержит чужие контакты и перенаправляет с локальных адресов.
