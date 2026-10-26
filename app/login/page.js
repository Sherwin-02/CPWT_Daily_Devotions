import LoginForm from './LoginForm';
import { config } from '@/lib/config';

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;
  return (
    <main className="login">
      <div className="panel">
        <h1>{config.churchName}</h1>
        <p className="sub">Daily devotion dashboard</p>
        <LoginForm next={next || '/'} />
      </div>
    </main>
  );
}
