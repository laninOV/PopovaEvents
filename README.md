Telegram Mini App для оффлайн‑мероприятий: анкета участника → персональный QR → скан QR → “мои встречи” → заметки/оценки.

## Запуск локально

1) Установить зависимости:

```bash
npm install
```

2) Создать `.env` (можно скопировать из `.env.example`):

```bash
cp .env.example .env
```

3) По умолчанию используется локальная SQLite (`DB_PROVIDER=sqlite`, файл `LOCAL_DB_PATH`).
Если нужен Postgres, укажите `DB_PROVIDER=postgres` и `POSTGRES_URL`
(например, можно поднять `docker compose up -d postgres`).

4) Запустить dev‑сервер:

```bash
npm run dev
```

Открыть `http://localhost:3000`.

## Telegram и авторизация

- Внутри Telegram WebApp запросы подписываются `initData`. Backend валидирует `initData` с помощью `TELEGRAM_BOT_TOKEN`.
- Локально (в браузере) можно запускать без Telegram: `DEV_ALLOW_MOCK_AUTH=1`, а id пользователя берётся из `DEV_TELEGRAM_ID` или заголовка `x-dev-telegram-id`.

Чтобы проверить в Telegram:
- Создать бота через `@BotFather`, получить токен и прописать его в `TELEGRAM_BOT_TOKEN`.
- Подключить Mini App URL к боту (WebApp) и открыть приложение из Telegram.

## Бот (локально)

Минимальный лаунчер бота лежит в `bot/bot.ts`.

```bash
npm run bot
```

Переменные: `TELEGRAM_BOT_TOKEN`, `WEBAPP_URL` (для Telegram должен быть `https://...`), `DEFAULT_EVENT_SLUG`, опционально `WELCOME_TEXT`, `CONTACT_TEXT`.

## Хранилище

- SQLite (локально): по умолчанию `DB_PROVIDER=sqlite`, файл БД задаётся `LOCAL_DB_PATH` (или `SQLITE_PATH`), иначе `data/dev.sqlite`.
- Postgres (опционально): `DB_PROVIDER=postgres`, строка подключения берётся из `POSTGRES_URL` (для Vercel Postgres задаётся автоматически).
- Фото сохраняются в Vercel Blob (`BLOB_READ_WRITE_TOKEN`).

### Multi-DB (1 ивент = 1 БД)

- Включение: `MULTI_DB_ROUTING=1`.
- Control plane БД: `CONTROL_POSTGRES_URL` (если не задана, берётся `POSTGRES_URL`/`DATABASE_URL`).
- Для tenant-ивентов приложение использует отдельные pooled connection strings (по `eventSlug`), которые настраиваются через админку `/admin/events`.
- Если tenant-конфиг не задан для ивента в tenant-режиме, API вернёт `event_not_configured`.

## SQL-запросы к локальной БД

- Выполнить произвольный SQL:

```bash
npm run db:query -- "SELECT * FROM users LIMIT 10"
```

- Пример выборки профилей:

```bash
npm run db:query -- "SELECT u.telegram_id, p.first_name, p.instagram, p.updated_at FROM users u LEFT JOIN profiles p ON p.user_id = u.id ORDER BY p.updated_at DESC LIMIT 20"
```

## Ивенты

- Текущий ивент выбирается в `eventSlug` (localStorage) и отправляется на backend заголовком `x-event-slug`.
- Можно передать `?event=<slug>` в URL — он сохранится в localStorage автоматически.
- По умолчанию используется `DEFAULT_EVENT_SLUG`.
- Для авто‑создания неизвестных ивентов включите `ALLOW_PUBLIC_EVENT_CREATE=1` (иначе будет `event_not_found`).
- Для демо-наполнения программы и спикеров включите `SEED_DEMO=1` (заполняется один раз, если программа пустая).

## Меню

- `📝 Регистрация`: анкета участника + загрузка фото.
- `👥 Участники`: каталог участников с раскрытием карточки.
- `🎤 Спикеры`: список спикеров (заполняется через админку).
- `🗓️ Программа`: расписание (заполняется через админку).
- `💬 Чат`: ссылка на чат (выдаётся только зарегистрированным; ссылка задаётся в админке).
- `🤝 Знакомства`: список отсканированных контактов.
- `👤 Я`: профиль + кнопка QR.

## QR формат

QR выдаётся с backend через `GET /api/qr` и содержит строку `pe:<eventSlug>:<publicId>:<ts>:<sig>` (HMAC SHA-256, ключ `QR_SECRET`).
Для совместимости можно включить `ALLOW_UNSIGNED_QR=1` (тогда разрешается старый формат `pe:<eventSlug>:<publicId>` / `pe:<publicId>`).

## Админка

- Включите доступ: `ADMIN_TELEGRAM_IDS="123,456"` (Telegram user id через запятую).
- Откройте `/admin` внутри Mini App: настройки чата, спикеры, программа, ивенты/БД.
