import { NextRequest, NextResponse } from 'next/server';
import { cbbFetch } from '@/lib/api';
import { getCurrentSeasonYear } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const year = new URL(request.url).searchParams.get('year') || String(getCurrentSeasonYear());
  try {
    const [roster, stats, shooting] = await Promise.all([
      cbbFetch('/teams/roster', { team: 'Kentucky', year }),
      cbbFetch('/stats/player/season', { team: 'Kentucky', year }),
      cbbFetch('/stats/player/shooting/season', { team: 'Kentucky', year })
    ]);
    return NextResponse.json({ roster, stats, shooting });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}
