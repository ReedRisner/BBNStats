document.addEventListener('DOMContentLoaded', function () {
    const seasonSelect = document.getElementById('seasonSelect');
    const TEAM_ID = '96';
    const TEAM_STATS_API = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${TEAM_ID}/statistics`;

    const statMap = {
        'Offensive Rating': { key: 'avgPoints', fallback: '0.0' },
        'Defensive Rating': { key: 'avgPointsAgainst', fallback: '0.0' },
        'Net Rating': { compute: (s) => (num(s.avgPoints) - num(s.avgPointsAgainst)).toFixed(1), fallback: '0.0' },
        'Tempo': { key: 'possessionsPerGame', fallback: '0.0' },
        'eFG%': { key: 'effectiveFieldGoalPct', pct: true, fallback: '0.0' },
        'TS%': { key: 'trueShootingPct', pct: true, fallback: '0.0' },
        '3P%': { key: 'threePointFieldGoalPct', pct: true, fallback: '0.0' },
        '2P%': { key: 'twoPointFieldGoalPct', pct: true, fallback: '0.0' },
        'FT%': { key: 'freeThrowPct', pct: true, fallback: '0.0' },
        'Offensive Rebound %': { key: 'offensiveReboundsPerGame', fallback: '0.0' },
        'Defensive Rebound %': { key: 'defensiveReboundsPerGame', fallback: '0.0' },
        'Assist %': { key: 'assistsPerGame', fallback: '0.0' },
        'Turnover %': { key: 'turnoversPerGame', fallback: '0.0' },
        'Steal %': { key: 'stealsPerGame', fallback: '0.0' },
        'Block %': { key: 'blocksPerGame', fallback: '0.0' }
    };

    function num(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    function toMap(splits) {
        const out = {};
        (splits || []).forEach((g) => {
            (g.stats || []).forEach((s) => {
                out[s.name] = s.displayValue || s.value;
            });
        });
        return out;
    }

    async function fetchTeamStats(season) {
        const response = await fetch(`${TEAM_STATS_API}?season=${season}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Stats API failed (${response.status})`);
        const data = await response.json();
        return toMap(data?.results?.stats?.splits);
    }

    async function updateStats(season) {
        try {
            const seasonStats = await fetchTeamStats(season);
            document.querySelectorAll('.stat-card').forEach((card) => {
                const title = card.querySelector('h3').textContent.trim();
                const valueElement = card.querySelector('.stat-value');
                const rankElement = card.querySelector('.stat-ranking');
                const config = statMap[title];

                if (!config) {
                    valueElement.textContent = '-';
                    rankElement.textContent = '(#-)';
                    return;
                }

                let value = config.compute ? config.compute(seasonStats) : (seasonStats[config.key] ?? config.fallback);
                if (config.pct) {
                    value = String(value).replace('%', '');
                    valueElement.classList.add('percent-value');
                } else {
                    valueElement.classList.remove('percent-value');
                }

                valueElement.textContent = value;
                rankElement.textContent = '(live)';
            });
        } catch (error) {
            console.error('Error loading live stats:', error);
        }
    }

    updateStats(seasonSelect.value);
    seasonSelect.addEventListener('change', function () {
        updateStats(this.value);
    });
});
