document.addEventListener('DOMContentLoaded', function () {
    const seasonSelect = document.getElementById('seasonSelect');
    const TEAM_ID = '96';
    const SCHEDULE_API = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${TEAM_ID}/schedule`;
    const TEAM_API = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${TEAM_ID}`;

    async function fetchRankingData(season) {
        const [scheduleRes, teamRes] = await Promise.all([
            fetch(`${SCHEDULE_API}?season=${season}`, { cache: 'no-store' }),
            fetch(`${TEAM_API}?season=${season}`, { cache: 'no-store' })
        ]);

        if (!scheduleRes.ok) throw new Error('Schedule API failed');
        const scheduleData = await scheduleRes.json();
        const teamData = teamRes.ok ? await teamRes.json() : {};

        const events = scheduleData?.events || [];
        let wins = 0;
        let losses = 0;
        let top25Wins = 0;
        let top25Losses = 0;

        events.forEach((event) => {
            const c = event?.competitions?.[0];
            if (!c?.status?.type?.completed) return;
            const us = c.competitors?.find((x) => x.team?.id === TEAM_ID);
            const opp = c.competitors?.find((x) => x.team?.id !== TEAM_ID);
            if (!us || !opp) return;
            if (us.winner) wins += 1;
            else losses += 1;

            const oppRank = Number(opp?.curatedRank?.current);
            if (oppRank > 0 && oppRank <= 25) {
                if (us.winner) top25Wins += 1;
                else top25Losses += 1;
            }
        });

        const standingSummary = teamData?.team?.recordSummary || `${wins}-${losses}`;
        const teamRank = teamData?.team?.rank || 'NR';

        return {
            'Overall Record': `${wins}-${losses}`,
            'Conference Standings': standingSummary,
            'AP Poll': teamRank === 'NR' ? 'NR' : `#${teamRank}`,
            'KenPom': '-',
            'NET Rankings': '-',
            'Evan Miya': '-',
            'Barttorvik': '-',
            'Bracketology': '-',
            'AP Top 25 Record': `${top25Wins}-${top25Losses}`
        };
    }

    async function updateRankings(season) {
        try {
            const values = await fetchRankingData(season);
            document.querySelectorAll('.ranking-card').forEach((card) => {
                const title = card.querySelector('h3').textContent.trim();
                const valueElement = card.querySelector('.ranking-value');
                valueElement.textContent = values[title] || '-';
            });
        } catch (error) {
            console.error('Error loading live rankings:', error);
        }
    }

    updateRankings(seasonSelect.value);
    seasonSelect.addEventListener('change', function () {
        updateRankings(this.value);
    });
});
