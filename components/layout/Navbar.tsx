import Link from 'next/link';
import { SEASONS } from '@/lib/constants';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-uk-blue-light bg-uk-blue text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="font-bold">BBNStats</div>
        <div className="hidden gap-4 md:flex">
          {[
            ['/', 'Dashboard'],
            ['/players', 'Players'],
            ['/schedule', 'Schedule'],
            ['/team-stats', 'Team Stats'],
            ['/compare', 'Compare'],
            ['/lineups', 'Lineups'],
            ['/recruiting', 'Recruiting'],
            ['/draft-history', 'Draft History']
          ].map(([href, label]) => (
            <Link key={href} href={href} className="text-sm hover:underline">{label}</Link>
          ))}
        </div>
        <select className="rounded bg-uk-blue-light px-2 py-1 text-xs">
          {SEASONS.map((year) => <option key={year}>{year}</option>)}
        </select>
      </nav>
    </header>
  );
}
