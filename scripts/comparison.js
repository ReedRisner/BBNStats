let allPlayersData = null;
let allGameLogsData = null;
let allScheduleData = null;
let player1 = null;
let player2 = null;
let averagesChart = null;
let shootingChart = null;
let advancedChart = null;

async function loadPlayerData() {
    try {
        // Load players data
        const playersResponse = await fetch('data/players.json');
        if (!playersResponse.ok) throw new Error(`HTTP error! status: ${playersResponse.status}`);
        allPlayersData = await playersResponse.json();
        
        // Load game logs data
        const gameLogsResponse = await fetch('data/gameLogs.json');
        if (!gameLogsResponse.ok) throw new Error('Failed to load game logs');
        allGameLogsData = await gameLogsResponse.json();
        
        // Load schedule data for all seasons
        allScheduleData = {};
        for (const season of Object.keys(allPlayersData.seasons)) {
            try {
                const scheduleResponse = await fetch(`data/${season}-schedule.json`);
                if (scheduleResponse.ok) {
                    allScheduleData[season] = await scheduleResponse.json();
                }
            } catch (error) {
                console.error(`Error loading schedule for ${season}:`, error);
                allScheduleData[season] = [];
            }
        }
        
        // Process game logs and calculate stats
        await processGameLogs();
        
        setupPlayerSelects();
        initializeTooltips();
    } catch (error) {
        console.error('Error loading player data:', error);
        alert('Failed to load player data. Please check console for details.');
    }
}

function initializeTooltips() {
    // Initialize Bootstrap tooltips if available, otherwise use custom tooltip system
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        // Bootstrap tooltip initialization will be handled in renderComparison
    } else {
        // Custom tooltip system
        addCustomTooltipStyles();
    }
}

