'use client';
import { useQuery } from '@tanstack/react-query';

export const useRankings = (year: number) => useQuery({ queryKey: ['rankings', year], queryFn: () => fetch(`/api/rankings?year=${year}`).then(r => r.json()) });
