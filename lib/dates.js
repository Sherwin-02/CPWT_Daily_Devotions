import { config } from './config';

// Returns YYYY-MM-DD for "now + offsetDays" in the church's timezone.
export function localDate(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone }).format(now);
}

export function prettyDate(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function isIsoDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}