function addCustomTooltipStyles() {
    // Add custom tooltip styles if they don't exist
    const styleId = 'custom-tooltip-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .stat-label-tooltip {
                position: relative;
                cursor: help;
            }
            
            .stat-label-tooltip:hover::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background-color: #333;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: normal;
                white-space: nowrap;
                z-index: 1000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                max-width: 250px;
                white-space: normal;
                text-align: center;
                line-height: 1.3;
            }
            
            .stat-label-tooltip:hover::before {
                content: '';
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%) translateY(100%);
                border: 5px solid transparent;
                border-top-color: #333;
                z-index: 1000;
            }
            
            @media (max-width: 768px) {
                .stat-label-tooltip:hover::after {
                    position: fixed;
                    bottom: auto;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    max-width: 90vw;
                }
                
                .stat-label-tooltip:hover::before {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function normalizeDate(dateStr) {
    try {
        // Handle various date formats
        let date;
        
        // Check if it's already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            date = new Date(dateStr + 'T00:00:00');
        } else {
            // Handle formats like "November 4, 2024", "March 1, 2025", etc.
            date = new Date(dateStr + ' 00:00:00');
        }
        
        if (isNaN(date.getTime())) {
            console.warn(`Invalid date: ${dateStr}`);
            return null;
        }
        
        // Return normalized date string in YYYY-MM-DD format
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error(`Error normalizing date: ${dateStr}`, error);
        return null;
    }
}

function normalizeOpponentName(opponent) {
    return opponent
        .toLowerCase()
        .replace(/^(vs\s+|at\s+)/, '') // Remove "vs " or "at " prefix
        .replace(/\s*\(exh\)/, '') // Remove "(EXH)" suffix
        .replace(/\s*\(sec tournament\)/, '') // Remove tournament suffixes
        .replace(/\s*\(ncaa tournament\)/, '')
        .trim();
}

async function processGameLogs() {
    // Reset and calculate player stats from game logs
    for (const season of Object.keys(allPlayersData.seasons)) {
        const players = allPlayersData.seasons[season].players;
        const seasonGames = allGameLogsData.seasons[season]?.games || [];
        const scheduleData = allScheduleData[season] || [];
        
        console.log(`Processing season ${season} with ${seasonGames.length} games and ${scheduleData.length} schedule entries`);
        
        // Create a map of games by normalized opponent and date
        const gameMap = new Map();
        scheduleData.forEach((game, index) => {
            const normalizedDate = normalizeDate(game.date);
            if (!normalizedDate) return;
            
            const normalizedOpponent = normalizeOpponentName(game.opponent);
            const key = `${normalizedOpponent}_${normalizedDate}`;
            
            gameMap.set(key, {
                exh: game.exh || false,
                conference: game.conference || false,
                venue: game.venue || 'home',
                originalOpponent: game.opponent,
                originalDate: game.date
            });
            
            console.log(`Mapped: ${key}`, gameMap.get(key));
        });
        
        // Initialize stats for all players
        players.forEach(player => {
            player.gameLogs = [];
            player.allGameStats = {};
        });
        
        // Process each game
        seasonGames.forEach((game, gameIndex) => {
            const normalizedDate = normalizeDate(game.date);
            if (!normalizedDate) {
                console.warn(`Skipping game with invalid date: ${game.date}`);
                return;
            }
            
            const normalizedOpponent = normalizeOpponentName(game.opponent);
            const key = `${normalizedOpponent}_${normalizedDate}`;
            
            // Get game details from schedule
            const gameDetails = gameMap.get(key) || {
                exh: game.opponent.toLowerCase().includes('exh') || game.opponent.toLowerCase().includes('exhibition'),
                conference: false,
                venue: game.opponent.toLowerCase().startsWith('at ') ? 'away' : 'home'
            };
            
            console.log(`Processing game: ${key}`, gameDetails);
            
            game.boxscore.forEach(playerStat => {
                const player = players.find(p => p.number == playerStat.number);
                if (player) {
                    // Add game to player's game logs with enhanced details
                    const gameLog = {
                        ...playerStat,
                        date: game.date,
                        opponent: game.opponent,
                        result: game.result,
                        exh: gameDetails.exh,
                        conference: gameDetails.conference,
                        venue: gameDetails.venue,
                        gameIndex: gameIndex
                    };
                    
                    player.gameLogs.push(gameLog);
                }
            });
        });
        
        console.log(`Completed processing season ${season}`);
    }
}

function setupPlayerSelects() {
    const player1Season = document.getElementById('player1Season');
    const player2Season = document.getElementById('player2Season');
    const player1Select = document.getElementById('player1Select');
    const player2Select = document.getElementById('player2Select');
    const player1Filter = document.getElementById('player1Filter');
    const player2Filter = document.getElementById('player2Filter');
    
    // Initialize dropdowns
    updatePlayerDropdown('player1Season', 'player1Select');
    updatePlayerDropdown('player2Season', 'player2Select');
    
    // Set up event listeners
    player1Season.addEventListener('change', () => {
        updatePlayerDropdown('player1Season', 'player1Select');
        player1 = null;
        clearComparison();
    });
    
    player2Season.addEventListener('change', () => {
        updatePlayerDropdown('player2Season', 'player2Select');
        player2 = null;
        clearComparison();
    });
    
    player1Select.addEventListener('change', (e) => handlePlayerSelect(e, 'player1'));
    player2Select.addEventListener('change', (e) => handlePlayerSelect(e, 'player2'));
    
    // Add filter event listeners with debugging and independence checks
    player1Filter.addEventListener('change', () => {
        if (player1) {
            const filterValue = player1Filter.value;
            console.log(`Player1 filter changed to: ${filterValue}`);
            console.log(`Player2 filter currently: ${player2Filter.value}`);
            console.log(`Before filter - Player1: ${player1.currentFilter}, Player2: ${player2 ? player2.currentFilter : 'none'}`);
            
            applyPlayerFilter(player1, filterValue);
            
            console.log(`After filter - Player1: ${player1.currentFilter}, Player2: ${player2 ? player2.currentFilter : 'none'}`);
            renderComparison();
        }
    });
    
    player2Filter.addEventListener('change', () => {
        if (player2) {
            const filterValue = player2Filter.value;
            console.log(`Player2 filter changed to: ${filterValue}`);
            console.log(`Player1 filter currently: ${player1Filter.value}`);
            console.log(`Before filter - Player1: ${player1 ? player1.currentFilter : 'none'}, Player2: ${player2.currentFilter}`);
            
            applyPlayerFilter(player2, filterValue);
            
            console.log(`After filter - Player1: ${player1 ? player1.currentFilter : 'none'}, Player2: ${player2.currentFilter}`);
            renderComparison();
        }
    });
}

function updatePlayerDropdown(seasonSelectId, playerSelectId) {
    const season = document.getElementById(seasonSelectId).value;
    const players = allPlayersData.seasons[season]?.players || [];
    const playerSelect = document.getElementById(playerSelectId);
    
    playerSelect.innerHTML = '<option value="">Select Player</option>';
    
    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.number;
        option.textContent = `#${player.number} ${player.name}`;
        playerSelect.appendChild(option);
    });
}

