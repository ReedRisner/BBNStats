import { cbbFetch } from '@/lib/api';
import { resolveSeasonYear, TEAM } from '@/lib/constants';
import { calculateFourFactors } from '@/lib/stats-calculations';
import { pickSeasonEntry } from '@/lib/utils';

export const revalidate = 3600;

export default async function TeamStatsPage({ searchParams }: { searchParams?: { year?: string } }) {
  const year = resolveSeasonYear(searchParams?.year);
  const [teamStats] = await Promise.all([
    cbbFetch<any[]>('/stats/team/season', { team: TEAM, year }).catch(() => [])
  ]);
  const selectedTeamStats = pickSeasonEntry(teamStats, year);
  const factors = selectedTeamStats ? calculateFourFactors(selectedTeamStats) : null;
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-uk-blue">Team Stats</h1><div className="card"><pre className="text-xs">{JSON.stringify({ team: selectedTeamStats, factors }, null, 2)}</pre></div></div>;
}
