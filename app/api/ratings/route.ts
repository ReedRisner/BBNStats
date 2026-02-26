import { NextRequest, NextResponse } from 'next/server';
import { cbbFetch } from '@/lib/api';

export async function GET(request: NextRequest) {
  const year = new URL(request.url).searchParams.get('year') || String(new Date().getFullYear() + 1);
  try {
    const [srs, adjusted, elo] = await Promise.all([
      cbbFetch('/ratings/srs', { team: 'Kentucky', year }),
      cbbFetch('/ratings/adjusted', { team: 'Kentucky', year }),
      cbbFetch('/ratings/elo', { team: 'Kentucky', year })
    ]);
    return NextResponse.json({ srs, adjusted, elo });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
  }
}
