import { NextRequest, NextResponse } from 'next/server';
import { cbbFetch } from '@/lib/api';

export async function proxyEndpoint(request: NextRequest, endpoint: string, defaults: Record<string, string> = {}) {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = { ...defaults };
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  try {
    const data = await cbbFetch(endpoint, params);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: `Failed to fetch ${endpoint}` }, { status: 500 });
  }
}