function handlePlayerSelect(event, target) {
    const seasonSelectId = target === 'player1' ? 'player1Season' : 'player2Season';
    const filterSelectId = target === 'player1' ? 'player1Filter' : 'player2Filter';
    const season = document.getElementById(seasonSelectId).value;
    const filter = document.getElementById(filterSelectId).value;
    const players = allPlayersData.seasons[season]?.players || [];
    const playerNumber = event.target.value;
    
    if (!playerNumber) {
        if (target === 'player1') player1 = null;
        if (target === 'player2') player2 = null;
        clearComparison();
        return;
    }
    
    const player = players.find(p => p.number == playerNumber);
    if (!player) return;

    // Create a deep copy of the player object to avoid shared references
    const playerCopy = JSON.parse(JSON.stringify(player));
    playerCopy.season = season; // Store the season with the player
    
    // Apply the current filter
    applyPlayerFilter(playerCopy, filter);
    
    if (target === 'player1') player1 = playerCopy;
    if (target === 'player2') player2 = playerCopy;
    
    renderComparison();
}

function applyPlayerFilter(player, filterType) {
    let filteredGames = [];
    
    console.log(`Applying filter ${filterType} to player ${player.name}`);
    console.log(`Total games: ${player.gameLogs.length}`);
    
    // Start with non-exhibition games only
    const nonExhGames = player.gameLogs.filter(game => !game.exh);
    console.log(`Non-exhibition games: ${nonExhGames.length}`);
    
    switch (filterType) {
        case 'whole':
            filteredGames = nonExhGames;
            break;
        case 'last5':
            // Get the most recent 5 non-exhibition games
            filteredGames = nonExhGames.slice(-5);
            break;
        case 'home':
            filteredGames = nonExhGames.filter(game => game.venue === 'home');
            console.log(`Home games found: ${filteredGames.length}`);
            break;
        case 'away':
            filteredGames = nonExhGames.filter(game => game.venue === 'away');
            console.log(`Away games found: ${filteredGames.length}`);
            break;
        case 'conference':
            filteredGames = nonExhGames.filter(game => game.conference === true);
            console.log(`Conference games found: ${filteredGames.length}`);
            break;
        case 'nonconference':
            filteredGames = nonExhGames.filter(game => game.conference === false);
            console.log(`Non-conference games found: ${filteredGames.length}`);
            break;
        default:
            filteredGames = nonExhGames;
    }
    
    console.log(`Final filtered games: ${filteredGames.length}`);
    
    // Calculate stats based on filtered games
    player.filteredStats = calculateStatsFromGames(filteredGames);
    player.currentFilter = filterType;
    
    // Calculate ratings
    const gameRatings = filteredGames.map(calculateGameRating);
    player.rating = calculateAverageRating(gameRatings);
}

function calculateStatsFromGames(games) {
    const stats = {
        gp: games.length,
        min: 0,
        pts: 0,
        reb: 0,
        ast: 0,
        stl: 0,
        blk: 0,
        to: 0,
        fgm: 0,
        fga: 0,
        threeFgm: 0,
        threeFga: 0,
        ftm: 0,
        fta: 0
    };
    
    games.forEach(game => {
        stats.min += game.min || 0;
        stats.pts += game.pts || 0;
        stats.reb += game.reb || 0;
        stats.ast += game.ast || 0;
        stats.stl += game.stl || 0;
        stats.blk += game.blk || 0;
        stats.to += game.to || 0;
        stats.fgm += game.fgm || 0;
        stats.fga += game.fga || 0;
        stats.threeFgm += game.threeFgm || 0;
        stats.threeFga += game.threeFga || 0;
        stats.ftm += game.ftm || 0;
        stats.fta += game.fta || 0;
    });
    
    return stats;
}

function renderComparison() {
    if (!player1 || !player2) return;
    
    renderPlayerCards();
    renderComparisonChart();
    initializeTooltipsForElements();
}

function initializeTooltipsForElements() {
    // Initialize tooltips for newly created elements
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    // If Bootstrap is available, use Bootstrap tooltips
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        tooltipElements.forEach(element => {
            new bootstrap.Tooltip(element, {
                title: element.getAttribute('data-tooltip'),
                placement: 'top',
                trigger: 'hover'
            });
        });
    }
    // Custom tooltip system is handled by CSS hover
}

