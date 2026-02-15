export type Lang = "ru" | "en";

export type I18nKey =
  | "nav.home"
  | "nav.profile"
  | "nav.scan"
  | "nav.participants"
  | "nav.program"
  | "settings.title"
  | "settings.close"
  | "settings.theme"
  | "settings.theme.dark"
  | "settings.theme.light"
  | "settings.value.dark"
  | "settings.value.light"
  | "settings.language"
  | "settings.lang.ru"
  | "settings.lang.en"
  | "home.title"
  | "home.qr"
  | "home.scan"
  | "home.meetings"
  | "home.meetingsAll"
  | "home.meetingsEmpty"
  | "home.chat"
  | "home.editProfile"
  | "home.fillProfile"
  | "home.myProfile"
  | "home.profileEmpty"
  | "home.instagramMissing"
  | "home.open"
  | "home.participants"
  | "home.programSpeakers"
  | "home.profile.cardTitle"
  | "home.profile.openProfile"
  | "profile.title"
  | "profile.edit"
  | "profile.qr"
  | "profile.empty.title"
  | "profile.empty.body"
  | "profile.empty.cta"
  | "profile.section.about"
  | "profile.section.helpful"
  | "profile.section.instagram"
  | "profile.section.showMore"
  | "profile.section.showLess"
  | "profile.notSet"
  | "profile.loading"
  | "profile.error"
  | "participants.title"
  | "participants.searchPlaceholder"
  | "participants.empty"
  | "program.title"
  | "program.tab.program"
  | "program.tab.speakers"
  | "program.badge.now"
  | "program.badge.next"
  | "program.badge.closest"
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
  | "form.wizard.progress"
  | "form.wizard.stepsAria"
  | "form.wizard.actionsAria"
  | "form.wizard.step.basic"
  | "form.wizard.step.contacts"
  | "form.wizard.step.about"
  | "form.step.basic.title"
  | "form.step.basic.subtitle"
  | "form.step.contacts.title"
  | "form.step.contacts.subtitle"
  | "form.step.about.title"
  | "form.step.about.subtitle"
  | "form.review.title"
  | "form.review.name"
  | "form.review.instagram"
  | "form.review.niche"
  | "form.review.about"
  | "form.review.helpful"
  | "form.review.notSet"
  | "form.action.next"
  | "form.action.back"
  | "form.action.home"
  | "form.success.title"
  | "form.success.body"
  | "form.success.redirecting"
  | "form.photoPreviewAlt"
  | "form.error.load"
  | "form.error.required"
  | "form.error.save"
  | "form.error.uploadGeneric"
  | "form.error.uploadMissingBlobToken"
  | "form.error.uploadFailed"
  | "form.error.fileTooLarge"
  | "form.error.unsupportedType"
  | "gate.telegram.title"
  | "gate.telegram.body"
  | "gate.dev.title"
  | "gate.dev.body"
  | "gate.dev.hint"
  | "gate.loading";

