#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const TEAM_ID = '96';
const SPORT = 'basketball';
const LEAGUE = 'mens-college-basketball';
const API_BASE = `https://site.api.espn.com/apis/site/v2/sports/${SPORT}/${LEAGUE}`;
const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, 'data');

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'BBNStatsDataSync/1.0',
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
};

const scoreValue = (team) => {
  const raw = team?.score;
  if (typeof raw === 'object' && raw !== null) return String(raw.value ?? raw.displayValue ?? '0');
  return String(raw ?? '0');
};

const seasonLabel = (season) => `${season}-${Number(season) + 1}`;

const mapScheduleGame = (event) => {
  const competition = event?.competitions?.[0] ?? {};
  const competitors = competition?.competitors ?? [];
  const uk = competitors.find((item) => item?.team?.id === TEAM_ID) ?? {};
  const opponent = competitors.find((item) => item?.team?.id !== TEAM_ID) ?? {};
  const statusType = competition?.status?.type ?? {};
  const completed = Boolean(statusType.completed);
  const ukWon = completed ? Boolean(uk?.winner) : null;

  const eventDate = new Date(event?.date ?? Date.now());
  const isAway = uk?.homeAway === 'away';
  const venue = isAway ? 'away' : 'home';
  const matchupPrefix = isAway ? 'at' : 'vs';

  return {
    date: eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    day: eventDate.toLocaleDateString('en-US', { weekday: 'long' }),
    opponent: `${matchupPrefix} ${opponent?.team?.displayName ?? 'TBD'}`,
    location: competition?.venue?.fullName ?? (competition?.neutralSite ? 'Neutral Site' : 'TBD'),
    time: eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    result: completed ? `${ukWon ? 'W' : 'L'} ${scoreValue(uk)}-${scoreValue(opponent)}` : (statusType.shortDetail || statusType.description || 'TBD'),
    venue,
    conference: Boolean(event?.seasonType?.type === 2),
    exh: false,
    opponentRank: opponent?.curatedRank?.current || undefined,
    eventId: event?.id,
    rawDate: event?.date
  };
};

const mapRosterPlayer = (athlete, fallback = {}) => ({
  ...fallback,
  number: athlete?.jersey || athlete?.displayJersey || fallback.number || '',
  name: athlete?.displayName || fallback.name || 'Unknown Player',
  grade: athlete?.experience?.displayValue || fallback.grade || 'N/A',
  pos: athlete?.position?.abbreviation || fallback.pos || 'N/A',
  ht: athlete?.displayHeight || fallback.ht || 'N/A',
  wt: athlete?.displayWeight || fallback.wt || 'N/A',
  photo: athlete?.headshot?.href || athlete?.headshot || fallback.photo || ''
});

const getStatValue = (stats = [], names = []) => {
  const hit = stats.find((item) => names.includes(item?.name));
  return hit?.displayValue || hit?.value || null;
};

const toBoxscoreRow = (athlete) => {
  const stats = athlete?.statistics ?? [];
  return {
    number: athlete?.athlete?.jersey || '',
    min: Number(getStatValue(stats, ['minutes']) ?? 0),
    pts: Number(getStatValue(stats, ['points']) ?? 0),
    reb: Number(getStatValue(stats, ['rebounds']) ?? 0),
    ast: Number(getStatValue(stats, ['assists']) ?? 0),
    stl: Number(getStatValue(stats, ['steals']) ?? 0),
    blk: Number(getStatValue(stats, ['blocks']) ?? 0),
    to: Number(getStatValue(stats, ['turnovers']) ?? 0),
    fgm: Number(getStatValue(stats, ['fieldGoalsMade']) ?? 0),
    fga: Number(getStatValue(stats, ['fieldGoalAttempts']) ?? 0),
    threeFgm: Number(getStatValue(stats, ['threePointFieldGoalsMade']) ?? 0),
    threeFga: Number(getStatValue(stats, ['threePointFieldGoalAttempts']) ?? 0),
    ftm: Number(getStatValue(stats, ['freeThrowsMade']) ?? 0),
    fta: Number(getStatValue(stats, ['freeThrowAttempts']) ?? 0)
  };
};

const normalize = (name = '') => name.toLowerCase().replace(/[^a-z0-9]/g, '');

async function main() {
  const playersPath = path.join(DATA_DIR, 'players.json');
  const gameLogsPath = path.join(DATA_DIR, 'gameLogs.json');
  const updatePath = path.join(DATA_DIR, 'update.json');

  const existingPlayers = JSON.parse(await fs.readFile(playersPath, 'utf8'));
  const existingGameLogs = JSON.parse(await fs.readFile(gameLogsPath, 'utf8'));

  const seasons = Object.keys(existingPlayers?.seasons || {}).sort((a, b) => Number(b) - Number(a));
  const season = seasons[0];
  if (!season) throw new Error('No seasons found in players.json');

  const [scheduleResponse, rosterResponse] = await Promise.all([
    fetchJson(`${API_BASE}/teams/${TEAM_ID}/schedule?season=${season}`),
    fetchJson(`${API_BASE}/teams/${TEAM_ID}/roster`)
  ]);

  const events = scheduleResponse?.events || [];
  const schedule = events.map(mapScheduleGame);
  await fs.writeFile(path.join(DATA_DIR, `${season}-schedule.json`), `${JSON.stringify(schedule, null, 2)}\n`);

  const oldPlayers = existingPlayers.seasons[season]?.players || [];
  const oldByName = new Map(oldPlayers.map((p) => [normalize(p.name), p]));
  const rosterPlayers = (rosterResponse?.athletes || []).map((athlete) => {
    const old = oldByName.get(normalize(athlete?.displayName));
    return mapRosterPlayer(athlete, old);
  });
  existingPlayers.seasons[season].players = rosterPlayers;
  await fs.writeFile(playersPath, `${JSON.stringify(existingPlayers, null, 2)}\n`);

  const completed = schedule.filter((game) => game.result.startsWith('W ') || game.result.startsWith('L '));
  const games = [];

  for (const game of completed) {
    if (!game.eventId) continue;

    try {
      const summary = await fetchJson(`${API_BASE}/summary?event=${game.eventId}`);
      const playersBlocks = summary?.boxscore?.players || [];
      const ukBlock = playersBlocks.find((block) => String(block?.team?.id) === TEAM_ID);
      const athleteRows = (ukBlock?.statistics || []).flatMap((section) => section?.athletes || []);
      const boxscore = athleteRows.map(toBoxscoreRow).filter((row) => row.number !== '');

      if (boxscore.length) {
        games.push({
          opponent: game.opponent.replace(/^at\s+|^vs\s+/i, ''),
          date: (game.rawDate || '').slice(0, 10),
          boxscore,
          result: game.result
        });
      }
    } catch (error) {
      console.warn(`Unable to fetch boxscore for event ${game.eventId}:`, error.message);
    }
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
      season: seasonLabel(season),
      generatedAt: new Date().toISOString(),
      source: 'ESPN Team APIs'
    }
  };

  await fs.writeFile(updatePath, `${JSON.stringify(previousUpdate, null, 2)}\n`);
  console.log(`Updated season ${season}: ${schedule.length} games, ${rosterPlayers.length} players, ${games.length} boxscores`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
