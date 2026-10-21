# CLAUDE.md

Общие правила проекта для всех агентов находятся в AGENTS.md и подключаются сюда целиком:

@AGENTS.md

## Дополнительно для Claude Code

- Навыки проекта лежат в `.claude/skills/` и вызываются как `/design-taste-frontend`,
  `/impeccable <команда>`, `/animate`. Распределение зон и правила конфликтов — в разделе 3 AGENTS.md.
- Хуки Impeccable подключены в `.claude/settings.local.json` (проверка UI после правок и глубокий
  проход в конце хода). Они работают только внутри этого проекта.
- Субагенты Impeccable лежат в `.claude/agents/` и вызываются самим навыком; вручную их не запускай.
- В Windows-оболочке без `sh` запускай движок Impeccable через
  `.claude/skills/impeccable/scripts/impeccable.cmd`.
- Для проверки в браузере используй встроенный браузер или Playwright, Lighthouse — через
  `npx lighthouse` без глобальной установки.
