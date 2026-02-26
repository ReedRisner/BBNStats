import { NextRequest } from 'next/server';
import { proxyEndpoint } from '@/app/api/_shared/proxy';
export async function GET(request: NextRequest) { return proxyEndpoint(request, '/recruiting/players', { team: 'Kentucky' }); }
