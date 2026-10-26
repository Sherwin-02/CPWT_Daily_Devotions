import './globals.css';
import { config } from '@/lib/config';

export const metadata = { title: `${config.churchName} · Daily Devotion` };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