function renderPlayerCards() {
    renderPlayerCard(player1, 'player1Card', player2);
    renderPlayerCard(player2, 'player2Card', player1);
}

function renderPlayerCard(player, elementId, comparisonPlayer) {
    const container = document.getElementById(elementId);
    
    // Use filtered stats if available, otherwise fall back to whole season
    const stats = player.filteredStats || {
        gp: player.gp || 0,
        min: player.min || 0,
        pts: player.pts || 0,
        reb: player.reb || 0,
        ast: player.ast || 0,
        stl: player.stl || 0,
        blk: player.blk || 0,
        to: player.to || 0,
        fgm: player.fgm || 0,
        fga: player.fga || 0,
        threeFgm: player.threeFgm || 0,
        threeFga: player.threeFga || 0,
        ftm: player.ftm || 0,
        fta: player.fta || 0
    };
    
    // Create a temporary player object with filtered stats for calculations
    const playerWithFilteredStats = { ...player, ...stats };
    
    const filterText = player.currentFilter ? getFilterDisplayText(player.currentFilter) : 'Whole Season';
    
    container.innerHTML = `
        <div class="text-center">
            <img src="images/${player.season}/players/${player.number}.jpg" 
                 class="player-photo-lg" alt="${player.name}"
                 onerror="this.src='images/players/default.jpg'">
            <h3 class="text-uk-blue mt-3 mb-1">#${player.number} ${player.name}</h3>
            <div class="text-muted mb-3">${player.pos} | ${player.ht} | ${player.wt}</div>
            <div class="text-muted mb-1">${player.season}-${parseInt(player.season)+1} Season</div>
            <div class="text-muted mb-3"><small>${filterText} (${stats.gp} games)</small></div>
            <div class="stats-box">
                ${generateStatsList(playerWithFilteredStats, comparisonPlayer)}
            </div>
        </div>
    `;
}

function getFilterDisplayText(filter) {
    const filterMap = {
        'whole': 'Whole Season',
        'last5': 'Past 5 Games',
        'home': 'Home Games',
        'away': 'Away Games',
        'conference': 'Conference Games',
        'nonconference': 'Non-Conference Games'
    };
    return filterMap[filter] || 'Whole Season';
}

function generateStatsList(player, comparisonPlayer) {
    const statsToCompare = [
        'mpg', 'ppg', 'rpg', 'apg', 'topg',
        'fg%', '3p%', 'ft%', 'ts%',
        'bpg', 'spg', 'per', 'eff',
        'ortg', 'drtg', 'usg%', 'bpm'
    ];
    
    const statTooltips = {
        'ppg': 'Points Per Game',
        'rpg': 'Rebounds Per Game',
        'apg': 'Assists Per Game',
        'mpg': 'Minutes Per Game',
        'topg': 'Turnovers Per Game',
        'fg%': 'Field Goal Percentage',
        '3p%': 'Three-Point Percentage',
        'ft%': 'Free Throw Percentage',
        'ts%': 'True Shooting Percentage',
        'bpg': 'Blocks Per Game',
        'spg': 'Steals Per Game',
        'per': 'Player Efficiency Rating',
        'eff': 'Efficiency Rating',
        'ortg': 'Offensive Rating',
        'drtg': 'Defensive Rating (lower is better)',
        'usg%': 'Usage Rate',
        'bpm': 'Box Plus/Minus'
    };
    
    // Calculate advanced stats once per player
    const advancedStats = calculateAdvancedStats(player);
    
    // For comparison player, use filtered stats if available
    let comparisonPlayerWithStats = null;
    let comparisonAdvanced = null;
    
    if (comparisonPlayer) {
        // Use filtered stats if available, otherwise use raw stats
        const comparisonStats = comparisonPlayer.filteredStats || {
            gp: comparisonPlayer.gp || 0,
            min: comparisonPlayer.min || 0,
            pts: comparisonPlayer.pts || 0,
            reb: comparisonPlayer.reb || 0,
            ast: comparisonPlayer.ast || 0,
            stl: comparisonPlayer.stl || 0,
            blk: comparisonPlayer.blk || 0,
            to: comparisonPlayer.to || 0,
            fgm: comparisonPlayer.fgm || 0,
            fga: comparisonPlayer.fga || 0,
            threeFgm: comparisonPlayer.threeFgm || 0,
            threeFga: comparisonPlayer.threeFga || 0,
            ftm: comparisonPlayer.ftm || 0,
            fta: comparisonPlayer.fta || 0
        };
        
        comparisonPlayerWithStats = { ...comparisonPlayer, ...comparisonStats };
        comparisonAdvanced = calculateAdvancedStats(comparisonPlayerWithStats);
    }
    
    return statsToCompare.map(stat => {
        const value = getStatValue(player, advancedStats, stat);
        const comparisonValue = comparisonPlayerWithStats ? 
            getStatValue(comparisonPlayerWithStats, comparisonAdvanced, stat) : null;
        
        // Determine if this stat is higher (better)
        const isHigher = comparisonPlayerWithStats && isStatHigher(value, comparisonValue, stat);
        
        // Get tooltip text
        const tooltip = statTooltips[stat.toLowerCase()] || '';

        return `
            <div class="stat-row">
                <div class="stat-label stat-label-tooltip" 
                     data-tooltip="${tooltip}" 
                     title="${tooltip}">${stat.toUpperCase()}</div>
                <div class="stat-value ${isHigher ? 'higher-stat' : ''}">${value}</div>
            </div>
        `;
    }).join('');
}

