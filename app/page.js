import Link from 'next/link';
import Header from './Header';
import StatusBadge from './StatusBadge';
import { listDevotions } from '@/lib/db';
import { localDate, prettyDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

const VIEWS = {
  upcoming: { label: 'Upcoming', query: () => ({ from: localDate(0), order: 'asc', limit: 60 }) },
  past: { label: 'Past posts', query: () => ({ to: localDate(-1), order: 'desc', limit: 120 }) },
  all: { label: 'Everything', query: () => ({ order: 'desc', limit: 400 }) },
};

export default async function Home({ searchParams }) {
  const { view: v } = await searchParams;
  const view = VIEWS[v] ? v : 'upcoming';
  const rows = await listDevotions(VIEWS[view].query());
  const tomorrow = localDate(1);
  const next = rows.find((d) => d.date === tomorrow);

  return (
    <>
      <Header />
      <main>
        <h1>Daily devotions</h1>
        <p className="sub">
          {next
            ? <>Tomorrow ({prettyDate(tomorrow)}): <StatusBadge status={next.status} /> <Link href={`/day/${tomorrow}`}>Open</Link></>
            : view === 'upcoming' ? <>No verse is scheduled for tomorrow. <Link href="/upload">Upload a spreadsheet</Link>.</> : null}
        </p>
        <div className="tabs">
          {Object.entries(VIEWS).map(([key, { label }]) => (
            <Link key={key} href={key === 'upcoming' ? '/' : `/?view=${key}`} className={key === view ? 'on' : ''}>{label}</Link>
          ))}
        </div>
        {rows.length ? (
          <div className="grid">
            {rows.map((d) => (
              <Link key={d.date} href={`/day/${d.date}`} className="card">
                <div className="thumb">
                  {d.image_url ? <img src={d.image_url} alt={`Devotion for ${d.date}`} loading="lazy" /> : (d.reference_tamil || d.reference_english || 'No image yet')}
                </div>
                <div className="meta">
                  <div className="date">{prettyDate(d.date)}</div>
                  <div className="ref">{d.reference_tamil || d.reference_english}</div>
                  <StatusBadge status={d.status} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">Nothing here yet. <Link href="/upload">Upload your Excel file</Link> to get started.</div>
        )}
      </main>
    </>
  );
}
