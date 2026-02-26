import { NextRequest, NextResponse } from 'next/server';
import { cbbFetch } from '@/lib/api';

export async function GET(request: NextRequest) {
  const year = new URL(request.url).searchParams.get('year') || String(new Date().getFullYear() + 1);
  try {
    const [kentucky, allTeams] = await Promise.all([
      cbbFetch('/stats/team/season', { team: 'Kentucky', year }),
      cbbFetch('/stats/team/season', { year })
    ]);
    return NextResponse.json({ kentucky, allTeams });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch team stats' }, { status: 500 });
  }
}
