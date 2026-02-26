'use client';
import { useQuery } from '@tanstack/react-query';

export const useTeamStats = (year: number) => useQuery({ queryKey: ['team-stats', year], queryFn: () => fetch(`/api/team-stats?year=${year}`).then(r => r.json()) });
