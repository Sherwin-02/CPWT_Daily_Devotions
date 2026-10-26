import { config } from '@/lib/config';
import { hasSecret } from '@/lib/auth';
import { getDevotion } from '@/lib/db';
import { localDate, isIsoDate } from '@/lib/dates';
import { requestRender } from '@/lib/workflow';
import { sendMessage, sendPreview } from '@/lib/telegram';

// Call once each evening (cron-job.org). Makes tomorrow's image and sends it to Telegram for approval.
// ?date=YYYY-MM-DD prepares a specific day instead.
export async function GET(request) {
  if (!hasSecret(request, config.cronSecret)) return new Response('Unauthorized', { status: 401 });
  const asked = new URL(request.url).searchParams.get('date');
  const date = asked && isIsoDate(asked) ? asked : localDate(1);

  const d = await getDevotion(date);
  if (!d) {
    await sendMessage(`⚠️ There is no verse in the schedule for ${date}. Upload a spreadsheet in the dashboard.`).catch(() => {});
    return Response.json({ date, action: 'missing' });
  }
  if (['pending', 'failed'].includes(d.status)) {
    await requestRender(date);
    return Response.json({ date, action: 'rendering' });
  }
  if (d.status === 'awaiting_approval' && d.image_url) {
    // Image was made earlier (for example from the dashboard): send it again as a reminder.
    await sendPreview(d).catch(() => {});
    return Response.json({ date, action: 'reminded' });
  }
  return Response.json({ date, action: 'nothing', status: d.status });
}
