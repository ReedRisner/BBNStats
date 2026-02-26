'use client';
import { useQuery } from '@tanstack/react-query';

export const useGames = (year: number) => useQuery({ queryKey: ['games', year], queryFn: () => fetch(`/api/games?year=${year}`).then(r => r.json()) });
