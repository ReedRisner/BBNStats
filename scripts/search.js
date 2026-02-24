let searchData = { players: [], schedule: [], pages: [] };
let isSearchInitialized = false;

const STATIC_PAGES = [
  { title: 'Home', description: 'BBN Stats homepage', url: '../index.html', category: 'pages' },
  { title: 'Players', description: 'Roster and player game logs', url: 'players.html', category: 'pages' },
  { title: 'Schedule', description: 'Season schedule and results', url: 'schedule.html', category: 'pages' },
  { title: 'Rankings', description: 'Team rankings and resume snapshot', url: 'rankings.html', category: 'pages' },
  { title: 'Statistics', description: 'Team stat dashboard', url: 'stats.html', category: 'pages' },
  { title: 'Comparison', description: 'Player comparison tools', url: 'comparison.html', category: 'pages' },
  { title: 'History', description: 'Program history', url: 'history.html', category: 'pages' },
  { title: 'Staff', description: 'Coaching staff', url: 'staff.html', category: 'pages' },
  { title: 'News', description: 'Kentucky basketball news feed', url: 'news.html', category: 'pages' }
];

function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}

function openSearch() {
  document.getElementById('searchModal').classList.add('active');
  document.getElementById('searchInput').focus();
}

function closeSearch() {
  document.getElementById('searchModal').classList.remove('active');
}

function renderResults(items) {
  const target = document.getElementById('searchResults');
  if (!items.length) {
    target.innerHTML = '<div class="no-results">No results found.</div>';
    return;
  }

  target.innerHTML = items.slice(0, 20).map((item) => `
    <a class="search-result-item" href="${item.url}">
      <div class="search-result-category">${item.category}</div>
      <div class="search-result-title">${item.title}</div>
      <div class="search-result-description">${item.description || ''}</div>
    </a>
  `).join('');
}

async function loadSearchData() {
  const basePath = getBasePath();
  const TEAM_ID = '96';
  const season = String(new Date().getFullYear());

  const [rosterRes, scheduleRes] = await Promise.all([
    fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${TEAM_ID}/roster`, { cache: 'no-store' }),
    fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${TEAM_ID}/schedule?season=${season}`, { cache: 'no-store' })
  ]);

  if (rosterRes.ok) {
    const rosterData = await rosterRes.json();
    searchData.players = (rosterData.athletes || []).map((p) => ({
      title: p.displayName,
      description: `${p.position?.abbreviation || 'N/A'} • #${p.jersey || '-'}`,
      url: `${basePath}pages/players.html?player=${encodeURIComponent(p.displayName)}&season=${season}`,
      category: 'players',
      searchTerms: `${p.displayName} ${p.position?.abbreviation || ''} ${p.jersey || ''}`.toLowerCase()
    }));
  }

  if (scheduleRes.ok) {
    const scheduleData = await scheduleRes.json();
    searchData.schedule = (scheduleData.events || []).map((event) => {
      const c = event?.competitions?.[0] || {};
      const opp = c.competitors?.find((x) => x.team?.id !== TEAM_ID)?.team?.displayName || 'Opponent';
      const dateLabel = new Date(event.date).toLocaleDateString();
      return {
        title: `Kentucky vs ${opp}`,
        description: dateLabel,
        url: `${basePath}pages/schedule.html?season=${season}`,
        category: 'schedule',
        searchTerms: `kentucky ${opp} ${dateLabel}`.toLowerCase()
      };
    });
  }

  searchData.pages = STATIC_PAGES.map((p) => ({
    ...p,
    url: p.url.startsWith('..') || !basePath ? p.url : `${basePath}pages/${p.url}`,
    searchTerms: `${p.title} ${p.description}`.toLowerCase()
  }));
}

function setupSearchInput() {
  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      document.getElementById('searchResults').innerHTML = '<div class="no-results">Start typing to search for players, pages, and games...</div>';
      return;
    }

    const source = [...searchData.players, ...searchData.schedule, ...searchData.pages];
    const matches = source.filter((item) => (item.searchTerms || '').includes(query));
    renderResults(matches);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') closeSearch();
  });

  document.getElementById('searchModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'searchModal') closeSearch();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupSearchInput();
  if (!isSearchInitialized) {
    try {
      await loadSearchData();
      isSearchInitialized = true;
    } catch (error) {
      console.error('Search initialization failed:', error);
    }
  }
});

window.openSearch = openSearch;
window.closeSearch = closeSearch;
