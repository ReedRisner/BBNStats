import { cbbFetch } from '@/lib/api';
import { TEAM } from '@/lib/constants';

export const revalidate = 3600;

export default async function PlayerPage({ params }: { params: { playerId: string } }) {
  const year = new Date().getFullYear() + 1;
  const [roster, stats, games] = await Promise.all([
    cbbFetch<any[]>('/teams/roster', { team: TEAM, year }).catch(() => []),
    cbbFetch<any[]>('/stats/player/season', { team: TEAM, year }).catch(() => []),
    cbbFetch<any[]>('/games/players', { team: TEAM, year }).catch(() => [])
  ]);

  const player = roster.find((p) => String(p.playerId) === params.playerId);
  const stat = stats.find((s) => String(s.playerId) === params.playerId);
  const logs = games.filter((g) => String(g.playerId) === params.playerId).slice(0, 20);

  return <div className="space-y-4"><h1 className="text-2xl font-bold text-uk-blue">{player?.firstName} {player?.lastName}</h1><div className="card">PPG: {((stat?.points || 0)/(stat?.gamesPlayed||1)).toFixed(1)}</div><div className="card"><h2 className="font-semibold">Game Log</h2><pre className="overflow-x-auto text-xs">{JSON.stringify(logs, null, 2)}</pre></div></div>;
}
