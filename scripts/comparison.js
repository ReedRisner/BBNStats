import { loadSeasonBundle, seasonOptions } from './api.js';

const state = { season: new Date().getFullYear(), players: [] };

const setupSeason = () => {
  const select = document.getElementById('seasonSelect');
  select.innerHTML = seasonOptions(2018).map((y) => `<option value="${y}">${y}-${y + 1}</option>`).join('');
  select.value = String(state.season);
  select.addEventListener('change', async (e) => {
    state.season = Number(e.target.value);
    await loadAndRender();
  });
};

const fillPlayerSelects = () => {
  const options = state.players
    .sort((a, b) => (b.ppg || 0) - (a.ppg || 0))
    .map((p) => `<option value="${p.name}">${p.name}</option>`)
    .join('');

  ['playerA', 'playerB'].forEach((id) => {
    const select = document.getElementById(id);
    select.innerHTML = `<option value="">Select player</option>${options}`;
  });
};

const calcMax = (a, b) => Math.max(a || 0, b || 0, 1);

const renderComparison = () => {
  const a = state.players.find((p) => p.name === document.getElementById('playerA').value);
  const b = state.players.find((p) => p.name === document.getElementById('playerB').value);
  if (!a || !b) {
    document.getElementById('comparisonBody').innerHTML = '<tr><td colspan="4">Select two players to compare.</td></tr>';
    return;
  }

  const rows = [
    ['Points per game', a.ppg || 0, b.ppg || 0],
    ['Rebounds per game', a.rpg || 0, b.rpg || 0],
    ['Assists per game', a.apg || 0, b.apg || 0],
    ['Minutes per game', a.mpg || 0, b.mpg || 0]
  ];

  document.getElementById('comparisonBody').innerHTML = rows.map(([label, av, bv]) => {
    const max = calcMax(av, bv);
    return `<tr>
      <td>${label}</td>
      <td>
        <div class="compare-value">${av.toFixed(1)}</div>
        <div class="progress"><div class="progress-bar bg-primary" style="width:${(av / max) * 100}%"></div></div>
      </td>
      <td>
        <div class="compare-value">${bv.toFixed(1)}</div>
        <div class="progress"><div class="progress-bar bg-info" style="width:${(bv / max) * 100}%"></div></div>
      </td>
      <td>${av > bv ? a.name : bv > av ? b.name : 'Tie'}</td>
    </tr>`;
  }).join('');
};

const loadAndRender = async () => {
  document.getElementById('sourceBadge').textContent = 'Loading...';
  const bundle = await loadSeasonBundle(state.season);
  state.players = bundle.playerStats;
  fillPlayerSelects();
  document.getElementById('sourceBadge').textContent = bundle.source === 'live-api' ? 'Live API' : 'Fallback data';
  renderComparison();
};

document.getElementById('playerA').addEventListener('change', renderComparison);
document.getElementById('playerB').addEventListener('change', renderComparison);
setupSeason();
loadAndRender();
