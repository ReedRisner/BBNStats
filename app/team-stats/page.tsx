import { cbbFetch } from '@/lib/api';
import { getCurrentSeasonYear, TEAM } from '@/lib/constants';
import { calculateFourFactors } from '@/lib/stats-calculations';

export const revalidate = 3600;

export default async function TeamStatsPage() {
  const year = getCurrentSeasonYear();
  const [teamStats] = await Promise.all([
    cbbFetch<any[]>('/stats/team/season', { team: TEAM, year }).catch(() => [])
  ]);
  const factors = teamStats[0] ? calculateFourFactors(teamStats[0]) : null;
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-uk-blue">Team Stats</h1><div className="card"><pre className="text-xs">{JSON.stringify({ team: teamStats[0], factors }, null, 2)}</pre></div></div>;
}
