import { config } from './config';
import { prettyDate } from './dates';

async function call(method, body) {
  if (!config.telegramToken) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  const res = await fetch(`https://api.telegram.org/bot${config.telegramToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
  return json.result;
}

const primaryChat = () => config.telegramChatIds[0];

export function isAllowedChat(chatId) {
  return config.telegramChatIds.includes(String(chatId));
}

export function approvalKeyboard(date) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve:${date}` },
        { text: '🔄 Regenerate', callback_data: `regen:${date}` },
        { text: '⏭ Skip', callback_data: `skip:${date}` },
      ],
      ...(config.appUrl ? [[{ text: '✏️ Open in dashboard', url: `${config.appUrl}/day/${date}` }]] : []),
    ],
  };
}

export function previewCaption(d) {
  const ref = d.reference_tamil || d.reference_english || '';
  return `Devotion for ${prettyDate(d.date)}${ref ? ` · ${ref}` : ''}\n\nApprove it to post at the usual time.`;
}

export async function sendPreview(devotion) {
  const chat = primaryChat();
  if (!chat) return null;
  const msg = await call('sendPhoto', {
    chat_id: chat,
    photo: devotion.image_url,
    caption: previewCaption(devotion),
    reply_markup: approvalKeyboard(devotion.date),
  });
  return msg.message_id;
}

export async function sendMessage(text, chatId = primaryChat()) {
  if (!chatId) return null;
  return call('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
}

export async function answerCallback(id, text) {
  return call('answerCallbackQuery', { callback_query_id: id, text });
}

// Replaces the buttons under a preview with a status line once it has been handled.
export async function markPreview(chatId, messageId, caption) {
  return call('editMessageCaption', { chat_id: chatId, message_id: messageId, caption, reply_markup: { inline_keyboard: [] } });
}

export async function setWebhook(url) {
  return call('setWebhook', {
    url,
    secret_token: config.telegramWebhookSecret,
    allowed_updates: ['message', 'callback_query'],
  });
}
