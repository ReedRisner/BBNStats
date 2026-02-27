import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    default: 'BBNStats - Kentucky Wildcats Basketball Statistics',
    template: '%s | BBNStats'
  },
  description: "Comprehensive statistics, box scores, player analysis, and historical data for Kentucky Wildcats men's basketball."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="sticky top-0 z-50 border-b border-uk-blue-light bg-uk-blue text-white"><nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3"><div className="font-bold">BBNStats</div></nav></div>}><Navbar /></Suspense>
        <main className="mx-auto min-h-[calc(100vh-128px)] max-w-7xl p-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