function isStatHigher(value, comparisonValue, stat) {
    if (!comparisonValue || value === '-' || comparisonValue === '-') return false;
    
    // Clean percentage values and convert to numbers
    const cleanValue = parseFloat(value.toString().replace('%', ''));
    const cleanComparisonValue = parseFloat(comparisonValue.toString().replace('%', ''));
    
    if (isNaN(cleanValue) || isNaN(cleanComparisonValue)) return false;
    
    // For defensive rating and turnovers, lower is better
    if (stat.toLowerCase() === 'drtg' || stat.toLowerCase() === 'topg') {
        return cleanValue < cleanComparisonValue;
    }
    
    // For all other stats, higher is better
    return cleanValue > cleanComparisonValue;
}

function getStatValue(player, advancedStats, stat) {
    const gp = player.gp || 1;  // Ensure at least 1 game to prevent division by zero
    
    switch(stat.toLowerCase()) {
        case 'ppg': return (player.pts / gp).toFixed(1);
        case 'rpg': return (player.reb / gp).toFixed(1);
        case 'apg': return (player.ast / gp).toFixed(1);
        case 'mpg': return (player.min / gp).toFixed(1);
        case 'topg': return (player.to / gp).toFixed(1);
        case 'fg%': 
            return player.fga > 0 ? ((player.fgm / player.fga) * 100).toFixed(1) + '%' : '-';
        case '3p%': 
            return player.threeFga > 0 ? ((player.threeFgm / player.threeFga) * 100).toFixed(1) + '%' : '-';
        case 'ft%': 
            return player.fta > 0 ? ((player.ftm / player.fta) * 100).toFixed(1) + '%' : '-';
        case 'ts%': 
            return advancedStats.tsPct ? (advancedStats.tsPct * 100).toFixed(1) + '%' : '-';
        case 'bpg': return (player.blk / gp).toFixed(1);
        case 'spg': return (player.stl / gp).toFixed(1);
        case 'per': return advancedStats.per ? advancedStats.per.toFixed(1) : '-';
        case 'eff': return advancedStats.eff ? advancedStats.eff.toFixed(1) : '-';
        case 'ortg': return advancedStats.ortg ? advancedStats.ortg.toFixed(1) : '-';
        case 'drtg': return advancedStats.drtg ? advancedStats.drtg.toFixed(1) : '-';
        case 'usg%': return advancedStats.usgRate ? advancedStats.usgRate.toFixed(1) + '%' : '-';
        case 'bpm': return advancedStats.bpm ? advancedStats.bpm.toFixed(1) : '-';
        default: return '-';
    }
}

function clearComparison() {
    document.getElementById('player1Card').innerHTML = '';
    document.getElementById('player2Card').innerHTML = '';
    [averagesChart, shootingChart, advancedChart].forEach(chart => {
        if (chart) {
            chart.destroy();
            chart = null;
        }
    });
}

