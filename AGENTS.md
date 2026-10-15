<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## FRAME — заметки для разработки

- Документация проекта: `README.md`. Все тексты интерфейса — в `src/i18n/dictionaries/ru.ts`.
- Схема БД и права доступа — `supabase/migrations/`. Любая новая таблица должна получить RLS и явные GRANT (см. `20261015000004_rls.sql`); колонки владельца заполняются `auth.uid()` по умолчанию и не входят в разрешённые для вставки.
- Мутации — server actions в `src/actions/` с валидацией Zod; роль администратора проверяется и на сервере, и в функциях БД `admin_*`.
- Проверки: `npm run typecheck`, `npm run lint`, `npm run test:e2e` (нужен локальный Supabase, см. README).
