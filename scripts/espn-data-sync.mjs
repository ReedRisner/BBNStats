#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const TEAM_ID = '96';
const TEAM_NAME = 'Kentucky';
const API_BASE = 'https://api.collegebasketballdata.com';
const API_KEY = process.env.COLLEGE_BASKETBALL_DATA_API_KEY;
const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, 'data');

if (!API_KEY) {
  throw new Error('Missing COLLEGE_BASKETBALL_DATA_API_KEY environment variable.');
}

const fetchJson = async (pathName, params = {}) => {
  const url = new URL(`${API_BASE}${pathName}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'BBNStatsDataSync/2.0',
      Accept: 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      'x-api-key': API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
};

const firstSuccessful = async (calls) => {
  const errors = [];
  for (const call of calls) {
    try {
      return await call();
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(errors.join(' | '));
};

const normalizeArray = (value) => (Array.isArray(value) ? value : (value?.data || value?.results || []));

const seasonLabel = (season) => `${season}-${Number(season) + 1}`;

const normalize = (name = '') => name.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const formatScheduleGame = (game) => {
  const date = parseDate(game.date || game.startDate || game.gameDate);
  const homeAway = String(game.homeAway || game.venue || '').toLowerCase();
  const isAway = homeAway.includes('away');
  const venue = isAway ? 'away' : 'home';
  const opponentName = game.opponentName || game.opponent || game.awayTeam || game.homeTeam || 'TBD';
  const prefixedOpponent = /^vs\s|^at\s/i.test(opponentName)
    ? opponentName
    : `${isAway ? 'at' : 'vs'} ${opponentName}`;

  const teamScore = Number(game.teamScore ?? game.teamPoints ?? game.pointsFor ?? game.homeScore ?? 0);
  const oppScore = Number(game.opponentScore ?? game.opponentPoints ?? game.pointsAgainst ?? game.awayScore ?? 0);
  const completed = Number.isFinite(teamScore) && Number.isFinite(oppScore) && (teamScore > 0 || oppScore > 0);

  return {
    date: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    day: date.toLocaleDateString('en-US', { weekday: 'long' }),
    opponent: prefixedOpponent,
    location: game.location || game.venueName || game.venue || 'TBD',
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    result: completed
      ? `${teamScore > oppScore ? 'W' : 'L'} ${teamScore}-${oppScore}`
      : (game.status || game.result || game.outcome || 'TBD'),
    venue,
    conference: Boolean(game.conferenceGame ?? game.isConferenceGame ?? false),
    exh: Boolean(game.exhibition ?? false),
    opponentRank: game.opponentRank || game.rank || undefined,
    eventId: String(game.id || game.eventId || game.gameId || ''),
    rawDate: date.toISOString()
  };
};

const mapRosterPlayer = (athlete, fallback = {}) => ({
  ...fallback,
  number: String(athlete?.jersey || athlete?.number || fallback.number || ''),
  name: athlete?.name || athlete?.fullName || `${athlete?.firstName || ''} ${athlete?.lastName || ''}`.trim() || fallback.name || 'Unknown Player',
  grade: athlete?.class || athlete?.year || athlete?.experience || fallback.grade || 'N/A',
  pos: athlete?.position || athlete?.pos || fallback.pos || 'N/A',
  ht: athlete?.height || athlete?.displayHeight || fallback.ht || 'N/A',
  wt: athlete?.weight || athlete?.displayWeight || fallback.wt || 'N/A',
  photo: athlete?.photo || athlete?.headshot || fallback.photo || ''
});

const toBoxscoreRow = (playerStats) => ({
  number: String(playerStats?.number || playerStats?.jersey || ''),
  min: Number(playerStats?.min ?? playerStats?.minutes ?? 0),
  pts: Number(playerStats?.pts ?? playerStats?.points ?? 0),
  reb: Number(playerStats?.reb ?? playerStats?.rebounds ?? 0),
  ast: Number(playerStats?.ast ?? playerStats?.assists ?? 0),
  stl: Number(playerStats?.stl ?? playerStats?.steals ?? 0),
  blk: Number(playerStats?.blk ?? playerStats?.blocks ?? 0),
  to: Number(playerStats?.to ?? playerStats?.turnovers ?? 0),
  fgm: Number(playerStats?.fgm ?? playerStats?.fieldGoalsMade ?? 0),
  fga: Number(playerStats?.fga ?? playerStats?.fieldGoalAttempts ?? 0),
  threeFgm: Number(playerStats?.threeFgm ?? playerStats?.threePointFieldGoalsMade ?? 0),
  threeFga: Number(playerStats?.threeFga ?? playerStats?.threePointFieldGoalAttempts ?? 0),
  ftm: Number(playerStats?.ftm ?? playerStats?.freeThrowsMade ?? 0),
  fta: Number(playerStats?.fta ?? playerStats?.freeThrowAttempts ?? 0)
});

async function main() {
  const playersPath = path.join(DATA_DIR, 'players.json');
  const gameLogsPath = path.join(DATA_DIR, 'gameLogs.json');
  const updatePath = path.join(DATA_DIR, 'update.json');

  const existingPlayers = JSON.parse(await fs.readFile(playersPath, 'utf8'));
  const existingGameLogs = JSON.parse(await fs.readFile(gameLogsPath, 'utf8'));

  const seasons = Object.keys(existingPlayers?.seasons || {}).sort((a, b) => Number(b) - Number(a));
  const season = seasons[0];
  if (!season) throw new Error('No seasons found in players.json');

  const [gamesPayload, rosterPayload] = await Promise.all([
    firstSuccessful([
      () => fetchJson('/games', { season, team: TEAM_ID }),
      () => fetchJson('/games', { season, team: TEAM_NAME }),
      () => fetchJson('/team/games', { season, teamId: TEAM_ID })
    ]),
    firstSuccessful([
      () => fetchJson('/roster', { season, team: TEAM_ID }),
      () => fetchJson('/roster', { season, team: TEAM_NAME }),
      () => fetchJson('/team/roster', { season, teamId: TEAM_ID })
    ])
  ]);

  const gamesRaw = normalizeArray(gamesPayload);
  const schedule = gamesRaw.map(formatScheduleGame);
  await fs.writeFile(path.join(DATA_DIR, `${season}-schedule.json`), `${JSON.stringify(schedule, null, 2)}\n`);

  const oldPlayers = existingPlayers.seasons[season]?.players || [];
  const oldByName = new Map(oldPlayers.map((p) => [normalize(p.name), p]));
  const rosterPlayers = normalizeArray(rosterPayload).map((athlete) => {
    const name = athlete?.name || athlete?.fullName || `${athlete?.firstName || ''} ${athlete?.lastName || ''}`.trim();
    return mapRosterPlayer(athlete, oldByName.get(normalize(name)));
  });

  existingPlayers.seasons[season].players = rosterPlayers;
  await fs.writeFile(playersPath, `${JSON.stringify(existingPlayers, null, 2)}\n`);

  const completed = schedule.filter((game) => game.result.startsWith('W ') || game.result.startsWith('L '));

  const previousSeasonGames = existingGameLogs?.seasons?.[season]?.games || [];
  const byKey = new Map(previousSeasonGames.map((g) => [`${g.opponent}-${g.date}`, g]));
  const games = [];

  for (const game of completed) {
    const key = `${game.opponent.replace(/^at\s+|^vs\s+/i, '')}-${(game.rawDate || '').slice(0, 10)}`;
    const existing = byKey.get(key);

    const embeddedBox = normalizeArray(
      gamesRaw.find((g) => String(g.id || g.eventId || g.gameId || '') === String(game.eventId || ''))?.boxscore
      || gamesRaw.find((g) => String(g.id || g.eventId || g.gameId || '') === String(game.eventId || ''))?.playerStats
    ).map(toBoxscoreRow).filter((row) => row.number !== '');

    games.push({
      opponent: game.opponent.replace(/^at\s+|^vs\s+/i, ''),
      date: (game.rawDate || '').slice(0, 10),
      boxscore: embeddedBox.length ? embeddedBox : (existing?.boxscore || []),
      result: game.result
    });
  }

  existingGameLogs.seasons[season] = { games };
  await fs.writeFile(gameLogsPath, `${JSON.stringify(existingGameLogs, null, 2)}\n`);

  const wins = completed.filter((g) => g.result.startsWith('W')).length;
  const losses = completed.filter((g) => g.result.startsWith('L')).length;

  const previousUpdate = JSON.parse(await fs.readFile(updatePath, 'utf8'));
  previousUpdate[season] = {
    ...(previousUpdate[season] || {}),
    rankings: {
      ...(previousUpdate[season]?.rankings || {}),
      'Overall Record': `${wins}-${losses}`
    },
    metadata: {
      ...(previousUpdate[season]?.metadata || {}),
      season: seasonLabel(season),
      generatedAt: new Date().toISOString(),
      source: 'CollegeBasketballData APIs'
    }
  };

  await fs.writeFile(updatePath, `${JSON.stringify(previousUpdate, null, 2)}\n`);
  console.log(`Updated season ${season}: ${schedule.length} games, ${rosterPlayers.length} players, ${games.length} game logs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