function renderComparisonChart() {
    const averagesStats = ['ppg', 'rpg', 'apg', 'topg', 'bpg', 'spg'];
    const shootingStats = ['fg%', '3p%', 'ft%', 'ts%'];
    const playingTimeStats = ['mpg', 'ortg', 'drtg'];
    const advancedStats = ['per', 'eff', 'usg%', 'bpm'];

    // Debug: Check if canvases exist
    const averagesCanvas = document.getElementById('averagesChart');
    const shootingCanvas = document.getElementById('shootingChart');
    const playingTimeCanvas = document.getElementById('playingTimeChart');
    const advancedCanvas = document.getElementById('advancedChart');
    
    console.log('Canvas elements:', {
        averages: averagesCanvas,
        shooting: shootingCanvas,
        playingTime: playingTimeCanvas,
        advanced: advancedCanvas
    });

    // Destroy existing charts
    // Destroy existing charts with proper null checking
    if (averagesChart && typeof averagesChart.destroy === 'function') {
        averagesChart.destroy();
    }
    if (shootingChart && typeof shootingChart.destroy === 'function') {
        shootingChart.destroy();
    }
    if (playingTimeChart && typeof playingTimeChart.destroy === 'function') {
        playingTimeChart.destroy();
    }
    if (advancedChart && typeof advancedChart.destroy === 'function') {
        advancedChart.destroy();
    }
    // Reset chart variables
    averagesChart = null;
    shootingChart = null;
    playingTimeChart = null;
    advancedChart = null;

    // Use filtered stats if available
    const player1Stats = player1.filteredStats || {
        gp: player1.gp || 0,
        min: player1.min || 0,
        pts: player1.pts || 0,
        reb: player1.reb || 0,
        ast: player1.ast || 0,
        stl: player1.stl || 0,
        blk: player1.blk || 0,
        to: player1.to || 0,
        fgm: player1.fgm || 0,
        fga: player1.fga || 0,
        threeFgm: player1.threeFgm || 0,
        threeFga: player1.threeFga || 0,
        ftm: player1.ftm || 0,
        fta: player1.fta || 0
    };
    
    const player2Stats = player2.filteredStats || {
        gp: player2.gp || 0,
        min: player2.min || 0,
        pts: player2.pts || 0,
        reb: player2.reb || 0,
        ast: player2.ast || 0,
        stl: player2.stl || 0,
        blk: player2.blk || 0,
        to: player2.to || 0,
        fgm: player2.fgm || 0,
        fga: player2.fga || 0,
        threeFgm: player2.threeFgm || 0,
        threeFga: player2.threeFga || 0,
        ftm: player2.ftm || 0,
        fta: player2.fta || 0
    };
    
    // Create temporary player objects with filtered stats
    const player1WithFiltered = { ...player1, ...player1Stats };
    const player2WithFiltered = { ...player2, ...player2Stats };
    
    // Calculate advanced stats once per player
    const player1Advanced = calculateAdvancedStats(player1WithFiltered);
    const player2Advanced = calculateAdvancedStats(player2WithFiltered);
    
    console.log('Player data:', {
        player1: player1WithFiltered,
        player2: player2WithFiltered,
        player1Advanced,
        player2Advanced
    });

    // Create charts with error handling
    try {
        if (averagesCanvas) {
            averagesChart = new Chart(averagesCanvas.getContext('2d'),
                getChartConfig(averagesStats, 'Basic Stats', 20, player1WithFiltered, player2WithFiltered, player1Advanced, player2Advanced)
            );
            console.log('Averages chart created');
        }
        
        if (shootingCanvas) {
            shootingChart = new Chart(shootingCanvas.getContext('2d'),
                getChartConfig(shootingStats, 'Shooting Efficiency', 100, player1WithFiltered, player2WithFiltered, player1Advanced, player2Advanced)
            );
            console.log('Shooting chart created');
        }

        if (playingTimeCanvas) {
            playingTimeChart = new Chart(playingTimeCanvas.getContext('2d'),
                getChartConfig(playingTimeStats, 'Minutes & Ratings', 120, player1WithFiltered, player2WithFiltered, player1Advanced, player2Advanced)
            );
            console.log('Playing time chart created');
        }

        if (advancedCanvas) {
            advancedChart = new Chart(advancedCanvas.getContext('2d'),
                getChartConfig(advancedStats, 'Advanced Metrics', 30, player1WithFiltered, player2WithFiltered, player1Advanced, player2Advanced)
            );
            console.log('Advanced chart created');
        }
    } catch (error) {
        console.error('Error creating charts:', error);
    }
}

