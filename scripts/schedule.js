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

const summarize = (games) => {
  const completed = games.filter((g) => g.teamScore || g.oppScore);
  const wins = completed.filter((g) => g.teamScore > g.oppScore).length;
  const losses = completed.filter((g) => g.teamScore < g.oppScore).length;
  return { wins, losses, total: games.length };
};

const render = (bundle) => {
  const summary = summarize(bundle.games);
  document.getElementById('recordKpi').textContent = `${summary.wins}-${summary.losses}`;
  document.getElementById('gamesKpi').textContent = String(summary.total);
  document.getElementById('sourceBadge').textContent = bundle.source === 'live-api' ? 'Live API' : 'Fallback data';

  document.getElementById('scheduleBody').innerHTML = bundle.games.map((g) => {
    const badge = g.result.includes('W') ? 'badge-win' : g.result.includes('L') ? 'badge-loss' : 'badge-pending';
    const date = g.date ? new Date(g.date).toLocaleDateString() : 'TBD';
    return `<tr>
      <td>${date}</td>
      <td>${g.opponent}</td>
      <td>${g.location}</td>
      <td><span class="badge ${badge}">${g.result}</span></td>
      <td>${g.teamScore || '-'} - ${g.oppScore || '-'}</td>
    </tr>`;
  }).join('');
};

const loadAndRender = async () => {
  document.getElementById('scheduleBody').innerHTML = '<tr><td colspan="5">Loading schedule...</td></tr>';
  const bundle = await loadSeasonBundle(state.season);
  render(bundle);
};

setupSeason();
loadAndRender();
