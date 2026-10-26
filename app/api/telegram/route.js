import { config } from '@/lib/config';
import { listDevotions } from '@/lib/db';
import { localDate, prettyDate } from '@/lib/dates';
import { approve, requestRender, skip } from '@/lib/workflow';
import * as telegram from '@/lib/telegram';

// Telegram sends every bot message and button press here.
export async function POST(request) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== config.telegramWebhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }
  const update = await request.json();
  try {
    if (update.callback_query) await handleButton(update.callback_query);
    else if (update.message?.text) await handleText(update.message);
  } catch (err) {
    console.error(err);
  }
  // Always 200 so Telegram doesn't keep retrying.
  return Response.json({ ok: true });
}

async function handleText(message) {
  const chatId = message.chat.id;
  const text = message.text.trim();

  if (text.startsWith('/start') || text.startsWith('/id')) {
    await telegram.sendMessage(
      telegram.isAllowedChat(chatId)
        ? `Hi! You'll get each day's devotion here to approve. Send /status to see what's coming up.`
        : `Your chat id is ${chatId}. Add it to TELEGRAM_CHAT_IDS in Vercel to receive approvals here.`,
      chatId,
    );
    return;
  }
  if (!telegram.isAllowedChat(chatId)) return;

  if (text.startsWith('/status')) {
    const rows = await listDevotions({ from: localDate(0), limit: 7 });
    const lines = rows.map((d) => `${prettyDate(d.date)}: ${d.status.replace('_', ' ')}`);
    await telegram.sendMessage(lines.length ? lines.join('\n') : 'Nothing scheduled. Upload a spreadsheet in the dashboard.', chatId);
  }
}

async function handleButton(query) {
  const chatId = query.message?.chat.id;
  if (!telegram.isAllowedChat(chatId)) {
    await telegram.answerCallback(query.id, 'You are not allowed to approve.');
    return;
  }
  const [action, date] = String(query.data).split(':');
  const who = [query.from.first_name, query.from.last_name].filter(Boolean).join(' ') || 'Telegram';
  const day = prettyDate(date);

  try {
    if (action === 'approve') {
      await approve(date, who);
      await telegram.answerCallback(query.id, 'Approved');
      await telegram.markPreview(chatId, query.message.message_id, `✅ ${day} approved by ${who}. It will post at the usual time.`);
    } else if (action === 'skip') {
      await skip(date, who);
      await telegram.answerCallback(query.id, 'Skipped');
      await telegram.markPreview(chatId, query.message.message_id, `⏭ ${day} skipped by ${who}. Nothing will be posted.`);
    } else if (action === 'regen') {
      await requestRender(date);
      await telegram.answerCallback(query.id, 'Making a new image…');
      await telegram.markPreview(chatId, query.message.message_id, `🔄 ${day}: making a new image, it will arrive in about 2 minutes.`);
    }
  } catch (err) {
    await telegram.answerCallback(query.id, err.message.slice(0, 190));
  }
}