function getChartConfig(stats, title, yMax, player1Data, player2Data, player1Advanced, player2Advanced) {
    // Helper function to clean and parse stat values
    function parseStatValue(player, advanced, stat) {
        const rawValue = getStatValue(player, advanced, stat);
        if (rawValue === '-' || rawValue === null || rawValue === undefined) {
            return 0;
        }
        // Remove percentage signs and parse
        const cleanValue = parseFloat(rawValue.toString().replace('%', ''));
        return isNaN(cleanValue) ? 0 : cleanValue;
    }

    return {
        type: 'bar',
        data: {
            labels: stats.map(stat => stat.toUpperCase()),
            datasets: [{
                label: player1Data.name,
                data: stats.map(stat => parseStatValue(player1Data, player1Advanced, stat)),
                backgroundColor: 'rgba(0, 51, 160, 0.7)',
                borderColor: 'rgba(0, 51, 160, 1)',
                borderWidth: 2
            }, {
                label: player2Data.name,
                data: stats.map(stat => parseStatValue(player2Data, player2Advanced, stat)),
                backgroundColor: 'rgba(128, 128, 128, 0.7)',
                borderColor: 'rgba(128, 128, 128, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    suggestedMax: yMax,
                    grid: { color: 'rgba(0,0,0,0.1)' }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { position: 'top' },
                title: {
                    display: true,
                    text: title,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            const stat = stats[context.dataIndex];
                            const isPercentage = ['fg%', '3p%', 'ft%', 'ts%', 'usg%'].includes(stat);
                            return `${label}: ${value.toFixed(1)}${isPercentage ? '%' : ''}`;
                        }
                    }
                }
            }
        }
    };
}

document.addEventListener('DOMContentLoaded', loadPlayerData);

function calculateGameRating(game) {
    // Extract stats from game object
    const { min, pts, reb, ast, stl, blk, to, fgm, fga, threeFgm, threeFga, ftm, fta } = game;
    
    // Handle edge cases
    if (min <= 0) return 0.0;
    
    // Calculate shooting percentages
    const fgPct = fga > 0 ? fgm / fga : 0;
    const threePct = threeFga > 0 ? threeFgm / threeFga : 0;
    const ftPct = fta > 0 ? ftm / fta : 0;
    
    // Normalize stats per 36 minutes (standard for comparison)
    const pace = 36 / min;
    const normalizedPoints = pts * pace;
    const normalizedRebounds = reb * pace;
    const normalizedAssists = ast * pace;
    const normalizedSteals = stl * pace;
    const normalizedBlocks = blk * pace;
    const normalizedTurnovers = to * pace;

    // OFFENSIVE RATING (0-5 points)
    let offensiveRating = 0.9; // Base offensive rating boost
    
    // Points component (0-2.5 points) - more generous scaling
    // Excellent: 18+ pts/36min = 2.5, Good: 12+ = 1.8, Average: 8+ = 1.2
    const pointsScore = Math.min(2.5, normalizedPoints / 7.2);
    offensiveRating += pointsScore;
    
    // Shooting efficiency component (0-2 points)
    let efficiencyScore = 0.3; // Base efficiency boost
    // Field Goal Percentage weight - more generous
    if (fga >= 2) { // Lower threshold for meaningful attempts
        efficiencyScore += fgPct * 1.4; // Increased multiplier
    }
    // Three-point shooting bonus
    if (threeFga >= 1) { // Lower threshold
        efficiencyScore += threePct * 0.6; // Increased bonus
    }
    // Free throw efficiency
    if (fta >= 1) { // Lower threshold
        efficiencyScore += ftPct * 0.4; // Increased bonus
    }
    efficiencyScore = Math.min(2.0, efficiencyScore);
    offensiveRating += efficiencyScore;

    // DEFENSIVE/HUSTLE RATING (0-3 points)
    let defensiveRating = 0;
    
    // Rebounds (0-1.5 points)
    const reboundScore = Math.min(1.5, normalizedRebounds / 8); // 8+ reb/36min = max
    defensiveRating += reboundScore;
    
    // Steals and Blocks (0-1.5 points)
    const stealBlockScore = Math.min(1.5, (normalizedSteals + normalizedBlocks) / 3); // 3+ combined = max
    defensiveRating += stealBlockScore;

    // EFFICIENCY/CARE RATING (0-2 points)
    let efficiencyCare = 2.0; // Start at max, deduct for turnovers
    
    // Turnover penalty
    const turnoverPenalty = Math.min(2.0, normalizedTurnovers / 6); // 6+ TO/36min = -2.0
    efficiencyCare -= turnoverPenalty;
    efficiencyCare = Math.max(0, efficiencyCare);

    // TOTAL RATING
    let totalRating = offensiveRating + defensiveRating + efficiencyCare;
    
    // Scale to 0-10 and round to 1 decimal
    return Math.round(Math.min(10.0, Math.max(0.0, totalRating)) * 10) / 10;
}

