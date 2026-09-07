import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';

import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '800'],
  variable: '--fuente-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kadó',
  description: 'Ábrelo para ver qué hay dentro.',
};

export const viewport: Viewport = {
  themeColor: '#4b2fa3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" className={jakarta.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
