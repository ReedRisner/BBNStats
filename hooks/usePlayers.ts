'use client';
import { useQuery } from '@tanstack/react-query';

export const usePlayers = (year: number) => useQuery({ queryKey: ['players', year], queryFn: () => fetch(`/api/players?year=${year}`).then(r => r.json()) });
