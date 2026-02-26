import { cbbFetch } from '@/lib/api';
import { TEAM } from '@/lib/constants';

export const revalidate = 86400;

export default async function RecruitingPage() {
  const year = new Date().getFullYear() + 1;
  const recruits = await cbbFetch<any[]>('/recruiting/players', { team: TEAM, year }).catch(() => []);
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-uk-blue">Recruiting</h1><div className="card">Class size: {recruits.length}</div></div>;
}
