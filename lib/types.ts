export type GameStatus = 'scheduled' | 'in_progress' | 'final' | string;

export interface GameInfo {
  id: number;
  startDate: string;
  status: GameStatus;
  homeTeam: string;
  awayTeam: string;
  homePoints?: number;
  awayPoints?: number;
  conferenceGame?: boolean;
  neutralSite?: boolean;
  venue?: { name?: string; city?: string; state?: string };
}

export interface PlayerSeasonStats {
  playerId: number;
  playerName: string;
  season: number;
  gamesPlayed: number;
  gamesStarted: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  offReb: number;
  defReb: number;
}

export interface TeamSeasonStats {
  team: string;
  season: number;
  minutes: number;
  points: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  offReb: number;
  defReb: number;
  oppDefReb: number;
}

export interface TeamRosterPlayer {
  playerId: number;
  firstName: string;
  lastName: string;
  jersey?: string;
  position?: string;
  height?: string;
  weight?: number;
  year?: string;
  hometown?: string;
}
