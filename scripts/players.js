import { loadSeasonBundle, seasonOptions } from './api.js';

const state = { season: new Date().getFullYear(), rows: [] };

const setupSeason = () => {
  const select = document.getElementById('seasonSelect');
  select.innerHTML = seasonOptions(2018).map((y) => `<option value="${y}">${y}-${y + 1}</option>`).join('');
  select.value = String(state.season);
  select.addEventListener('change', async (e) => {
    state.season = Number(e.target.value);
    await loadAndRender();
  });
};

const render = (bundle) => {
  const statsMap = new Map(bundle.playerStats.map((p) => [p.name.toLowerCase(), p]));
  state.rows = bundle.roster.map((player) => {
    const hit = statsMap.get(player.name.toLowerCase()) || {};
    return { ...player, ...hit };
  }).sort((a, b) => (b.ppg || 0) - (a.ppg || 0));

  document.getElementById('sourceBadge').textContent = bundle.source === 'live-api' ? 'Live API' : 'Fallback data';
  const tbody = document.getElementById('playersBody');
  tbody.innerHTML = state.rows.map((p) => `
    <tr>
      <td><strong>#${p.number}</strong></td>
      <td>${p.name}</td>
      <td>${p.position}</td>
      <td>${p.year}</td>
      <td>${p.height}</td>
      <td>${p.weight}</td>
      <td>${(p.mpg || 0).toFixed(1)}</td>
      <td>${(p.ppg || 0).toFixed(1)}</td>
      <td>${(p.rpg || 0).toFixed(1)}</td>
      <td>${(p.apg || 0).toFixed(1)}</td>
    </tr>
  `).join('');

  document.getElementById('rosterCount').textContent = String(state.rows.length);
};

const applyFilter = () => {
  const q = document.getElementById('playerFilter').value.trim().toLowerCase();
  const rows = Array.from(document.querySelectorAll('#playersBody tr'));
  rows.forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
};

const loadAndRender = async () => {
  document.getElementById('playersBody').innerHTML = '<tr><td colspan="10">Loading roster...</td></tr>';
  const bundle = await loadSeasonBundle(state.season);
  render(bundle);
};

setupSeason();
document.getElementById('playerFilter').addEventListener('input', applyFilter);
loadAndRender();
