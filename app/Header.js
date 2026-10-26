import Link from 'next/link';
import { config } from '@/lib/config';
import { logout } from './actions';

export default function Header() {
  return (
    <header className="top">
      <Link href="/" className="brand">{config.churchName} · Daily Devotion</Link>
      <nav>
        <Link href="/">Schedule</Link>
        <Link href="/?view=past">Past posts</Link>
        <Link href="/upload">Upload Excel</Link>
        <form action={logout}><button className="quiet" style={{ padding: '0 4px', border: 0, color: 'var(--cream)', fontWeight: 400 }}>Log out</button></form>
      </nav>
    </header>
  );
}
