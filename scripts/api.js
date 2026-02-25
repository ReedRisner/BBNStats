export const API_BASE = 'https://api.collegebasketballdata.com';
export const API_KEY = '0/5PdgRvOqvcUo9VqUAcXFUEYqXxU3T26cGqt9c6FFArBcyqE4BD3njMuwOnQz+3';
export const TEAM_ID = 96;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  'x-api-key': API_KEY,
  Accept: 'application/json'
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
};

const request = async (path, params = {}) => {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const response = await fetch(url.toString(), { headers, cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return response.json();
};

const firstSuccessful = async (calls) => {
  const errors = [];
  for (const fn of calls) {
    try {
      return await fn();
    } catch (err) {
      errors.push(err.message);
    }
  }
  throw new Error(errors.join(' | '));
};

export const parseGames = (payload) => normalizeArray(payload).map((g) => {
  const teamScore = Number(g.teamPoints ?? g.teamScore ?? g.pointsFor ?? g.homeScore ?? 0);
  const oppScore = Number(g.opponentPoints ?? g.opponentScore ?? g.pointsAgainst ?? g.awayScore ?? 0);
  const rawResult = g.result || g.outcome || '';
  const result = rawResult || (teamScore > oppScore ? 'W' : (teamScore < oppScore ? 'L' : 'Pending'));
  return {
    date: g.date || g.gameDate || g.startDate || '',
    opponent: g.opponent || g.opponentName || g.awayTeam || g.homeTeam || 'Unknown',
    location: g.location || g.homeAway || g.venue || 'TBD',
    teamScore,
    oppScore,
    result
  };
}).filter((g) => g.opponent !== 'Unknown');

export const parseRoster = (payload) => normalizeArray(payload).map((p) => ({
  id: p.id || p.playerId || `${p.firstName || ''}-${p.lastName || ''}-${p.number || ''}`,
  name: p.name || p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
  number: p.jersey || p.number || '--',
  position: p.position || p.pos || 'N/A',
  year: p.class || p.year || p.experience || 'N/A',
  height: p.height || p.ht || 'N/A',
  weight: p.weight || p.wt || 'N/A'
}));

export const parsePlayerStats = (payload) => normalizeArray(payload).map((s) => ({
  name: s.name || s.player || s.playerName || 'Unknown',
  ppg: Number(s.ppg ?? s.pointsPerGame ?? s.points ?? 0),
  rpg: Number(s.rpg ?? s.reboundsPerGame ?? s.rebounds ?? 0),
  apg: Number(s.apg ?? s.assistsPerGame ?? s.assists ?? 0),
  mpg: Number(s.mpg ?? s.minutesPerGame ?? s.minutes ?? 0),
  fgPct: Number(s.fgPct ?? s.fieldGoalPct ?? s.fieldGoalPercentage ?? 0)
}));

export const parseTeamStats = (payload) => {
  const rows = normalizeArray(payload);
  if (!rows.length && payload && typeof payload === 'object') return payload;
  return rows[0] || {};
};

const loadFallbackData = async () => {
  const response = await fetch('../data/update.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('fallback unavailable');
  const data = await response.json();
  return {
    games: data.schedule || [],
    roster: data.players || [],
    playerStats: data.players || [],
    teamStats: data.teamStats || {}
  };
};

export const loadSeasonBundle = async (season) => {
  try {
    const [gamesRaw, rosterRaw, playerStatsRaw, teamStatsRaw] = await Promise.all([
      firstSuccessful([
        () => request('/games', { season, team: TEAM_ID }),
        () => request('/team/games', { season, teamId: TEAM_ID })
      ]),
      firstSuccessful([
        () => request('/roster', { season, team: TEAM_ID }),
        () => request('/team/roster', { season, teamId: TEAM_ID })
      ]),
      firstSuccessful([
        () => request('/stats/players', { season, team: TEAM_ID }),
        () => request('/players/stats', { season, team: TEAM_ID })
      ]),
      firstSuccessful([
        () => request('/stats/team', { season, team: TEAM_ID }),
        () => request('/team/stats', { season, teamId: TEAM_ID })
      ])
    ]);

    return {
      games: parseGames(gamesRaw),
      roster: parseRoster(rosterRaw),
      playerStats: parsePlayerStats(playerStatsRaw),
      teamStats: parseTeamStats(teamStatsRaw),
      source: 'live-api'
    };
  } catch (error) {
    const fallback = await loadFallbackData();
    return {
      games: parseGames(fallback.games),
      roster: parseRoster(fallback.roster),
      playerStats: parsePlayerStats(fallback.playerStats),
      teamStats: parseTeamStats(fallback.teamStats),
      source: 'fallback-json',
      error
    };
  }
};

export const seasonOptions = (start = 2015) => {
  const now = new Date().getFullYear();
  return Array.from({ length: now - start + 1 }, (_, i) => now - i);
};
