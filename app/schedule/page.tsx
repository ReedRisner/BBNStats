import Link from 'next/link';
import { cbbFetch } from '@/lib/api';
import { resolveSeasonYear, TEAM } from '@/lib/constants';

export const revalidate = 300;

function getSeasonFromStartDate(startDate?: string) {
  if (!startDate) return null;
  const gameDate = new Date(startDate);
  if (Number.isNaN(gameDate.getTime())) return null;
  const month = gameDate.getMonth();
  const year = gameDate.getFullYear();
  return month >= 10 ? year + 1 : year;
}

function formatScore(game: any) {
  const hasScore = typeof game.homePoints === 'number' && typeof game.awayPoints === 'number';
  if (!hasScore) return 'TBA';
  return `${game.awayPoints}-${game.homePoints}`;
}

export default async function SchedulePage({ searchParams }: { searchParams?: { year?: string } }) {
  const year = resolveSeasonYear(searchParams?.year);
  const games = await cbbFetch<any[]>('/games', { team: TEAM, year }).catch(() => []);

  const seasonGames = games.filter((game) => getSeasonFromStartDate(game.startDate) === year);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-uk-blue">Schedule</h1>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Opponent</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {seasonGames.map((g) => (
              <tr key={g.id}>
                <td>{g.startDate}</td>
                <td>{g.homeTeam === TEAM ? g.awayTeam : g.homeTeam}</td>
                <td>{formatScore(g)}</td>
                <td>
                  <Link href={`/schedule/game/${g.id}?year=${year}`}>{g.status}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
