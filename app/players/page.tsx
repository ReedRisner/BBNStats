import Link from 'next/link';
import { cbbFetch } from '@/lib/api';
import { resolveSeasonYear, TEAM } from '@/lib/constants';

export const revalidate = 3600;

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
      <div className="overflow-x-auto card">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Pos</th>
              <th>PPG</th>
            </tr>
          </thead>
          <tbody>
            {playerRows.map((player) => (
              <tr key={player.playerId}>
                <td>
                  <Link href={player.href}>{player.name}</Link>
                </td>
                <td>{player.position}</td>
                <td>{player.ppg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
