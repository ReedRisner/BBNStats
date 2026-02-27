import { cbbFetch } from '@/lib/api';
import { resolveSeasonYear, TEAM } from '@/lib/constants';

export const revalidate = 21600;

export default async function LineupsPage({ searchParams }: { searchParams?: { year?: string } }) {
  const year = resolveSeasonYear(searchParams?.year);
  const lineups = await cbbFetch<any[]>('/lineups/team', { team: TEAM, year }).catch(() => []);
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-uk-blue">Lineups</h1><div className="card">Top lineups loaded: {lineups.length}</div></div>;
}
