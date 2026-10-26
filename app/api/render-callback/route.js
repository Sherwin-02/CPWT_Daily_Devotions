import { put } from '@vercel/blob';
import { config } from '@/lib/config';
import { hasSecret } from '@/lib/auth';
import { getDevotion, updateDevotion } from '@/lib/db';
import { imageReady } from '@/lib/workflow';
import { isIsoDate } from '@/lib/dates';
import { sendMessage } from '@/lib/telegram';

// GitHub Actions posts the finished JPEG here (or ?failed=1 if drawing it failed).
export async function POST(request) {
  if (!hasSecret(request, config.renderSecret)) return new Response('Unauthorized', { status: 401 });
  const params = new URL(request.url).searchParams;
  const date = params.get('date');
  if (!isIsoDate(date || '') || !(await getDevotion(date))) return new Response('Unknown date', { status: 404 });

  if (params.get('failed')) {
    await updateDevotion(date, { status: 'failed', error: 'The image could not be generated. Check the GitHub Actions log.' });
    await sendMessage(`⚠️ The image for ${date} could not be generated. Try Regenerate in the dashboard.`).catch(() => {});
    return Response.json({ ok: true });
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (!body.length) return new Response('Empty image', { status: 400 });
  const blob = await put(`devotions/${date}.jpg`, body, {
    access: 'public',
    contentType: 'image/jpeg',
    addRandomSuffix: true,
  });
  await imageReady(date, blob.url);
  return Response.json({ ok: true, url: blob.url });
}
