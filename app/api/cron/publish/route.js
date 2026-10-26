import { config } from '@/lib/config';
import { hasSecret } from '@/lib/auth';
import { getDevotion, transition } from '@/lib/db';
import { localDate, isIsoDate } from '@/lib/dates';
import { publish } from '@/lib/workflow';
import { sendMessage } from '@/lib/telegram';

export const maxDuration = 60;

// Call once each day at posting time (cron-job.org). Posts today's devotion if it was approved.
export async function GET(request) {
  if (!hasSecret(request, config.cronSecret)) return new Response('Unauthorized', { status: 401 });
  const asked = new URL(request.url).searchParams.get('date');
  const date = asked && isIsoDate(asked) ? asked : localDate(0);

  const d = await getDevotion(date);
  if (!d) return Response.json({ date, action: 'missing' });
  if (d.status === 'approved') {
    const result = await publish(date);
    return Response.json({ date, action: 'published', ...result });
  }
  if (['pending', 'rendering', 'awaiting_approval', 'failed'].includes(d.status)) {
    await transition(date, [d.status], 'skipped', { error: 'Not approved by posting time' });
    await sendMessage(`⏭ The devotion for ${date} wasn't approved in time, so it was not posted. You can still post it from the dashboard.`).catch(() => {});
    return Response.json({ date, action: 'skipped' });
  }
  return Response.json({ date, action: 'nothing', status: d.status });
}
