import { cbbFetch } from '@/lib/api';
import { TEAM } from '@/lib/constants';

export const revalidate = 86400;

export default async function DraftPage() {
  const picks = await cbbFetch<any[]>('/draft/picks', { team: TEAM }).catch(() => []);
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-uk-blue">Draft History</h1><div className="card">Total picks: {picks.length}</div></div>;
}
