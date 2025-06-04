const CURRENT_SEASON = '2025'; // Define current season

async function loadTotalRecordForIndex() {
    try {
        const response = await fetch(`data/${CURRENT_SEASON}-schedule.json`);
        if (!response.ok) throw new Error('Schedule not found');
        const games = await response.json();

        let wins = 0, losses = 0;

        games.forEach(game => {
            if (game.result && game.result !== 'TBD') {
                if (game.result.startsWith('W')) wins++;
                if (game.result.startsWith('L')) losses++;
            }
        });

        document.getElementById('indexTotalRecord').textContent = `${wins}-${losses}`;
    } catch (error) {
        console.error('Error loading total record:', error);
        document.getElementById('indexTotalRecord').textContent = 'N/A';
    }
}

async function loadSeasonLeaders() {
    try {
        // Load player data
        const response = await fetch('data/players.json');
        if (!response.ok) throw new Error('Player data not found');
        const playerData = await response.json();
        
        // Get players for current season
        const players = playerData.seasons[CURRENT_SEASON]?.players || [];
        if (players.length === 0) {
            throw new Error('No players found for current season');
        }
        
        // Calculate per-game stats
        const playersWithStats = players.map(player => {
            const gp = player.gp || 1; // Avoid division by zero
            return {
                ...player,
                ppg: player.pts / gp,
                apg: player.ast / gp,
                rpg: player.reb / gp
            };
        });
        
        // Find leaders
        const ppgLeader = [...playersWithStats].sort((a, b) => b.ppg - a.ppg)[0];
        const apgLeader = [...playersWithStats].sort((a, b) => b.apg - a.apg)[0];
        const rpgLeader = [...playersWithStats].sort((a, b) => b.rpg - a.rpg)[0];
        
        // Display leaders
        displayLeader('ppgLeader', ppgLeader, 'ppg');
        displayLeader('apgLeader', apgLeader, 'apg');
        displayLeader('rpgLeader', rpgLeader, 'rpg');
        
    } catch (error) {
        console.error('Error loading season leaders:', error);
        // Show placeholders
        document.querySelectorAll('.leader-content').forEach(el => {
            el.innerHTML = '<p>Stats loading...</p>';
        });
    }
}

function displayLeader(elementId, player, statType) {
    const container = document.getElementById(elementId);
    if (!container || !player) return;
    
    const statValue = player[statType].toFixed(1);
    const statLabel = statType.toUpperCase();
    
    container.innerHTML = `
        <img src="images/${CURRENT_SEASON}/players/${player.number}.jpg" 
            class="leader-img" 
            alt="${player.name}"
            onerror="this.src='images/players/default.jpg'">
        <div class="leader-name">${player.name}</div>
        <div class="leader-stat">${statValue} ${statLabel}</div>
    `;
}

// Combined DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', () => {
    loadTotalRecordForIndex();
    loadSeasonLeaders();
    
    // Recent games click handler
    const recentGames = document.getElementById('recent-games');
    if (recentGames) {
        recentGames.addEventListener('click', function(e) {
            const row = e.target.closest('tr');
            if (!row) return;
            
            const dateCell = row.cells[0];
            const gameDate = dateCell.textContent.trim();
            const parsedDate = parseGameDate(gameDate);
            window.location.href = `boxscore.html?season=${CURRENT_SEASON}&date=${parsedDate}`;
        });
    }
});

function parseGameDate(dateStr) {
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
        'January': '01', 'February': '02', 'March': '03',
        'April': '04', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    try {
        const cleaned = dateStr.replace(/,/g, '').trim();
        const parts = cleaned.split(/\s+/);
        if (parts.length !== 3) throw new Error('Invalid date format');
        
        const [monthStr, day, year] = parts;
        return `${year}-${months[monthStr]}-${day.padStart(2, '0')}`;
    } catch (error) {
        console.error('Date parsing error:', error.message, 'for date:', dateStr);
        return 'invalid-date';
    }
}