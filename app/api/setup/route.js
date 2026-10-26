import { config } from '@/lib/config';
import { hasSecret } from '@/lib/auth';
import { db } from '@/lib/db';
import { setWebhook } from '@/lib/telegram';

// One-time setup, open https://<your-app>/api/setup?key=<CRON_SECRET> after deploying.
// Creates the database table and connects the Telegram bot to this app.
export async function GET(request) {
  if (!hasSecret(request, config.cronSecret)) return new Response('Unauthorized', { status: 401 });
  const results = {};
  try {
    await db();
    results.database = 'ok';
  } catch (err) {
    results.database = err.message;
  }
  try {
    const origin = config.appUrl || new URL(request.url).origin;
    await setWebhook(`${origin}/api/telegram`);
    results.telegram = `webhook set to ${origin}/api/telegram`;
  } catch (err) {
    results.telegram = err.message;
  }
  return Response.json(results);
}