function calculateAverageRating(gameRatings) {
    // Filter out NaN values
    const validRatings = gameRatings.filter(r => !isNaN(r));
    if (validRatings.length === 0) return NaN;
    
    // If 3 or fewer games, use all ratings
    if (validRatings.length <= 3) {
        const sum = validRatings.reduce((a, b) => a + b, 0);
        return parseFloat((sum / validRatings.length).toFixed(1));
    }
    
    // Sort ratings from highest to lowest
    const sortedRatings = [...validRatings].sort((a, b) => b - a);
    
    // Remove the lowest 3 ratings
    const ratingsToAverage = sortedRatings.slice(0, -3);
    
    // Calculate average
    const sum = ratingsToAverage.reduce((a, b) => a + b, 0);
    return parseFloat((sum / ratingsToAverage.length).toFixed(1));
}

function calculateAdvancedStats(player) {
    try {
        // Basic percentages
        const fgPct = player.fga > 0 ? player.fgm / player.fga : 0;
        const threePct = player.threeFga > 0 ? player.threeFgm / player.threeFga : 0;
        const ftPct = player.fta > 0 ? player.ftm / player.fta : 0;
        
        // Advanced metrics
        const tsPct = player.pts / (2 * (player.fga + 0.44 * player.fta)) || 0;
        
        // Usage rate (simplified team context)
        const teamFga = 2000; // Example team total for season
        const usgRate = 100 * ((player.fga + 0.44 * player.fta) / teamFga) || 0;

        // New BPM Formula
        const weight = {
            pts: 2.8,
            reb: 1.8,
            ast: 3.2,
            stl: 6.0,
            blk: 5.5,
            to: -3.5,
            fgMiss: -1.8,
            ftMiss: -1.2
        };

        const rawBPM = 
            (player.pts * weight.pts) +
            (player.reb * weight.reb) +
            (player.ast * weight.ast) +
            (player.stl * weight.stl) +
            (player.blk * weight.blk) +
            (player.to * weight.to) +
            ((player.fga - player.fgm) * weight.fgMiss) +
            ((player.fta - player.ftm) * weight.ftMiss);

        const bpm = (rawBPM / (player.gp || 1)) * 0.18;

        // PER calculation
        const per = (
            (player.pts * 1.2) + 
            (player.reb * 1.0) + 
            (player.ast * 1.5) + 
            (player.stl * 2.5) + 
            (player.blk * 2.5) - 
            (player.to * 2.0) - 
            ((player.fga - player.fgm) * 0.5) - 
            ((player.fta - player.ftm) * 0.5)
        ) / (player.gp || 1);

        // Efficiency Rating (EFF)
        const eff = (
            player.pts + 
            (player.reb * 1.2) + 
            (player.ast * 1.5) + 
            (player.stl * 3) + 
            (player.blk * 3) - 
            (player.to * 2) - 
            ((player.fga - player.fgm) * 0.7)
        ) / (player.gp || 1);

        // Offensive/Defensive Ratings
        const ortg = (player.fga + 0.44 * player.fta + player.to) > 0 ?
            (player.pts / (player.fga + 0.44 * player.fta + player.to)) * 100 : 0;
        
        const drtg = player.gp > 0 
            ? 100 - ((player.stl + player.blk * 1.2) / player.gp * 3) 
            : 0;

        return {
            fgPct: fgPct,
            threePct: threePct,
            ftPct: ftPct,
            tsPct: tsPct,
            usgRate: usgRate,
            per: per,
            eff: eff,
            ortg: ortg,
            drtg: drtg,
            bpm: bpm
        };
    } catch (e) {
        console.error('Error calculating advanced stats:', e);
        return {
            fgPct: 0,
            threePct: 0,
            ftPct: 0,
            tsPct: 0,
            usgRate: 0,
            per: 0,
            eff: 0,
            ortg: 0,
            drtg: 0,
            bpm: 0
        };
    }
}