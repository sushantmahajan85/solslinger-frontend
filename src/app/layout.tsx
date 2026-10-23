import type { Metadata, Viewport } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import { AppProviders } from '@/components/wallet/WalletProviders';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Solslinger Studio',
    template: '%s · Solslinger Studio',
  },
  description: 'Swear allegiance, claim a legend, and walk into the Bloody Raven.',
};

export const viewport: Viewport = {
  themeColor: '#0b0b0d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
