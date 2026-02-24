const API_BASE = 'https://api.collegebasketballdata.com';
const API_KEY = '0/5PdgRvOqvcUo9VqUAcXFUEYqXxU3T26cGqt9c6FFArBcyqE4BD3njMuwOnQz+3';
const TEAM_HINTS = ['Kentucky', 'UK', 'Wildcats'];
const TEAM_ID = 96;
const START_YEAR = 2000;

const state = {
  selectedSeason: new Date().getFullYear(),
  statuses: [],
  teamMeta: null,
  games: [],
  players: [],
  stats: []
};

const addStatus = (name, value) => state.statuses.push({ name, value });

const request = async (path, params = {}) => {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.set(k, v));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'x-api-key': API_KEY,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
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

const normalizeArray = (value) => Array.isArray(value) ? value : (value?.data || value?.results || []);

const parseGames = (payload) => {
  const rows = normalizeArray(payload);
  return rows.map((g) => ({
    date: g.date || g.gameDate || g.startDate || 'TBD',
    opponent: g.opponent || g.opponentName || g.awayTeam || g.homeTeam || 'Unknown',
    location: g.location || g.venue || g.homeAway || g.neutralSite ? 'Neutral' : 'TBD',
    teamScore: Number(g.teamPoints ?? g.teamScore ?? g.pointsFor ?? g.homeScore ?? 0),
    oppScore: Number(g.opponentPoints ?? g.opponentScore ?? g.pointsAgainst ?? g.awayScore ?? 0),
    result: g.result || g.outcome || ''
  })).filter((g) => g.opponent !== 'Unknown');
};

const parseRoster = (payload) => normalizeArray(payload).map((p) => ({
  name: p.name || p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
  number: p.jersey || p.number || '--',
  position: p.position || p.pos || 'N/A',
  class: p.class || p.year || p.experience || 'N/A'
}));

const parseStats = (payload) => normalizeArray(payload).map((s) => ({
  name: s.name || s.player || s.playerName || 'Unknown',
  ppg: Number(s.ppg ?? s.pointsPerGame ?? s.points ?? 0),
  rpg: Number(s.rpg ?? s.reboundsPerGame ?? s.rebounds ?? 0),
  apg: Number(s.apg ?? s.assistsPerGame ?? s.assists ?? 0)
}));

const loadSeasonData = async (season) => {
  state.statuses = [];
  addStatus('Season', `${season}-${season + 1}`);

  const [gamesPayload, rosterPayload, statsPayload] = await Promise.all([
    firstSuccessful([
      () => request('/games', { season, team: TEAM_ID }),
      () => request('/games', { year: season, team: 'Kentucky' }),
      () => request('/team/games', { season, teamId: TEAM_ID })
    ]),
    firstSuccessful([
      () => request('/roster', { season, team: TEAM_ID }),
      () => request('/team/roster', { season, teamId: TEAM_ID }),
      () => request('/players', { season, team: 'Kentucky' })
    ]),
    firstSuccessful([
      () => request('/stats/players', { season, team: TEAM_ID }),
      () => request('/players/stats', { season, team: 'Kentucky' }),
      () => request('/team/stats', { season, teamId: TEAM_ID })
    ])
  ]);

  state.games = parseGames(gamesPayload);
  state.players = parseRoster(rosterPayload);
  state.stats = parseStats(statsPayload);

  addStatus('Games endpoint', 'Connected');
  addStatus('Roster endpoint', 'Connected');
  addStatus('Stats endpoint', 'Connected');
};

const calcKPIs = () => {
  const finished = state.games.filter((g) => g.teamScore > 0 || g.oppScore > 0);
  const wins = finished.filter((g) => g.teamScore > g.oppScore).length;
  const losses = finished.filter((g) => g.teamScore < g.oppScore).length;
  const avgPPG = finished.length ? (finished.reduce((a, g) => a + g.teamScore, 0) / finished.length) : 0;
  const avgMargin = finished.length ? (finished.reduce((a, g) => a + (g.teamScore - g.oppScore), 0) / finished.length) : 0;
  return { wins, losses, games: state.games.length, avgPPG, avgMargin };
};

