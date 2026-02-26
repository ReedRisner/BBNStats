'use client';
import { useQuery } from '@tanstack/react-query';

export const useLineups = (year: number) => useQuery({ queryKey: ['lineups', year], queryFn: () => fetch(`/api/lineups?year=${year}`).then(r => r.json()) });
