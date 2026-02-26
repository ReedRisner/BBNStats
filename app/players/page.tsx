import Link from 'next/link';
import { cbbFetch } from '@/lib/api';
import { TEAM } from '@/lib/constants';

export const revalidate = 3600;

export default async function PlayersPage() {
  const year = new Date().getFullYear() + 1;
  const [roster, stats] = await Promise.all([
    cbbFetch<any[]>('/teams/roster', { team: TEAM, year }).catch(() => []),
    cbbFetch<any[]>('/stats/player/season', { team: TEAM, year }).catch(() => [])
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-uk-blue">Players</h1>
      <div className="overflow-x-auto card">
        <table className="min-w-full text-sm"><thead><tr><th>Name</th><th>Pos</th><th>PPG</th></tr></thead><tbody>
          {roster.map((p: any) => {
            const st = stats.find((s: any) => s.playerId === p.playerId);
            return <tr key={p.playerId}><td><Link href={`/players/${p.playerId}`}>{p.firstName} {p.lastName}</Link></td><td>{p.position}</td><td>{((st?.points || 0) / (st?.gamesPlayed || 1)).toFixed(1)}</td></tr>;
          })}
        </tbody></table>
      </div>
    </div>
  );
}
