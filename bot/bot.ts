import "dotenv/config";
import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { upsertBotUser } from "../src/lib/db";

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const webAppUrl = process.env.WEBAPP_URL?.trim();
const defaultEventSlug = process.env.DEFAULT_EVENT_SLUG?.trim() || "default";
const welcomeText =
  process.env.WELCOME_TEXT?.trim() ||
  "Добро пожаловать! Здесь вы сможете зарегистрироваться на ивент и знакомиться через QR.";
const contactText =
  process.env.CONTACT_TEXT?.trim() || process.env.CONTACT_URL?.trim() || "Контакт: напишите организатору.";

if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
if (!webAppUrl) throw new Error("Missing WEBAPP_URL");
const baseWebAppUrl = webAppUrl;

function parseEventSlugFromStartParam(text: string) {
  const parts = text.split(" ").slice(1);
  if (parts.length === 0) return null;
  const param = parts.join(" ").trim();
  if (!param) return null;
  if (param.startsWith("event_")) return param.slice(6);
  return param;
}

function buildWebAppUrl(eventSlug: string) {
  const url = new URL(baseWebAppUrl);
  url.searchParams.set("event", eventSlug);
  return url.toString();
}

function buildWebAppUrlToPath(eventSlug: string, pathname: string) {
  const url = new URL(baseWebAppUrl);
  url.pathname = pathname;
  url.searchParams.set("event", eventSlug);
  return url.toString();
}

function isHttpsUrl(url: string) {
  return url.startsWith("https://");
}

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const eventSlug = parseEventSlugFromStartParam(ctx.message?.text ?? "") || defaultEventSlug;
  const launchUrl = buildWebAppUrl(eventSlug);
  const registerUrl = buildWebAppUrlToPath(eventSlug, "/form");

  if (!isHttpsUrl(launchUrl) || !isHttpsUrl(registerUrl)) {
    await ctx.reply(
      `WEBAPP_URL должен быть HTTPS — Telegram не принимает WebApp кнопку с HTTP.\n\n` +
        `Сейчас: ${launchUrl}\n\n` +
        `Сделай публичный HTTPS (ngrok/cloudflare tunnel/деплой), затем выставь WEBAPP_URL и повтори /start.`,
    );
    return;
  }

  if (ctx.from?.id) {
    upsertBotUser({
      telegramId: String(ctx.from.id),
      username: ctx.from.username ?? null,
      firstName: ctx.from.first_name ?? null,
      lastName: ctx.from.last_name ?? null,
    });
  }

  const inline = new InlineKeyboard()
    .webApp("Регистрация", registerUrl)
    .row()
    .text("Контакт", "contact")
    .row()
    .webApp("Открыть приложение", launchUrl);

  const reply = new Keyboard().webApp("Запустить приложение", launchUrl).resized();

  await ctx.reply(`${welcomeText}\n\nИвент: ${eventSlug}\n\nМожно: /start <код_ивента>`, {
    reply_markup: inline,
  });
  await ctx.reply("Кнопка запуска доступна внизу в клавиатуре.", { reply_markup: reply });
});

bot.callbackQuery("contact", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(contactText, { link_preview_options: { is_disabled: true } });
});

bot.command("contact", async (ctx) => {
  await ctx.reply(contactText, { link_preview_options: { is_disabled: true } });
});

bot.command("event", async (ctx) => {
  const text = ctx.message?.text ?? "";
  const slug = text.split(" ").slice(1).join(" ").trim();
  const eventSlug = slug || defaultEventSlug;
  const url = buildWebAppUrl(eventSlug);
  if (!isHttpsUrl(url)) {
    await ctx.reply(
      `WEBAPP_URL должен быть HTTPS — Telegram не принимает WebApp кнопку с HTTP.\n\n` +
        `Сейчас: ${url}\n\n` +
        `Сделай публичный HTTPS и выставь WEBAPP_URL.`,
    );
    return;
  }

  const keyboard = new InlineKeyboard().webApp("Открыть Mini App", url);
  await ctx.reply(`Ивент: ${eventSlug}`, { reply_markup: keyboard });
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

async function main() {
  const me = await bot.api.getMe();
  console.log(`Bot @${me.username} starting…`);

  // If this bot previously used webhooks, long polling will not receive updates.
  await bot.api.deleteWebhook({ drop_pending_updates: true });

  console.log(`WebApp URL: ${baseWebAppUrl}`);
  bot.start();
}

main().catch((e) => {
  console.error("Failed to start bot:", e);
  process.exitCode = 1;
});
