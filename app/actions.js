'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { passwordMatches, sessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getDevotion, updateDevotion, upsertFromSheet } from '@/lib/db';
import { isIsoDate } from '@/lib/dates';
import { parseDevotionWorkbook } from '@/lib/excel';
import { approve, publish, requestRender, skip } from '@/lib/workflow';

async function requireLogin() {
  const jar = await cookies();
  if (jar.get(SESSION_COOKIE)?.value !== sessionToken()) redirect('/login');
}

const back = (date, params) => redirect(`/day/${date}?${new URLSearchParams(params)}`);

export async function login(_prev, formData) {
  if (!passwordMatches(formData.get('password') || '')) return { error: 'Wrong password' };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken(), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 60 });
  const next = String(formData.get('next') || '/');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect('/login');
}

function dateFrom(formData) {
  const date = String(formData.get('date') || '');
  if (!isIsoDate(date)) throw new Error('Bad date');
  return date;
}

async function run(date, fn, okMessage) {
  let error;
  try {
    await fn();
  } catch (err) {
    error = err.message;
  }
  revalidatePath('/');
  back(date, error ? { error } : { ok: okMessage });
}

export async function approveAction(formData) {
  await requireLogin();
  const date = dateFrom(formData);
  await run(date, () => approve(date, 'Dashboard'), 'Approved. It will post at the usual time.');
}

export async function skipAction(formData) {
  await requireLogin();
  const date = dateFrom(formData);
  await run(date, () => skip(date, 'Dashboard'), 'Skipped. Nothing will be posted for this day.');
}

export async function regenerateAction(formData) {
  await requireLogin();
  const date = dateFrom(formData);
  await run(date, () => requestRender(date), 'Making a new image. Refresh in about 2 minutes; the preview also goes to Telegram.');
}

export async function postNowAction(formData) {
  await requireLogin();
  const date = dateFrom(formData);
  await run(
    date,
    async () => {
      const result = await publish(date, { fromStatuses: ['approved', 'failed', 'skipped', 'awaiting_approval'] });
      if (!result.posted) throw new Error(result.errors?.join('\n') || `Not posted: ${result.reason}`);
    },
    'Posted to Facebook and Instagram.',
  );
}

export async function saveAction(formData) {
  await requireLogin();
  const date = dateFrom(formData);
  const d = await getDevotion(date);
  if (!d) back(date, { error: 'Not found' });
  if (['posting', 'posted'].includes(d.status)) back(date, { error: 'Already posted, it can no longer be changed.' });

  const fields = {};
  for (const key of ['verse_tamil', 'reference_tamil', 'verse_english', 'reference_english', 'caption', 'theme', 'background_url']) {
    const value = String(formData.get(key) ?? '').trim() || null;
    if ((d[key] || null) !== value) fields[key] = value;
  }
  const imageChanged = Object.keys(fields).some((k) => k !== 'caption');
  if (imageChanged && d.image_url) Object.assign(fields, { status: 'pending', image_url: null, approved_by: null, approved_at: null });
  await updateDevotion(date, fields);

  if (imageChanged && formData.get('rerender')) {
    await run(date, () => requestRender(date), 'Saved. Making a new image now.');
  }
  revalidatePath('/');
  back(date, { ok: Object.keys(fields).length ? 'Saved.' : 'No changes.' });
}

export async function uploadAction(_prev, formData) {
  await requireLogin();
  const file = formData.get('file');
  if (!file || typeof file === 'string' || !file.size) return { errors: ['Choose an Excel (.xlsx) file first.'] };

  let parsed;
  try {
    parsed = await parseDevotionWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { errors: ['That file could not be read. Save it as .xlsx and try again.'] };
  }
  const results = [];
  for (const row of parsed.rows) {
    results.push({ date: row.date, reference: row.reference_tamil || row.reference_english, result: await upsertFromSheet(row) });
  }
  revalidatePath('/');
  return { errors: parsed.errors, results };
}
