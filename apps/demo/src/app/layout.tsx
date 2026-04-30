import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Repull SDK — Interactive Demo',
  description:
    "Build on api.repull.dev — vacation-rental tech, unified. Live-fire Airbnb OAuth Connect flow, Reservations, and Properties against a real Repull API key.",
  metadataBase: new URL('https://repull.dev'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
