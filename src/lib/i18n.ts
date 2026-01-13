export type Lang = "ru" | "en";

export type I18nKey =
  | "nav.home"
  | "nav.participants"
  | "nav.program"
  | "home.title"
  | "home.qr"
  | "home.scan"
  | "home.meetings"
  | "home.chat"
  | "home.participants"
  | "home.programSpeakers"
  | "participants.title"
  | "participants.subtitle"
  | "participants.searchPlaceholder"
  | "participants.empty"
  | "program.title"
  | "program.tab.program"
  | "program.tab.speakers"
  | "program.empty"
  | "speakers.empty"
  | "chat.title"
  | "chat.needProfile"
  | "chat.fillProfile"
  | "chat.open"
  | "chat.notConfigured"
  | "form.title"
  | "form.requiredHint"
  | "form.save"
  | "form.saving"
  | "form.photo"
  | "form.photoHint"
  | "form.photoUploading"
  | "form.firstName"
  | "form.lastName"
  | "form.instagram"
  | "form.niche"
  | "form.about"
  | "form.helpful"
  | "form.placeholder.firstName"
  | "form.placeholder.lastName"
  | "form.placeholder.instagram"
  | "form.placeholder.niche"
  | "form.placeholder.about"
  | "form.placeholder.helpful"
  | "gate.telegram.title"
  | "gate.telegram.body"
  | "gate.dev.title"
  | "gate.dev.body"
  | "gate.dev.hint"
  | "gate.loading";

const dict: Record<Lang, Record<I18nKey, string>> = {
  ru: {
    "nav.home": "Главная",
    "nav.participants": "Участники",
    "nav.program": "Программа",

    "home.title": "Привет, {name}",
    "home.qr": "Мой QR",
    "home.scan": "Сканировать",
    "home.meetings": "Мои знакомства ({n})",
    "home.chat": "Чат",
    "home.participants": "Участники",
    "home.programSpeakers": "Программа / Спикеры",

    "participants.title": "Участники",
    "participants.subtitle": "Нажмите на карточку, чтобы раскрыть подробности.",
    "participants.searchPlaceholder": "Поиск по имени / нише / Instagram…",
    "participants.empty": "Пока нет участников с заполненным профилем.",

    "program.title": "Программа",
    "program.tab.program": "Программа",
    "program.tab.speakers": "Спикеры",
    "program.empty": "Программа появится здесь позже.",
    "speakers.empty": "Спикеры появятся здесь позже.",

    "chat.title": "Чат",
    "chat.needProfile": "Заполните профиль, чтобы получить доступ к чату.",
    "chat.fillProfile": "Заполнить профиль",
    "chat.open": "Открыть чат",
    "chat.notConfigured": "Ссылка на чат пока не настроена.",

    "form.title": "Регистрация",
    "form.requiredHint": "Обязательные поля отмечены *",
    "form.save": "Сохранить",
    "form.saving": "Сохранение…",
    "form.photo": "Фото",
    "form.photoHint": "PNG/JPG/WebP до 5MB",
    "form.photoUploading": "Загрузка фото…",
    "form.firstName": "Имя",
    "form.lastName": "Фамилия",
    "form.instagram": "Instagram",
    "form.niche": "Ниша",
    "form.about": "Коротко о себе",
    "form.helpful": "Чем могу быть полезен",
    "form.placeholder.firstName": "Например: Аня",
    "form.placeholder.lastName": "Например: Попова",
    "form.placeholder.instagram": "@username или ссылка",
    "form.placeholder.niche": "Коротко (до 80 символов)",
    "form.placeholder.about": "Кто вы и чем занимаетесь? (до 300 символов)",
    "form.placeholder.helpful": "Например: знакомства, интро, экспертиза… (до 300 символов)",

    "gate.telegram.title": "Откройте через Telegram",
    "gate.telegram.body":
      "Mini App работает внутри Telegram. Откройте приложение из бота через кнопку WebApp.",
    "gate.dev.title": "Dev режим (браузер)",
    "gate.dev.body": "Введите Telegram ID, чтобы включить mock‑авторизацию.",
    "gate.dev.hint": "Нужен DEV_ALLOW_MOCK_AUTH=1 на backend.",
    "gate.loading": "Загрузка…",
  },
  en: {
    "nav.home": "Home",
    "nav.participants": "Participants",
    "nav.program": "Program",

    "home.title": "Hi, {name}",
    "home.qr": "My QR",
    "home.scan": "Scan",
    "home.meetings": "My connections ({n})",
    "home.chat": "Chat",
    "home.participants": "Participants",
    "home.programSpeakers": "Program / Speakers",

    "participants.title": "Participants",
    "participants.subtitle": "Tap a card to expand details.",
    "participants.searchPlaceholder": "Search by name / niche / Instagram…",
    "participants.empty": "No participants with a filled profile yet.",

    "program.title": "Program",
    "program.tab.program": "Program",
    "program.tab.speakers": "Speakers",
    "program.empty": "The schedule will appear here later.",
    "speakers.empty": "Speakers will appear here later.",

    "chat.title": "Chat",
    "chat.needProfile": "Fill your profile to access the chat.",
    "chat.fillProfile": "Fill profile",
    "chat.open": "Open chat",
    "chat.notConfigured": "Chat link is not configured yet.",

    "form.title": "Registration",
    "form.requiredHint": "Required fields are marked with *",
    "form.save": "Save",
    "form.saving": "Saving…",
    "form.photo": "Photo",
    "form.photoHint": "PNG/JPG/WebP up to 5MB",
    "form.photoUploading": "Uploading photo…",
    "form.firstName": "First name",
    "form.lastName": "Last name",
    "form.instagram": "Instagram",
    "form.niche": "Niche",
    "form.about": "About",
    "form.helpful": "How I can help",
    "form.placeholder.firstName": "e.g. Anna",
    "form.placeholder.lastName": "e.g. Popova",
    "form.placeholder.instagram": "@username or link",
    "form.placeholder.niche": "Short (up to 80 chars)",
    "form.placeholder.about": "Who are you and what do you do? (up to 300 chars)",
    "form.placeholder.helpful": "e.g. intros, expertise, partnerships… (up to 300 chars)",

    "gate.telegram.title": "Open in Telegram",
    "gate.telegram.body": "This Mini App works inside Telegram. Open it from the bot using the WebApp button.",
    "gate.dev.title": "Dev mode (browser)",
    "gate.dev.body": "Enter a Telegram ID to enable mock auth.",
    "gate.dev.hint": "Requires DEV_ALLOW_MOCK_AUTH=1 on the backend.",
    "gate.loading": "Loading…",
  },
};

export function translate(lang: Lang, key: I18nKey, vars?: Record<string, string | number>) {
  const base = dict[lang][key] ?? dict.ru[key] ?? String(key);
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

