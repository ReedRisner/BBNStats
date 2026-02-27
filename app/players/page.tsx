import { cbbFetch } from '@/lib/api';
import { resolveSeasonYear, SEASONS, TEAM } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchPlayersSnapshot(year: number) {
  const [roster, stats] = await Promise.all([
    cbbFetch<any[]>('/teams/roster', { team: TEAM, year }).catch(() => []),
    cbbFetch<any[]>('/stats/player/season', { team: TEAM, year }).catch(() => [])
  ]);

  return { year, roster, stats };
}

export default async function PlayersPage({ searchParams }: { searchParams?: { year?: string } }) {
  const requestedYear = resolveSeasonYear(searchParams?.year);
  let snapshot = await fetchPlayersSnapshot(requestedYear);

  if (snapshot.roster.length === 0 && snapshot.stats.length === 0) {
    for (const fallbackYear of SEASONS) {
      if (fallbackYear === requestedYear) continue;
      const candidate = await fetchPlayersSnapshot(fallbackYear);
      if (candidate.roster.length > 0 || candidate.stats.length > 0) {
        snapshot = candidate;
        break;
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-uk-blue">Players</h1>
      <div className="card">
        <h2 className="mb-2 font-semibold">Players Snapshot (JSON)</h2>
        <pre className="overflow-x-auto text-xs">
          {JSON.stringify(
            {
              requestedYear,
              dataYear: snapshot.year,
              fallbackUsed: snapshot.year !== requestedYear,
              rosterCount: snapshot.roster.length,
              statsCount: snapshot.stats.length,
              roster: snapshot.roster,
              stats: snapshot.stats
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
