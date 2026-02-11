import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: '5x5 Soccer',
  description: 'Weekly 5-a-side soccer organizer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-body min-h-screen">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 pb-20 pt-6">{children}</main>
      </body>
    </html>
  );
}
