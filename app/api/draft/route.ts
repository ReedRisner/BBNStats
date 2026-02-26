import { NextRequest, NextResponse } from 'next/server';
import { cbbFetch } from '@/lib/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get('team') || 'Kentucky';
  try {
    const [teams, picks] = await Promise.all([cbbFetch('/draft/teams', { team }), cbbFetch('/draft/picks', { team })]);
    return NextResponse.json({ teams, picks });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch draft data' }, { status: 500 });
  }
}
