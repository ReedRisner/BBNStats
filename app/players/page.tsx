import { cbbFetch } from '@/lib/api';
import { resolveSeasonYear, SEASONS, TEAM } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RosterResponse = Array<{
  season?: number;
  players?: any[];
}>;

type PlayersSnapshot = {
  year: number;
  rosterPayload: RosterResponse;
  rosterPlayers: any[];
  stats: any[];
};

function normalizeRosterPlayers(rosterPayload: RosterResponse): any[] {
  if (!Array.isArray(rosterPayload)) return [];

  const nestedPlayers = rosterPayload.flatMap((entry) => (Array.isArray(entry?.players) ? entry.players : []));
  if (nestedPlayers.length > 0) return nestedPlayers;

  return rosterPayload as any[];
}

async function fetchPlayersSnapshot(year: number): Promise<PlayersSnapshot> {
  const [rosterPayload, stats] = await Promise.all([
    cbbFetch<RosterResponse>('/teams/roster', { team: TEAM, season: year }).catch(() => []),
    cbbFetch<any[]>('/stats/player/season', { team: TEAM, year }).catch(() => [])
  ]);
  const playerRows = buildPlayerRows(roster, stats, year);

  const rosterPlayers = normalizeRosterPlayers(rosterPayload);

  return { year, rosterPayload, rosterPlayers, stats };
}

export default async function PlayersPage({ searchParams }: { searchParams?: { year?: string } }) {
  const requestedYear = resolveSeasonYear(searchParams?.year);
  let snapshot = await fetchPlayersSnapshot(requestedYear);

  if (snapshot.rosterPlayers.length === 0 && snapshot.stats.length === 0) {
    for (const fallbackYear of SEASONS) {
      if (fallbackYear === requestedYear) continue;
      const candidate = await fetchPlayersSnapshot(fallbackYear);
      if (candidate.rosterPlayers.length > 0 || candidate.stats.length > 0) {
        snapshot = candidate;
        break;
      }
    }
  }

  return {
    year,
    rosterPayload,
    rosterPlayers: normalizeRosterPlayers(rosterPayload),
    stats
  };
}

async function resolveSnapshotForYear(requestedYear: number): Promise<PlayersSnapshot> {
  const requestedSnapshot = await fetchPlayersSnapshot(requestedYear);
  if (requestedSnapshot.rosterPlayers.length > 0 || requestedSnapshot.stats.length > 0) {
    return requestedSnapshot;
  }

  for (const fallbackYear of SEASONS) {
    if (fallbackYear === requestedYear) continue;
    const candidate = await fetchPlayersSnapshot(fallbackYear);
    if (candidate.rosterPlayers.length > 0 || candidate.stats.length > 0) {
      return candidate;
    }
  }

  return requestedSnapshot;
}

export default async function PlayersPage({ searchParams }: { searchParams?: { year?: string } }) {
  const requestedYear = resolveSeasonYear(searchParams?.year);
  const snapshot = await resolveSnapshotForYear(requestedYear);

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
              rosterCount: snapshot.rosterPlayers.length,
              statsCount: snapshot.stats.length,
              roster: snapshot.rosterPlayers,
              stats: snapshot.stats,
              rosterRaw: snapshot.rosterPayload
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
