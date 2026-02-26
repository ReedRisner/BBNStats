import { PlayerSeasonStats, TeamSeasonStats } from '@/lib/types';

export function calculateAdvancedStats(player: PlayerSeasonStats, team: TeamSeasonStats) {
  const gp = player.gamesPlayed || 1;
  const mpg = player.minutes / gp;

  return {
    tsPct: player.points / (2 * (player.fga + 0.44 * player.fta)) || 0,
    efgPct: (player.fgm + 0.5 * player.tpm) / player.fga || 0,
    pps: player.points / player.fga || 0,
    astToRatio: player.assists / (player.turnovers || 1),
    stocks: (player.steals + player.blocks) / gp,
    ftRate: player.fta / player.fga || 0,
    threeRate: player.tpa / player.fga || 0,
    orbPct: player.offReb / ((player.minutes / (team.minutes || 1)) * (team.offReb || 1)) || 0,
    drbPct: player.defReb / ((player.minutes / (team.minutes || 1)) * (team.defReb || 1)) || 0,
    ppg: player.points / gp,
    rpg: player.rebounds / gp,
    apg: player.assists / gp,
    spg: player.steals / gp,
    bpg: player.blocks / gp,
    topg: player.turnovers / gp,
    mpg
  };
}

export function calculateFourFactors(team: TeamSeasonStats) {
  return {
    efgPct: (team.fgm + 0.5 * team.tpm) / team.fga,
    tovPct: team.turnovers / (team.fga + 0.44 * team.fta + team.turnovers),
    orbPct: team.offReb / (team.offReb + team.oppDefReb),
    ftRate: team.fta / team.fga
  };
}
