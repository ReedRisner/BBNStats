import { NextRequest, NextResponse } from 'next/server';
import { cbbFetch } from '@/lib/api';

export async function GET(request: NextRequest) {
  const year = new URL(request.url).searchParams.get('year') || String(new Date().getFullYear() + 1);
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
