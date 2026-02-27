import Link from 'next/link';
import { cbbFetch } from '@/lib/api';
import { getCurrentSeasonYear, TEAM } from '@/lib/constants';

export const revalidate = 300;

export default async function SchedulePage() {
  const year = getCurrentSeasonYear();
  const games = await cbbFetch<any[]>('/games', { team: TEAM, year }).catch(() => []);
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-uk-blue">Schedule</h1><div className="card overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th>Date</th><th>Opponent</th><th>Status</th></tr></thead><tbody>{games.map((g) => <tr key={g.id}><td>{g.startDate}</td><td>{g.homeTeam===TEAM?g.awayTeam:g.homeTeam}</td><td><Link href={`/schedule/game/${g.id}`}>{g.status}</Link></td></tr>)}</tbody></table></div></div>;
}
