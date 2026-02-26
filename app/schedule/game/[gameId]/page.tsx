import { cbbFetch } from '@/lib/api';

export const revalidate = 120;

export default async function GamePage({ params }: { params: { gameId: string } }) {
  const [teams, players, plays] = await Promise.all([
    cbbFetch<any[]>('/games/teams', { gameId: params.gameId }).catch(() => []),
    cbbFetch<any[]>('/games/players', { gameId: params.gameId }).catch(() => []),
    cbbFetch<any[]>(`/plays/game/${params.gameId}`).catch(() => [])
  ]);
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-uk-blue">Game {params.gameId}</h1><div className="card"><pre className="overflow-x-auto text-xs">{JSON.stringify({ teams, players: players.slice(0,10), plays: plays.slice(0,20) }, null, 2)}</pre></div></div>;
}
