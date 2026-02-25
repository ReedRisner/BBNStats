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
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
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

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const parseGames = (payload) => normalizeArray(payload).map((g) => {
  const teamScore = toNum(g.teamPoints ?? g.teamScore ?? g.pointsFor ?? g.homeScore);
  const oppScore = toNum(g.opponentPoints ?? g.opponentScore ?? g.pointsAgainst ?? g.awayScore);
  const rawResult = g.result || g.outcome || '';
  const result = rawResult || (teamScore > oppScore ? 'W' : (teamScore < oppScore ? 'L' : 'Pending'));
  return {
    date: g.date || g.gameDate || g.startDate || '',
    opponent: g.opponent || g.opponentName || g.awayTeam || g.homeTeam || g.opponent_team || 'Unknown',
    location: g.location || g.homeAway || g.venue || g.site || 'TBD',
    teamScore,
    oppScore,
    result
  };
}).filter((g) => g.opponent !== 'Unknown');

export const parseRoster = (payload) => normalizeArray(payload).map((p) => ({
  id: p.id || p.playerId || `${p.firstName || ''}-${p.lastName || ''}-${p.number || p.jersey || ''}`,
  name: p.name || p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
  number: p.jersey || p.number || '--',
  position: p.position || p.pos || p.primaryPosition || 'N/A',
  year: p.class || p.year || p.experience || p.eligibility || 'N/A',
  height: p.height || p.ht || 'N/A',
  weight: p.weight || p.wt || 'N/A'
}));

export const parsePlayerStats = (payload) => normalizeArray(payload).map((s) => ({
  name: s.name || s.player || s.playerName || s.fullName || 'Unknown',
  ppg: toNum(s.ppg ?? s.pointsPerGame ?? s.points),
  rpg: toNum(s.rpg ?? s.reboundsPerGame ?? s.rebounds),
  apg: toNum(s.apg ?? s.assistsPerGame ?? s.assists),
  mpg: toNum(s.mpg ?? s.minutesPerGame ?? s.minutes),
  fgPct: toNum(s.fgPct ?? s.fieldGoalPct ?? s.fieldGoalPercentage)
}));

export const parseTeamStats = (payload) => {
  const rows = normalizeArray(payload);
  if (!rows.length && payload && typeof payload === 'object') return payload;
  return rows[0] || {};
};

const parseSeasonCache = (raw, season) => {
  if (!raw || typeof raw !== 'object') return null;
  const seasonNode = raw[String(season)] || raw[season];

  // Preferred cache shape written by scripts/fetch_daily_stats.py
  if (seasonNode?.games || seasonNode?.roster || seasonNode?.playerStats) {
    return {
      games: parseGames(seasonNode.games || []),
      roster: parseRoster(seasonNode.roster || []),
      playerStats: parsePlayerStats(seasonNode.playerStats || []),
      teamStats: parseTeamStats(seasonNode.teamStats || {}),
      source: 'cache-json'
    };
  }

  // Older shape had only stat cards/rankings.
  if (seasonNode?.stats || seasonNode?.rankings) {
    const teamStats = Object.fromEntries(Object.entries(seasonNode.stats || {}).map(([k, v]) => [k, v?.value ?? '0']));
    return { games: [], roster: [], playerStats: [], teamStats, source: 'cache-json' };
  }

  return null;
};

const loadCacheData = async (season) => {
  const paths = ['/data/update.json', '../data/update.json'];
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) continue;
      const data = await response.json();
      const parsed = parseSeasonCache(data, season);
      if (parsed) return parsed;
    } catch (_) {
      // continue
    }
  }
  throw new Error('cache unavailable');
};

export const loadSeasonBundle = async (season) => {
  try {
    const [gamesRaw, rosterRaw, playerStatsRaw, teamStatsRaw] = await Promise.all([
      firstSuccessful([
        () => request('/games', { season, team: TEAM_ID }),
        () => request('/games', { year: season, team: TEAM_ID }),
        () => request('/team/games', { season, teamId: TEAM_ID })
      ]),
      firstSuccessful([
        () => request('/roster', { season, team: TEAM_ID }),
        () => request('/team/roster', { season, teamId: TEAM_ID }),
        () => request('/players', { season, team: TEAM_ID })
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
    const cache = await loadCacheData(season);
    return { ...cache, source: `${cache.source} (live unavailable)`, error };
  }
};

export const seasonOptions = (start = 2015) => {
  const now = new Date().getFullYear();
  return Array.from({ length: now - start + 1 }, (_, i) => now - i);
};
