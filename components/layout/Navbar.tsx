'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SeasonSelect } from '@/components/layout/SeasonSelect';

const NAV_ITEMS: Array<[string, string]> = [
  ['/', 'Dashboard'],
  ['/players', 'Players'],
  ['/schedule', 'Schedule'],
  ['/team-stats', 'Team Stats'],
  ['/compare', 'Compare'],
  ['/lineups', 'Lineups'],
  ['/recruiting', 'Recruiting'],
  ['/draft-history', 'Draft History']
];

export function Navbar() {
  const searchParams = useSearchParams();
  const selectedYear = searchParams.get('year');

  return (
    <header className="sticky top-0 z-50 border-b border-uk-blue-light bg-uk-blue text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="font-bold">BBNStats</div>
        <div className="hidden gap-4 md:flex">
          {NAV_ITEMS.map(([href, label]) => {
            const nextHref = selectedYear ? `${href}?year=${selectedYear}` : href;
            return (
              <Link key={href} href={nextHref} className="text-sm hover:underline">
                {label}
              </Link>
            );
          })}
        </div>
        <SeasonSelect />
      </nav>
    </header>
  );
}
