import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'create-repull-channel-manager',
  description: 'Forkable starter for building your own vacation-rental channel manager on Repull.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
