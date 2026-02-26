import { cbbFetch } from '@/lib/api';
import { TEAM } from '@/lib/constants';

export const revalidate = 21600;

export default async function LineupsPage() {
  const year = new Date().getFullYear() + 1;
  const lineups = await cbbFetch<any[]>('/lineups/team', { team: TEAM, year }).catch(() => []);
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-uk-blue">Lineups</h1><div className="card">Top lineups loaded: {lineups.length}</div></div>;
}
