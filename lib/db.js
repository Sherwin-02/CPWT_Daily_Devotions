import { neon } from '@neondatabase/serverless';
import { config } from './config';

// Status flow:
//   pending -> rendering -> awaiting_approval -> approved -> posting -> posted
//   awaiting_approval -> skipped (by you, or automatically if not approved by posting time)
//   rendering / posting -> failed (see the error column)

let sqlClient;
let schemaReady;

function sql() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not set');
  sqlClient ??= neon(config.databaseUrl);
  return sqlClient;
}

async function ensureSchema() {
  schemaReady ??= sql()`
    CREATE TABLE IF NOT EXISTS devotions (
      date date PRIMARY KEY,
      verse_tamil text,
      reference_tamil text,
      verse_english text,
      reference_english text,
      caption text,
      theme text,
      background_url text,
      status text NOT NULL DEFAULT 'pending',
      image_url text,
      render_count integer NOT NULL DEFAULT 0,
      telegram_message_id bigint,
      facebook_post_id text,
      instagram_media_id text,
      instagram_permalink text,
      error text,
      approved_by text,
      approved_at timestamptz,
      posted_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
  await schemaReady;
}

export async function db() {
  await ensureSchema();
  return sql();
}

const COLUMNS = `to_char(date, 'YYYY-MM-DD') AS date, verse_tamil, reference_tamil, verse_english, reference_english,
  caption, theme, background_url, status, image_url, render_count, telegram_message_id, facebook_post_id,
  instagram_media_id, instagram_permalink, error, approved_by, approved_at, posted_at, updated_at`;

export async function getDevotion(date) {
  const q = await db();
  const rows = await q.query(`SELECT ${COLUMNS} FROM devotions WHERE date = $1`, [date]);
  return rows[0] || null;
}

export async function listDevotions({ from, to, order = 'asc', limit = 200 } = {}) {
  const q = await db();
  const where = [];
  const params = [];
  if (from) where.push(`date >= $${params.push(from)}`);
  if (to) where.push(`date <= $${params.push(to)}`);
  const sqlText = `SELECT ${COLUMNS} FROM devotions ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY date ${order === 'desc' ? 'DESC' : 'ASC'} LIMIT ${Number(limit)}`;
  return q.query(sqlText, params);
}

export async function updateDevotion(date, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return getDevotion(date);
  const q = await db();
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const rows = await q.query(
    `UPDATE devotions SET ${sets}, updated_at = now() WHERE date = $1 RETURNING ${COLUMNS}`,
    [date, ...keys.map((k) => fields[k])],
  );
  return rows[0] || null;
}

// Moves a row from one of `fromStatuses` to `toStatus` only if it is still there.
// Returns the row when the change happened, or null if someone else got there first.
export async function transition(date, fromStatuses, toStatus, extra = {}) {
  const q = await db();
  const keys = Object.keys(extra);
  const sets = keys.map((k, i) => `, ${k} = $${i + 3}`).join('');
  const rows = await q.query(
    `UPDATE devotions SET status = $2${sets}, updated_at = now()
     WHERE date = $1 AND status = ANY($${keys.length + 3}::text[]) RETURNING ${COLUMNS}`,
    [date, toStatus, ...keys.map((k) => extra[k]), fromStatuses],
  );
  return rows[0] || null;
}

const TEXT_FIELDS = ['verse_tamil', 'reference_tamil', 'verse_english', 'reference_english', 'caption', 'theme', 'background_url'];

// Inserts or updates one day from the spreadsheet. Posted days are never touched.
// If the verse text changes on a day that already has an image, the image is cleared so it is re-made.
export async function upsertFromSheet(row) {
  const existing = await getDevotion(row.date);
  if (!existing) {
    const q = await db();
    await q.query(
      `INSERT INTO devotions (date, ${TEXT_FIELDS.join(', ')}) VALUES ($1, ${TEXT_FIELDS.map((_, i) => `$${i + 2}`).join(', ')})`,
      [row.date, ...TEXT_FIELDS.map((k) => row[k] || null)],
    );
    return 'added';
  }
  if (['posted', 'posting'].includes(existing.status)) return 'kept (already posted)';
  const changed = TEXT_FIELDS.filter((k) => (existing[k] || '') !== (row[k] || ''));
  if (!changed.length) return 'unchanged';
  const fields = Object.fromEntries(changed.map((k) => [k, row[k] || null]));
  if (existing.image_url || existing.status !== 'pending') {
    Object.assign(fields, { status: 'pending', image_url: null, approved_by: null, approved_at: null, error: null });
  }
  await updateDevotion(row.date, fields);
  return 'updated';
}