const dict: Record<Lang, Record<I18nKey, string>> = {
  ru: {
    "nav.home": "Главная",
    "nav.profile": "Профиль",
    "nav.scan": "Сканировать",
    "nav.participants": "Участники",
    "nav.program": "Программа",
    "settings.title": "Настройки",
    "settings.close": "Закрыть",
    "settings.theme": "Тема",
    "settings.theme.dark": "Тёмная тема",
    "settings.theme.light": "Светлая тема",
    "settings.value.dark": "Тёмная",
    "settings.value.light": "Светлая",
    "settings.language": "Язык",
    "settings.lang.ru": "Русский",
    "settings.lang.en": "English",

    "home.title": "Привет, {name}",
    "home.qr": "Мой QR",
    "home.scan": "Сканировать",
    "home.meetings": "Мои знакомства ({n})",
    "home.meetingsAll": "Все",
    "home.meetingsEmpty": "Пока нет знакомств. Отсканируйте QR другого участника.",
    "home.chat": "Чат",
    "home.editProfile": "Редактировать",
    "home.fillProfile": "Заполнить профиль",
    "home.myProfile": "Мой профиль",
    "home.profileEmpty": "Профиль не заполнен.",
    "home.instagramMissing": "Instagram не указан",
    "home.open": "Открыть",
    "home.participants": "Участники",
    "home.programSpeakers": "Программа / Спикеры",
    "home.profile.cardTitle": "Мой профиль",
    "home.profile.openProfile": "Открыть профиль",

    "profile.title": "Профиль",
    "profile.edit": "Редактировать",
    "profile.qr": "Мой QR",
    "profile.empty.title": "Профиль пока не заполнен",
    "profile.empty.body": "Добавьте данные о себе, чтобы участники могли легко с вами познакомиться.",
    "profile.empty.cta": "Заполнить профиль",
    "profile.section.about": "Коротко о себе",
    "profile.section.helpful": "Чем могу быть полезен",
    "profile.section.instagram": "Instagram",
    "profile.section.showMore": "Показать полностью",
    "profile.section.showLess": "Свернуть",
    "profile.notSet": "Не указано",
    "profile.loading": "Загрузка профиля…",
    "profile.error": "Не удалось загрузить профиль.",

    "participants.title": "Участники",
    "participants.searchPlaceholder": "Введите имя",
    "participants.empty": "Пока нет участников с заполненным профилем.",

    "program.title": "Программа",
    "program.tab.program": "Программа",
    "program.tab.speakers": "Спикеры",
    "program.badge.now": "Сейчас",
    "program.badge.next": "Далее",
    "program.badge.closest": "Ближайшее",
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
    "form.wizard.progress": "Шаг {current} из {total}",
    "form.wizard.stepsAria": "Шаги регистрации",
    "form.wizard.actionsAria": "Действия формы регистрации",
    "form.wizard.step.basic": "Основное",
    "form.wizard.step.contacts": "Контакты",
    "form.wizard.step.about": "О себе",
    "form.step.basic.title": "Основное",
    "form.step.basic.subtitle": "Добавьте фото и имя, чтобы вас легко нашли на ивенте.",
    "form.step.contacts.title": "Контакты",
    "form.step.contacts.subtitle": "Укажите, где с вами связаться и вашу нишу.",
    "form.step.about.title": "О себе",
    "form.step.about.subtitle": "Кратко расскажите, чем вы занимаетесь и чем полезны.",
    "form.review.title": "Проверить перед сохранением",
    "form.review.name": "Имя",
    "form.review.instagram": "Instagram",
    "form.review.niche": "Ниша",
    "form.review.about": "О себе",
    "form.review.helpful": "Чем полезен",
    "form.review.notSet": "Не указано",
    "form.action.next": "Далее",
    "form.action.back": "Назад",
    "form.action.home": "На главную",
    "form.success.title": "Профиль сохранен",
    "form.success.body": "Регистрация завершена. Переходим к главному экрану.",
    "form.success.redirecting": "Автопереход…",
    "form.photoPreviewAlt": "Фото профиля",
    "form.error.load": "Ошибка загрузки",
    "form.error.required": "Заполните обязательные поля.",
    "form.error.save": "Ошибка сохранения",
    "form.error.uploadGeneric": "Не удалось загрузить фото",
    "form.error.uploadMissingBlobToken":
      "На сервере не настроено хранилище для фото (Vercel Blob). Добавьте BLOB_READ_WRITE_TOKEN и сделайте redeploy.",
    "form.error.uploadFailed":
      "Не удалось загрузить фото. Проверьте Vercel Blob и переменную BLOB_READ_WRITE_TOKEN (затем redeploy).",
    "form.error.fileTooLarge": "Файл слишком большой (до 5MB).",
    "form.error.unsupportedType": "Неподдерживаемый формат. Используйте PNG/JPG/WebP.",

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
    "nav.profile": "Profile",
    "nav.scan": "Scan",
    "nav.participants": "Participants",
    "nav.program": "Program",
    "settings.title": "Settings",
    "settings.close": "Close",
    "settings.theme": "Theme",
    "settings.theme.dark": "Dark theme",
    "settings.theme.light": "Light theme",
    "settings.value.dark": "Dark",
    "settings.value.light": "Light",
    "settings.language": "Language",
    "settings.lang.ru": "Russian",
    "settings.lang.en": "English",

    "home.title": "Hi, {name}",
    "home.qr": "My QR",
    "home.scan": "Scan",
    "home.meetings": "My connections ({n})",
    "home.meetingsAll": "All",
    "home.meetingsEmpty": "No connections yet. Scan another participant's QR.",
    "home.chat": "Chat",
    "home.editProfile": "Edit profile",
    "home.fillProfile": "Fill profile",
    "home.myProfile": "My profile",
    "home.profileEmpty": "Your profile is not filled yet.",
    "home.instagramMissing": "Instagram is not set",
    "home.open": "Open",
    "home.participants": "Participants",
    "home.programSpeakers": "Program / Speakers",
    "home.profile.cardTitle": "My profile",
    "home.profile.openProfile": "Open profile",

    "profile.title": "Profile",
    "profile.edit": "Edit",
    "profile.qr": "My QR",
    "profile.empty.title": "Your profile is not filled yet",
    "profile.empty.body": "Add your details so other participants can connect with you easily.",
    "profile.empty.cta": "Fill profile",
    "profile.section.about": "About",
    "profile.section.helpful": "How I can help",
    "profile.section.instagram": "Instagram",
    "profile.section.showMore": "Show more",
    "profile.section.showLess": "Show less",
    "profile.notSet": "Not set",
    "profile.loading": "Loading profile…",
    "profile.error": "Failed to load profile.",

    "participants.title": "Participants",
    "participants.searchPlaceholder": "Enter name",
    "participants.empty": "No participants with a filled profile yet.",

    "program.title": "Program",
    "program.tab.program": "Program",
    "program.tab.speakers": "Speakers",
    "program.badge.now": "Now",
    "program.badge.next": "Next",
    "program.badge.closest": "Closest",
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
    "form.wizard.progress": "Step {current} of {total}",
    "form.wizard.stepsAria": "Registration steps",
    "form.wizard.actionsAria": "Registration form actions",
    "form.wizard.step.basic": "Basics",
    "form.wizard.step.contacts": "Contacts",
    "form.wizard.step.about": "About",
    "form.step.basic.title": "Basics",
    "form.step.basic.subtitle": "Add your photo and name so people can recognize you.",
    "form.step.contacts.title": "Contacts",
    "form.step.contacts.subtitle": "Share how people can reach you and your niche.",
    "form.step.about.title": "About",
    "form.step.about.subtitle": "Briefly describe what you do and how you can help.",
    "form.review.title": "Review before saving",
    "form.review.name": "Name",
    "form.review.instagram": "Instagram",
    "form.review.niche": "Niche",
    "form.review.about": "About",
    "form.review.helpful": "How I can help",
    "form.review.notSet": "Not set",
    "form.action.next": "Next",
    "form.action.back": "Back",
    "form.action.home": "Go home",
    "form.success.title": "Profile saved",
    "form.success.body": "Registration is complete. Redirecting to the home screen.",
    "form.success.redirecting": "Auto redirect…",
    "form.photoPreviewAlt": "Profile photo",
    "form.error.load": "Loading error",
    "form.error.required": "Please fill required fields.",
    "form.error.save": "Save error",
    "form.error.uploadGeneric": "Failed to upload photo",
    "form.error.uploadMissingBlobToken":
      "Photo storage is not configured on the server (Vercel Blob). Add BLOB_READ_WRITE_TOKEN and redeploy.",
    "form.error.uploadFailed":
      "Failed to upload photo. Check Vercel Blob and BLOB_READ_WRITE_TOKEN, then redeploy.",
    "form.error.fileTooLarge": "File is too large (up to 5MB).",
    "form.error.unsupportedType": "Unsupported format. Use PNG/JPG/WebP.",

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
