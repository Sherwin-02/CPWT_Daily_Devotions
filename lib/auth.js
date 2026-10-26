import { createHash, timingSafeEqual } from 'node:crypto';
import { config } from './config';

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// For calls from cron-job.org and GitHub Actions: "Authorization: Bearer <secret>" or "?key=<secret>".
export function hasSecret(request, secret) {
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const key = header.startsWith('Bearer ') ? header.slice(7) : new URL(request.url).searchParams.get('key');
  return Boolean(key) && safeEqual(key, secret);
}

// The dashboard login cookie holds a hash of the password and SESSION_SECRET, never the password itself.
export function sessionToken() {
  return createHash('sha256').update(`${config.dashboardPassword}:${config.sessionSecret}`).digest('hex');
}

export function passwordMatches(input) {
  return Boolean(config.dashboardPassword) && safeEqual(input, config.dashboardPassword);
}

export const SESSION_COOKIE = 'cpwt_session';
