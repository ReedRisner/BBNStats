import { cbbFetch } from '@/lib/api';
import { resolveSeasonYear, TEAM } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildPlayerRows(roster: any[], stats: any[], year: number) {
  const rowsFromRoster = roster.map((player: any) => {
    const statLine = stats.find((stat: any) => stat.playerId === player.playerId);
    return {
      playerId: player.playerId,
      name: `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || 'Unknown Player',
      position: player.position || '—',
      ppg: ((statLine?.points || 0) / (statLine?.gamesPlayed || 1)).toFixed(1),
      href: `/players/${player.playerId}?year=${year}`
    };
  });

  const missingStatRows = stats
    .filter((stat: any) => !rowsFromRoster.some((row) => row.playerId === stat.playerId))
    .map((stat: any) => ({
      playerId: stat.playerId,
      name: stat.playerName || `Player ${stat.playerId}`,
      position: '—',
      ppg: ((stat.points || 0) / (stat.gamesPlayed || 1)).toFixed(1),
      href: `/players/${stat.playerId}?year=${year}`
    }));

  return [...rowsFromRoster, ...missingStatRows].sort((a, b) => Number(b.ppg) - Number(a.ppg));
}

export default async function PlayersPage({ searchParams }: { searchParams?: { year?: string } }) {
  const year = resolveSeasonYear(searchParams?.year);
  const [roster, stats] = await Promise.all([
    cbbFetch<any[]>('/teams/roster', { team: TEAM, year }).catch(() => []),
    cbbFetch<any[]>('/stats/player/season', { team: TEAM, year }).catch(() => [])
  ]);
  const playerRows = buildPlayerRows(roster, stats, year);

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
