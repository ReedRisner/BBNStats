import { cbbFetch } from '@/lib/api';
import { resolveSeasonYear, TEAM } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PlayersPage({ searchParams }: { searchParams?: { year?: string } }) {
  const year = resolveSeasonYear(searchParams?.year);
  const [roster, stats] = await Promise.all([
    cbbFetch<any[]>('/teams/roster', { team: TEAM, year }).catch(() => []),
    cbbFetch<any[]>('/stats/player/season', { team: TEAM, year }).catch(() => [])
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-uk-blue">Players</h1>
      <div className="card">
        <h2 className="mb-2 font-semibold">Players Snapshot (JSON)</h2>
        <pre className="overflow-x-auto text-xs">{JSON.stringify({ year, rosterCount: roster.length, statsCount: stats.length, roster, stats }, null, 2)}</pre>
      </div>
    </div>
  );
}
