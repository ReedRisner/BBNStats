import { loadSeasonBundle, seasonOptions } from './api.js';

const state = { season: new Date().getFullYear() };

const setupSeason = () => {
  const select = document.getElementById('seasonSelect');
  select.innerHTML = seasonOptions(2018).map((y) => `<option value="${y}">${y}-${y + 1}</option>`).join('');
  select.value = String(state.season);
  select.addEventListener('change', async (e) => {
    state.season = Number(e.target.value);
    await loadAndRender();
  });
};

const calcAverages = (games) => {
  const completed = games.filter((g) => g.teamScore || g.oppScore);
  if (!completed.length) return { ppg: 0, oppg: 0, margin: 0 };
  const ppg = completed.reduce((acc, g) => acc + g.teamScore, 0) / completed.length;
  const oppg = completed.reduce((acc, g) => acc + g.oppScore, 0) / completed.length;
  return { ppg, oppg, margin: ppg - oppg };
};

const render = (bundle) => {
  const avg = calcAverages(bundle.games);
  const top = [...bundle.playerStats].sort((a, b) => (b.ppg || 0) - (a.ppg || 0)).slice(0, 8);
  document.getElementById('sourceBadge').textContent = bundle.source === 'live-api' ? 'Live API' : 'Fallback data';
  document.getElementById('ppg').textContent = avg.ppg.toFixed(1);
  document.getElementById('oppg').textContent = avg.oppg.toFixed(1);
  document.getElementById('margin').textContent = `${avg.margin >= 0 ? '+' : ''}${avg.margin.toFixed(1)}`;
  document.getElementById('leaders').innerHTML = top.map((p) => `
    <tr>
      <td>${p.name}</td>
      <td>${(p.ppg || 0).toFixed(1)}</td>
      <td>${(p.rpg || 0).toFixed(1)}</td>
      <td>${(p.apg || 0).toFixed(1)}</td>
      <td>${(p.mpg || 0).toFixed(1)}</td>
    </tr>
  `).join('');
};

const loadAndRender = async () => {
  document.getElementById('leaders').innerHTML = '<tr><td colspan="5">Loading team stats...</td></tr>';
  const bundle = await loadSeasonBundle(state.season);
  render(bundle);
};

setupSeason();
loadAndRender();
