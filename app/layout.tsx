import type { Metadata } from 'next';
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
        <Navbar />
        <main className="mx-auto min-h-[calc(100vh-128px)] max-w-7xl p-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
