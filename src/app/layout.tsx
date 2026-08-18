import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'RentProof — get your deposit back',
  description:
    'Photograph it before, photograph it after, and let AI argue the deduction line by line, with the statute, a demand letter and a phone call it places itself.',
  openGraph: {
    title: 'RentProof',
    description: 'Get your deposit back. Photos in, statute out, phone call placed.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'RentProof' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-base font-sans text-white antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
                     focus:rounded-xl focus:bg-accent focus:px-3 focus:py-2 focus:text-base
                     focus:font-semibold focus:text-ink"
        >
          Skip to content
        </a>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
