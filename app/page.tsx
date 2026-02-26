import { cbbFetch } from '@/lib/api';
import { TEAM } from '@/lib/constants';

export const revalidate = 300;

export default async function DashboardPage() {
  const year = new Date().getFullYear() + 1;
  const [games, rankings, players, teamStats] = await Promise.all([
    cbbFetch<any[]>('/games', { team: TEAM, year }).catch(() => []),
    cbbFetch<any[]>('/rankings', { team: TEAM, year }).catch(() => []),
    cbbFetch<any[]>('/stats/player/season', { team: TEAM, year }).catch(() => []),
    cbbFetch<any[]>('/stats/team/season', { team: TEAM, year }).catch(() => [])
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-uk-blue">Kentucky Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="card"><h2 className="font-semibold">Games</h2><p>{games.length} total games loaded.</p></section>
        <section className="card"><h2 className="font-semibold">Rankings</h2><p>{rankings.length} ranking entries.</p></section>
        <section className="card"><h2 className="font-semibold">Leaders</h2><p>{players[0]?.playerName || 'No data yet'}</p></section>
      </div>
      <section className="card">
        <h2 className="mb-2 font-semibold">Team Snapshot</h2>
        <pre className="overflow-x-auto text-xs">{JSON.stringify(teamStats[0] || {}, null, 2)}</pre>
      </section>
    </div>
  );
}