const render = () => {
  const kpi = calcKPIs();
  document.getElementById('recordKpi').textContent = `${kpi.wins}-${kpi.losses}`;
  document.getElementById('gamesKpi').textContent = String(kpi.games);
  document.getElementById('ppgKpi').textContent = kpi.avgPPG.toFixed(1);
  document.getElementById('marginKpi').textContent = `${kpi.avgMargin >= 0 ? '+' : ''}${kpi.avgMargin.toFixed(1)}`;

  document.getElementById('snapshotText').textContent = `Kentucky data for ${state.selectedSeason}-${state.selectedSeason + 1}, sourced directly from CollegeBasketballData.`;

  const facts = [
    ['Roster entries', state.players.length],
    ['Player stat rows', state.stats.length],
    ['Loaded at', new Date().toLocaleString()]
  ];
  const factsTarget = document.getElementById('snapshotFacts');
  factsTarget.innerHTML = facts.map(([k, v]) => `<li><strong>${k}</strong><span>${v}</span></li>`).join('');

  const statusTarget = document.getElementById('statusList');
  statusTarget.innerHTML = state.statuses.map((s) => `<li><strong>${s.name}</strong><span>${s.value}</span></li>`).join('');

  const gamesBody = document.getElementById('gamesTableBody');
  gamesBody.innerHTML = state.games.slice(0, 30).map((g) => {
    const resultClass = g.teamScore > g.oppScore ? 'result-win' : (g.teamScore < g.oppScore ? 'result-loss' : '');
    return `<tr>
      <td>${new Date(g.date).toLocaleDateString()}</td>
      <td>${g.opponent}</td>
      <td>${g.location}</td>
      <td class="${resultClass}">${g.result || (g.teamScore > g.oppScore ? 'W' : g.teamScore < g.oppScore ? 'L' : 'Pending')}</td>
      <td>${g.teamScore || '-'} - ${g.oppScore || '-'}</td>
    </tr>`;
  }).join('');

  const top = [...state.stats]
    .sort((a, b) => (b.ppg + b.rpg + b.apg) - (a.ppg + a.rpg + a.apg))
    .slice(0, 10);
  document.getElementById('leadersList').innerHTML = top.map((p) => `
    <article class="leader"><strong>${p.name}</strong><small>${p.ppg.toFixed(1)} PPG • ${p.rpg.toFixed(1)} RPG • ${p.apg.toFixed(1)} APG</small></article>
  `).join('') || '<p>No player production rows were returned for this season.</p>';

  document.getElementById('rosterList').innerHTML = state.players.slice(0, 36).map((p) => `
    <article class="roster-item"><strong>#${p.number} ${p.name}</strong><small>${p.position} • ${p.class}</small></article>
  `).join('') || '<p>No roster data returned for this season.</p>';
};

const renderError = (error) => {
  document.getElementById('snapshotText').textContent = `Could not load data from CollegeBasketballData for ${state.selectedSeason}.`;
  document.getElementById('statusList').innerHTML = `<li><strong>Connection Error</strong><span>${error.message}</span></li>`;
};

const buildSeasonOptions = () => {
  const select = document.getElementById('seasonSelect');
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current; y >= START_YEAR; y--) years.push(y);
  select.innerHTML = years.map((year) => `<option value="${year}">${year}-${year + 1}</option>`).join('');
  state.selectedSeason = current;
  select.value = String(current);
  select.addEventListener('change', async (event) => {
    state.selectedSeason = Number(event.target.value);
    await init();
  });
};

const init = async () => {
  try {
    await loadSeasonData(state.selectedSeason);
    render();
  } catch (error) {
    renderError(error);
  }
};

buildSeasonOptions();
init();
