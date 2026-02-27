'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SEASONS } from '@/lib/constants';

export function SeasonSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = Number(searchParams.get('year'));
  const currentValue = SEASONS.includes(selected) ? selected : SEASONS[0];

  return (
    <select
      className="rounded bg-uk-blue-light px-2 py-1 text-xs"
      value={currentValue}
      onChange={(event) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set('year', event.target.value);
        router.push(`${pathname}?${next.toString()}`);
      }}
      aria-label="Select season"
    >
      {SEASONS.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}
