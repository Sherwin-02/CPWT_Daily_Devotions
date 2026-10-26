// The daily steps, shared by the dashboard, the Telegram bot and the scheduled calls.

import { config, THEMES } from './config';
import { getDevotion, transition, updateDevotion } from './db';
import { postToFacebook, postToInstagram } from './meta';
import * as telegram from './telegram';
import { prettyDate } from './dates';

// Picks a colour theme: the one from the spreadsheet, otherwise rotate by day,
// moving to the next theme each time the image is regenerated.
function themeFor(d) {
  if (d.theme) return d.theme;
  const day = Math.floor(Date.parse(`${d.date}T00:00:00Z`) / 86400000);
  return THEMES[(day + d.render_count) % THEMES.length];
}

export function renderPayload(d) {
  return {
    date: d.date,
    churchName: config.churchName,
    theme: themeFor(d),
    verseTamil: d.verse_tamil || '',
    referenceTamil: d.reference_tamil || '',
    verseEnglish: d.verse_english || '',
    referenceEnglish: d.reference_english || '',
    backgroundUrl: d.background_url || '',
  };
}

// Asks GitHub Actions to draw the image. It calls back /api/render-callback when done.
export async function requestRender(date) {
  const d = await getDevotion(date);
  if (!d) throw new Error(`No devotion for ${date}`);
  if (['posting', 'posted'].includes(d.status)) throw new Error(`${date} is already posted`);
  if (!config.githubToken) throw new Error('GITHUB_TOKEN is not set');

  const payload = Buffer.from(JSON.stringify(renderPayload(d))).toString('base64');
  const res = await fetch(
    `https://api.github.com/repos/${config.githubRepo}/actions/workflows/render.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.githubToken}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ ref: config.githubBranch, inputs: { date, payload } }),
    },
  );
  if (!res.ok) throw new Error(`GitHub render request failed: ${res.status} ${await res.text()}`);

  await updateDevotion(date, {
    status: 'rendering',
    render_count: d.render_count + 1,
    approved_by: null,
    approved_at: null,
    error: null,
  });
}

// Called when a new image has been stored.
export async function imageReady(date, imageUrl) {
  const d = await updateDevotion(date, { image_url: imageUrl, status: 'awaiting_approval', error: null });
  try {
    const messageId = await telegram.sendPreview(d);
    if (messageId) await updateDevotion(date, { telegram_message_id: messageId });
  } catch (err) {
    await updateDevotion(date, { error: `Preview not sent to Telegram: ${err.message}` });
  }
  return d;
}

export async function approve(date, by) {
  const d = await transition(date, ['awaiting_approval', 'skipped'], 'approved', {
    approved_by: by,
    approved_at: new Date().toISOString(),
  });
  if (!d) throw new Error('This day is not waiting for approval');
  return d;
}

export async function skip(date, by) {
  const d = await transition(date, ['pending', 'awaiting_approval', 'approved', 'failed'], 'skipped', { approved_by: by });
  if (!d) throw new Error('This day cannot be skipped now');
  return d;
}

export function buildCaption(d) {
  if (d.caption) return d.caption;
  const parts = [];
  if (d.verse_tamil) parts.push(`“${d.verse_tamil}”\n— ${d.reference_tamil || ''}`.trim());
  if (d.verse_english) parts.push(`“${d.verse_english}”\n— ${d.reference_english || ''}`.trim());
  parts.push(`${config.churchName}\n${config.defaultHashtags}`);
  return parts.join('\n\n');
}

// Posts an approved day to Facebook and Instagram at the same time.
// The dashboard's "Post now" also allows retrying a day whose posting failed.
export async function publish(date, { fromStatuses = ['approved'] } = {}) {
  const current = await getDevotion(date);
  if (!current?.image_url) return { posted: false, reason: 'no image yet' };
  const d = await transition(date, fromStatuses, 'posting');
  if (!d) return { posted: false, reason: 'not approved' };

  const caption = buildCaption(d);
  const [fb, ig] = await Promise.allSettled([
    d.facebook_post_id ? Promise.resolve(d.facebook_post_id) : postToFacebook(d.image_url, caption),
    d.instagram_media_id ? Promise.resolve({ id: d.instagram_media_id, permalink: d.instagram_permalink }) : postToInstagram(d.image_url, caption),
  ]);

  const errors = [];
  const fields = {};
  if (fb.status === 'fulfilled') fields.facebook_post_id = fb.value;
  else errors.push(`Facebook: ${fb.reason.message}`);
  if (ig.status === 'fulfilled') {
    fields.instagram_media_id = ig.value.id;
    fields.instagram_permalink = ig.value.permalink;
  } else errors.push(`Instagram: ${ig.reason.message}`);

  // If one platform failed the day goes back to "approved", so "Post now" retries only the missing one.
  Object.assign(fields, errors.length
    ? { status: fb.status === 'rejected' && ig.status === 'rejected' ? 'failed' : 'approved', error: errors.join('\n') }
    : { status: 'posted', posted_at: new Date().toISOString(), error: null });
  const updated = await updateDevotion(date, fields);

  const links = [
    updated.facebook_post_id && `Facebook: https://facebook.com/${updated.facebook_post_id}`,
    updated.instagram_permalink && `Instagram: ${updated.instagram_permalink}`,
  ].filter(Boolean);
  await telegram
    .sendMessage(
      errors.length
        ? `⚠️ Posting for ${prettyDate(date)} had problems:\n${errors.join('\n')}\n${links.join('\n')}`
        : `✅ Posted the devotion for ${prettyDate(date)}.\n${links.join('\n')}`,
    )
    .catch(() => {});

  return { posted: !errors.length, errors };
}
