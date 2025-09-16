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
    
    // Add per-30-minute toggle listener
    const per30Toggle = document.getElementById('per30Toggle');
    if (per30Toggle) {
        per30Toggle.addEventListener('change', () => {
            if (player1 && player2) {
                renderComparison();
            }
        });
    }
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
    showDownloadButton();
}

function showDownloadButton() {
    // Show the download button when both players are selected
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'block';
    }
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
    
    const per30Toggle = document.getElementById('per30Toggle');
    const isPer30Mode = per30Toggle && per30Toggle.checked;
    
    const statTooltips = {
        'ppg': isPer30Mode ? 'Points Per 30 Minutes' : 'Points Per Game',
        'rpg': isPer30Mode ? 'Rebounds Per 30 Minutes' : 'Rebounds Per Game',
        'apg': isPer30Mode ? 'Assists Per 30 Minutes' : 'Assists Per Game',
        'mpg': isPer30Mode ? 'Minutes Normalized to 30' : 'Minutes Per Game',
        'topg': isPer30Mode ? 'Turnovers Per 30 Minutes' : 'Turnovers Per Game',
        'fg%': 'Field Goal Percentage',
        '3p%': 'Three-Point Percentage',
        'ft%': 'Free Throw Percentage',
        'ts%': 'True Shooting Percentage',
        'bpg': isPer30Mode ? 'Blocks Per 30 Minutes' : 'Blocks Per Game',
        'spg': isPer30Mode ? 'Steals Per 30 Minutes' : 'Steals Per Game',
        'per': isPer30Mode ? 'Player Efficiency Rating (Per 30 Min)' : 'Player Efficiency Rating',
        'eff': isPer30Mode ? 'Efficiency Rating (Per 30 Min)' : 'Efficiency Rating',
        'ortg': isPer30Mode ? 'Offensive Rating (Per 30 Min)' : 'Offensive Rating',
        'drtg': isPer30Mode ? 'Defensive Rating (Per 30 Min, lower is better)' : 'Defensive Rating (lower is better)',
        'usg%': isPer30Mode ? 'Usage Rate (Per 30 Min)' : 'Usage Rate',
        'bpm': isPer30Mode ? 'Box Plus/Minus (Per 30 Min)' : 'Box Plus/Minus'
    };
    
    // Calculate advanced stats once per player
    const advancedStats = calculateAdvancedStats(player, isPer30Mode);
    
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
        comparisonAdvanced = calculateAdvancedStats(comparisonPlayerWithStats, isPer30Mode);
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
    const per30Toggle = document.getElementById('per30Toggle');
    const isPer30Mode = per30Toggle && per30Toggle.checked;
    
    // Calculate per-game values first
    let value;
    switch(stat.toLowerCase()) {
        case 'ppg': value = player.pts / gp; break;
        case 'rpg': value = player.reb / gp; break;
        case 'apg': value = player.ast / gp; break;
        case 'mpg': value = player.min / gp; break;
        case 'topg': value = player.to / gp; break;
        case 'bpg': value = player.blk / gp; break;
        case 'spg': value = player.stl / gp; break;
        case 'fg%': 
            return player.fga > 0 ? ((player.fgm / player.fga) * 100).toFixed(1) + '%' : '-';
        case '3p%': 
            return player.threeFga > 0 ? ((player.threeFgm / player.threeFga) * 100).toFixed(1) + '%' : '-';
        case 'ft%': 
            return player.fta > 0 ? ((player.ftm / player.fta) * 100).toFixed(1) + '%' : '-';
        case 'ts%': 
            return advancedStats.tsPct ? (advancedStats.tsPct * 100).toFixed(1) + '%' : '-';
        case 'per': return advancedStats.per ? advancedStats.per.toFixed(1) : '-';
        case 'eff': return advancedStats.eff ? advancedStats.eff.toFixed(1) : '-';
        case 'ortg': return advancedStats.ortg ? advancedStats.ortg.toFixed(1) : '-';
        case 'drtg': return advancedStats.drtg ? advancedStats.drtg.toFixed(1) : '-';
        case 'usg%': return advancedStats.usgRate ? advancedStats.usgRate.toFixed(1) + '%' : '-';
        case 'bpm': return advancedStats.bpm ? advancedStats.bpm.toFixed(1) : '-';
        default: return '-';
    }
    
    // If per-30-minute mode is enabled and this is a counting stat, normalize it
    if (isPer30Mode && ['ppg', 'rpg', 'apg', 'topg', 'bpg', 'spg'].includes(stat.toLowerCase())) {
        const mpg = player.min / gp;
        if (mpg > 0) {
            value = (value / mpg) * 30; // Normalize to per 30 minutes
        }
    }
    
    // For minutes per game, show 30.0 when in per-30 mode
    if (isPer30Mode && stat.toLowerCase() === 'mpg') {
        return '30.0';
    }
    
    return value.toFixed(1);
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
    hideDownloadButton();
}

function hideDownloadButton() {
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }
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

    // Check if per-30 mode is enabled
    const per30Toggle = document.getElementById('per30Toggle');
    const isPer30Mode = per30Toggle && per30Toggle.checked;

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
    
    // Calculate advanced stats once per player (passing isPer30Mode parameter)
    const player1Advanced = calculateAdvancedStats(player1WithFiltered, isPer30Mode);
    const player2Advanced = calculateAdvancedStats(player2WithFiltered, isPer30Mode);
    
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
                getChartConfig(averagesStats, 'Basic Stats', player1WithFiltered, player2WithFiltered, player1Advanced, player2Advanced)
            );
            console.log('Averages chart created');
        }
        
        if (shootingCanvas) {
            shootingChart = new Chart(shootingCanvas.getContext('2d'),
                getChartConfig(shootingStats, 'Shooting Efficiency', player1WithFiltered, player2WithFiltered, player1Advanced, player2Advanced)
            );
            console.log('Shooting chart created');
        }

        if (playingTimeCanvas) {
            playingTimeChart = new Chart(playingTimeCanvas.getContext('2d'),
                getChartConfig(playingTimeStats, 'Minutes & Ratings', player1WithFiltered, player2WithFiltered, player1Advanced, player2Advanced)
            );
            console.log('Playing time chart created');
        }

        if (advancedCanvas) {
            advancedChart = new Chart(advancedCanvas.getContext('2d'),
                getChartConfig(advancedStats, 'Advanced Metrics', player1WithFiltered, player2WithFiltered, player1Advanced, player2Advanced)
            );
            console.log('Advanced chart created');
        }
    } catch (error) {
        console.error('Error creating charts:', error);
    }
}

function getChartConfig(stats, title, player1Data, player2Data, player1Advanced, player2Advanced) {
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

    // Calculate values for dynamic Y-axis scaling
    const player1Values = stats.map(stat => parseStatValue(player1Data, player1Advanced, stat));
    const player2Values = stats.map(stat => parseStatValue(player2Data, player2Advanced, stat));
    const allValues = [...player1Values, ...player2Values].filter(val => val > 0);
    
    // Determine appropriate Y-axis max based on chart type and values
    let yMax;
    const maxValue = Math.max(...allValues);
    
    if (title === 'Basic Stats') {
        // For basic stats, if all values are under 10, use a smaller scale
        if (maxValue <= 10) {
            yMax = 12;
        } else {
            yMax = 20;
        }
    } else if (title === 'Shooting Efficiency') {
        yMax = 100;
    } else if (title === 'Minutes & Ratings') {
        yMax = 120;
    } else if (title === 'Advanced Metrics') {
        yMax = 30;
    } else {
        yMax = Math.max(20, maxValue * 1.2);
    }

    return {
        type: 'bar',
        data: {
            labels: stats.map(stat => stat.toUpperCase()),
            datasets: [{
                label: player1Data.name,
                data: player1Values,
                backgroundColor: 'rgba(0, 51, 160, 0.7)',
                borderColor: 'rgba(0, 51, 160, 1)',
                borderWidth: 2
            }, {
                label: player2Data.name,
                data: player2Values,
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

async function downloadComparison() {
    if (!player1 || !player2) {
        alert('Please select both players before downloading.');
        return;
    }

    try {
        // Import html2canvas dynamically
        if (!window.html2canvas) {
            // Load html2canvas library
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => performDownload();
            document.head.appendChild(script);
        } else {
            performDownload();
        }
    } catch (error) {
        console.error('Error loading html2canvas:', error);
        alert('Error loading download functionality. Please try again.');
    }
}

async function performDownload() {
    const downloadBtn = document.getElementById('downloadBtn');
    const originalText = downloadBtn.innerHTML;
    
    // Show loading state
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    downloadBtn.disabled = true;
    
    try {
        // Detect if we're on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         window.innerWidth <= 768;
        
        // Create a temporary container with mobile-optimized dimensions
        const tempContainer = document.createElement('div');
        
        if (isMobile) {
            // Mobile: Portrait layout (9:16 ratio)
            tempContainer.style.cssText = `
                position: fixed;
                top: -20000px;
                left: -20000px;
                width: 1080px;
                height: 1920px;
                background: white;
                padding: 30px;
                font-family: Arial, sans-serif;
                z-index: -1;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            `;
        } else {
            // Desktop: Landscape layout (16:9 ratio)
            tempContainer.style.cssText = `
                position: fixed;
                top: -20000px;
                left: -20000px;
                width: 1920px;
                height: 1080px;
                background: white;
                padding: 40px;
                font-family: Arial, sans-serif;
                z-index: -1;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            `;
        }
        
        // Create title
        const title = document.createElement('div');
        title.style.cssText = `
            text-align: center;
            margin-bottom: ${isMobile ? '20px' : '30px'};
            color: #0033A0;
            font-size: ${isMobile ? '28px' : '36px'};
            font-weight: bold;
            letter-spacing: 1px;
        `;
        title.textContent = 'Player Comparison - bbnstats.com';
        
        // Create main content container
        const mainContent = document.createElement('div');
        
        if (isMobile) {
            // Mobile: Stack vertically
            mainContent.style.cssText = `
                display: flex;
                flex-direction: column;
                flex: 1;
                gap: 20px;
                height: 100%;
            `;
        } else {
            // Desktop: Side by side
            mainContent.style.cssText = `
                display: flex;
                flex: 1;
                gap: 40px;
                height: 100%;
                margin-right: 20px;
            `;
        }
        
        // Player comparison section
        const playerSection = document.createElement('div');
        
        if (isMobile) {
            playerSection.style.cssText = `
                flex: 0 0 auto;
                display: flex;
                flex-direction: column;
            `;
        } else {
            playerSection.style.cssText = `
                flex: 0 0 25%;
                display: flex;
                flex-direction: column;
                max-width: 480px;
            `;
        }
        
        // Charts section
        const chartsSection = document.createElement('div');
        
        if (isMobile) {
            chartsSection.style.cssText = `
                flex: 1;
                border: 3px solid #0033A0;
                border-radius: 15px;
                background: white;
                padding: 20px;
            `;
        } else {
            chartsSection.style.cssText = `
                flex: 0 0 75%;
                border: 3px solid #0033A0;
                border-radius: 15px;
                background: white;
                padding: 30px;
            `;
        }
        
        // Create player info section (compact for mobile)
        const playerSelectContainer = document.createElement('div');
        playerSelectContainer.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${isMobile ? '8px' : '10px'};
            margin-bottom: ${isMobile ? '10px' : '15px'};
            font-size: ${isMobile ? '10px' : '12px'};
        `;
        
        // Add season and filter info for both players
        const player1Section = createPlayerInfoSection(player1, isMobile);
        const player2Section = createPlayerInfoSection(player2, isMobile);
        
        playerSelectContainer.appendChild(player1Section);
        playerSelectContainer.appendChild(player2Section);
        
        // Add per-30 toggle info if enabled
        const per30Toggle = document.getElementById('per30Toggle');
        const isPer30Mode = per30Toggle && per30Toggle.checked;
        
        if (isPer30Mode) {
            const toggleInfo = document.createElement('div');
            toggleInfo.style.cssText = `
                grid-column: 1 / -1;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: ${isMobile ? '3px 0' : '5px 0'};
                padding: ${isMobile ? '3px' : '5px'};
                background-color: rgba(0, 51, 160, 0.1);
                border-radius: 6px;
                border: 1px solid #0033A0;
                font-weight: bold;
                color: #0033A0;
                font-size: ${isMobile ? '8px' : '10px'};
            `;
            toggleInfo.textContent = '✓ Per-30-Minute Stats';
            playerSelectContainer.appendChild(toggleInfo);
        }
        
        // Create player cards container
        const playerCardsContainer = document.createElement('div');
        
        if (isMobile) {
            playerCardsContainer.style.cssText = `
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 10px;
                align-items: start;
            `;
        } else {
            playerCardsContainer.style.cssText = `
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                flex: 1;
                align-items: start;
            `;
        }
        
        // Get current stats for both players
        const player1Stats = getPlayerStats(player1);
        const player2Stats = getPlayerStats(player2);
        
        // Create player cards
        const player1Card = createPlayerCardForDownload(player1, player1Stats, player2, true, isMobile);
        const player2Card = createPlayerCardForDownload(player2, player2Stats, player1, true, isMobile);
        
        playerCardsContainer.appendChild(player1Card);
        playerCardsContainer.appendChild(player2Card);
        
        playerSection.appendChild(playerSelectContainer);
        playerSection.appendChild(playerCardsContainer);
        
        // Create charts section
        const chartsTitle = document.createElement('h2');
        chartsTitle.style.cssText = `
            text-align: center;
            color: #0033A0;
            margin: 0 0 ${isMobile ? '15px' : '20px'} 0;
            font-size: ${isMobile ? '18px' : '24px'};
        `;
        chartsTitle.textContent = 'Statistical Comparison';
        chartsSection.appendChild(chartsTitle);
        
        // Create charts grid
        const chartsGrid = document.createElement('div');
        
        if (isMobile) {
            // Mobile: Single column, stacked charts
            chartsGrid.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 15px;
                height: calc(100% - 50px);
            `;
        } else {
            // Desktop: 2x2 grid
            chartsGrid.style.cssText = `
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: 1fr 1fr;
                gap: 15px;
                height: calc(100% - 60px);
            `;
        }
        
        // Convert charts to images
        const chartConfigs = [
            { id: 'averagesChart', title: 'Basic Stats' },
            { id: 'shootingChart', title: 'Shooting Efficiency' },
            { id: 'playingTimeChart', title: 'Minutes & Ratings' },
            { id: 'advancedChart', title: 'Advanced Metrics' }
        ];
        
        for (const config of chartConfigs) {
            const chartCanvas = document.getElementById(config.id);
            if (chartCanvas) {
                const chartContainer = document.createElement('div');
                chartContainer.style.cssText = `
                    border: 2px solid #0033A0;
                    border-radius: 10px;
                    padding: ${isMobile ? '8px' : '10px'};
                    background: white;
                    display: flex;
                    flex-direction: column;
                    ${isMobile ? 'min-height: 200px;' : ''}
                `;
                
                const chartTitle = document.createElement('h3');
                chartTitle.style.cssText = `
                    color: #0033A0;
                    margin: 0 0 ${isMobile ? '8px' : '10px'} 0;
                    font-size: ${isMobile ? '14px' : '16px'};
                    text-align: center;
                `;
                chartTitle.textContent = config.title;
                chartContainer.appendChild(chartTitle);
                
                const chartImage = document.createElement('img');
                chartImage.src = chartCanvas.toDataURL('image/png', 1.0);
                chartImage.style.cssText = `
                    width: 100%;
                    height: ${isMobile ? '150px' : '100%'};
                    object-fit: contain;
                    flex: 1;
                `;
                chartContainer.appendChild(chartImage);
                
                chartsGrid.appendChild(chartContainer);
            }
        }
        
        chartsSection.appendChild(chartsGrid);
        
        // Append sections to main content
        if (isMobile) {
            mainContent.appendChild(playerSection);
            mainContent.appendChild(chartsSection);
        } else {
            mainContent.appendChild(playerSection);
            mainContent.appendChild(chartsSection);
        }
        
        // Append all content to temp container
        tempContainer.appendChild(title);
        tempContainer.appendChild(mainContent);
        document.body.appendChild(tempContainer);
        
        // Wait for content to render
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Capture the image
        const canvas = await html2canvas(tempContainer, {
            backgroundColor: '#ffffff',
            scale: isMobile ? 0.8 : 1.2,
            useCORS: true,
            allowTaint: true,
            width: isMobile ? 1080 : 1920,
            height: isMobile ? 1920 : 1080,
            scrollX: 0,
            scrollY: 0,
            logging: false
        });
        
        // Clean up temp container
        document.body.removeChild(tempContainer);
        
        // Handle download/save based on device
        if (isMobile && navigator.share && navigator.canShare) {
            // Use Web Share API for mobile if available
            canvas.toBlob(async (blob) => {
                const file = new File([blob], `player-comparison-${player1.name.replace(/\s+/g, '-')}-vs-${player2.name.replace(/\s+/g, '-')}.png`, {
                    type: 'image/png'
                });
                
                if (navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Player Comparison',
                            text: `Comparison between ${player1.name} and ${player2.name}`
                        });
                    } catch (error) {
                        // Fallback to regular download
                        downloadImage(canvas);
                    }
                } else {
                    downloadImage(canvas);
                }
            }, 'image/png', 0.9);
        } else if (isMobile) {
            // Mobile fallback: Try to open image in new tab for saving
            const dataUrl = canvas.toDataURL('image/png', 0.9);
            const newWindow = window.open();
            newWindow.document.write(`
                <html>
                <head><title>Player Comparison - Long press to save</title></head>
                <body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center;">
                    <img src="${dataUrl}" style="max-width:100%; max-height:100%;" alt="Player Comparison - Long press to save to photos"/>
                </body>
                </html>
            `);
        } else {
            // Desktop: Regular download
            downloadImage(canvas);
        }
        
    } catch (error) {
        console.error('Error generating download:', error);
        alert('Error generating image. Please try again.');
    } finally {
        // Reset button
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
}

// Helper function to create player info sections
function createPlayerInfoSection(player, isMobile) {
    const section = document.createElement('div');
    section.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: ${isMobile ? '3px' : '5px'};
    `;
    
    const seasonInfo = document.createElement('div');
    seasonInfo.style.cssText = `
        background: #f8f9fa;
        padding: ${isMobile ? '3px 6px' : '4px 8px'};
        border-radius: 4px;
        border: 1px solid #0033A0;
        text-align: center;
        font-weight: bold;
        color: #0033A0;
        font-size: ${isMobile ? '8px' : '10px'};
    `;
    seasonInfo.textContent = `${player.season}-${parseInt(player.season)+1}`;
    
    const filterInfo = document.createElement('div');
    filterInfo.style.cssText = `
        background: #e9ecef;
        padding: ${isMobile ? '2px 4px' : '3px 6px'};
        border-radius: 3px;
        text-align: center;
        font-size: ${isMobile ? '7px' : '9px'};
        color: #666;
    `;
    const filterText = player.currentFilter ? getFilterDisplayText(player.currentFilter) : 'Whole Season';
    filterInfo.textContent = filterText;
    
    section.appendChild(seasonInfo);
    section.appendChild(filterInfo);
    
    return section;
}

// Helper function to get player stats
function getPlayerStats(player) {
    return player.filteredStats || {
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
}

// Helper function to handle regular download
function downloadImage(canvas) {
    const link = document.createElement('a');
    link.download = `player-comparison-${player1.name.replace(/\s+/g, '-')}-vs-${player2.name.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png', 0.9);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Update the createPlayerCardForDownload function to handle mobile sizing
function createPlayerCardForDownload(player, stats, comparisonPlayer, isCompact = false, isMobile = false) {
    const card = document.createElement('div');
    card.style.cssText = `
        border: 3px solid #0033A0;
        border-radius: 15px;
        background: white;
        padding: ${isMobile ? '12px' : (isCompact ? '20px' : '30px')};
        text-align: center;
        flex: 1;
    `;
    
    // Player photo
    const photo = document.createElement('img');
    photo.src = `images/${player.season}/players/${player.number}.jpg`;
    photo.style.cssText = `
        width: ${isMobile ? '50px' : (isCompact ? '80px' : '150px')};
        height: ${isMobile ? '50px' : (isCompact ? '80px' : '150px')};
        border-radius: 50%;
        object-fit: cover;
        border: 4px solid #0033A0;
        margin-bottom: ${isMobile ? '6px' : (isCompact ? '10px' : '20px')};
    `;
    photo.onerror = function() {
        this.style.display = 'none';
    };
    card.appendChild(photo);
    
    // Player name and info
    const name = document.createElement('h3');
    name.style.cssText = `
        color: #0033A0;
        margin: 0 0 ${isMobile ? '4px' : '8px'} 0;
        font-size: ${isMobile ? '12px' : (isCompact ? '18px' : '28px')};
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    `;
    name.textContent = `#${player.number} ${player.name}`;
    card.appendChild(name);
    
    const details = document.createElement('div');
    details.style.cssText = `
        color: #666;
        margin-bottom: ${isMobile ? '8px' : '15px'};
        font-size: ${isMobile ? '8px' : (isCompact ? '12px' : '16px')};
    `;
    details.innerHTML = `${player.pos} | ${player.ht} | ${player.wt}`;
    card.appendChild(details);
    
    const filter = document.createElement('div');
    filter.style.cssText = `
        color: #666;
        margin-bottom: ${isMobile ? '8px' : '15px'};
        font-size: ${isMobile ? '7px' : (isCompact ? '11px' : '14px')};
    `;
    const filterText = player.currentFilter ? getFilterDisplayText(player.currentFilter) : 'Whole Season';
    filter.textContent = `${filterText} (${stats.gp} games)`;
    card.appendChild(filter);
    
    // Stats section - more compact for mobile
    const statsSection = document.createElement('div');
    statsSection.style.cssText = `
        border-top: 2px solid #0033A0;
        padding-top: ${isMobile ? '8px' : '15px'};
        margin-top: ${isMobile ? '8px' : '15px'};
    `;
    
    // Create player object with filtered stats for calculations
    const playerWithFilteredStats = { ...player, ...stats };
    
    // Show fewer stats on mobile to fit better
    const statsToShow = isMobile 
        ? ['ppg', 'rpg', 'apg', 'fg%', '3p%', 'ft%', 'per', 'eff'] 
        : ['mpg', 'ppg', 'rpg', 'apg', 'topg', 'fg%', '3p%', 'ft%', 'ts%', 'bpg', 'spg', 'per', 'eff', 'ortg', 'drtg', 'usg%', 'bpm'];
    
    const per30Toggle = document.getElementById('per30Toggle');
    const isPer30Mode = per30Toggle && per30Toggle.checked;
    const advancedStats = calculateAdvancedStats(playerWithFilteredStats, isPer30Mode);
    
    // For comparison player, use filtered stats if available
    let comparisonPlayerWithStats = null;
    let comparisonAdvanced = null;
    
    if (comparisonPlayer) {
        const comparisonStats = getPlayerStats(comparisonPlayer);
        comparisonPlayerWithStats = { ...comparisonPlayer, ...comparisonStats };
        comparisonAdvanced = calculateAdvancedStats(comparisonPlayerWithStats, isPer30Mode);
    }
    
    // Create stats layout
    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: ${isMobile ? '2px' : '4px'};
        font-size: ${isMobile ? '9px' : '13px'};
    `;
    
    statsToShow.forEach(stat => {
        const value = getStatValue(playerWithFilteredStats, advancedStats, stat);
        const comparisonValue = comparisonPlayerWithStats ? 
            getStatValue(comparisonPlayerWithStats, comparisonAdvanced, stat) : null;
        
        const isHigher = comparisonPlayerWithStats && isStatHigher(value, comparisonValue, stat);
        
        const statRow = document.createElement('div');
        statRow.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: ${isMobile ? '2px 6px' : '5px 10px'};
            border-radius: 5px;
            min-height: ${isMobile ? '16px' : '24px'};
            ${isHigher ? 'background-color: rgba(0, 51, 160, 0.1); font-weight: bold; color: #0033A0;' : ''}
        `;
        
        const label = document.createElement('span');
        label.style.cssText = `font-weight: bold; color: #0033A0; font-size: ${isMobile ? '8px' : '12px'};`;
        label.textContent = stat.toUpperCase();
        
        const val = document.createElement('span');
        val.style.cssText = `font-size: ${isMobile ? '9px' : '13px'}; font-weight: 600;`;
        val.textContent = value;
        
        statRow.appendChild(label);
        statRow.appendChild(val);
        statsContainer.appendChild(statRow);
    });
    
    statsSection.appendChild(statsContainer);
    card.appendChild(statsSection);
    
    return card;
}

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

function calculateAdvancedStats(player, isPer30Mode = false) {
    try {
        const gp = player.gp || 1;
        const mpg = player.min / gp;
        
        // Basic percentages (these don't change with per-30 normalization)
        const fgPct = player.fga > 0 ? player.fgm / player.fga : 0;
        const threePct = player.threeFga > 0 ? player.threeFgm / player.threeFga : 0;
        const ftPct = player.fta > 0 ? player.ftm / player.fta : 0;
        
        // True shooting percentage (doesn't change)
        const tsPct = player.pts / (2 * (player.fga + 0.44 * player.fta)) || 0;
        
        // For per-30 mode, normalize all counting stats
        let pts, reb, ast, stl, blk, to, fgm, fga, threeFgm, threeFga, ftm, fta;
        
        if (isPer30Mode && mpg > 0) {
            const scaleFactor = 30 / mpg;
            pts = player.pts / gp * scaleFactor;
            reb = player.reb / gp * scaleFactor;
            ast = player.ast / gp * scaleFactor;
            stl = player.stl / gp * scaleFactor;
            blk = player.blk / gp * scaleFactor;
            to = player.to / gp * scaleFactor;
            fgm = player.fgm / gp * scaleFactor;
            fga = player.fga / gp * scaleFactor;
            threeFgm = player.threeFgm / gp * scaleFactor;
            threeFga = player.threeFga / gp * scaleFactor;
            ftm = player.ftm / gp * scaleFactor;
            fta = player.fta / gp * scaleFactor;
        } else {
            // Use per-game stats
            pts = player.pts / gp;
            reb = player.reb / gp;
            ast = player.ast / gp;
            stl = player.stl / gp;
            blk = player.blk / gp;
            to = player.to / gp;
            fgm = player.fgm / gp;
            fga = player.fga / gp;
            threeFgm = player.threeFgm / gp;
            threeFga = player.threeFga / gp;
            ftm = player.ftm / gp;
            fta = player.fta / gp;
        }
        
        // Usage rate calculation (adjusted for per-30 if needed)
        const teamFga = isPer30Mode ? 2000 * (30/40) : 2000; // Adjust team pace for per-30
        const usgRate = 100 * ((player.fga + 0.44 * player.fta) / teamFga) || 0;
        
        // BPM Formula (normalized)
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
            (pts * weight.pts) +
            (reb * weight.reb) +
            (ast * weight.ast) +
            (stl * weight.stl) +
            (blk * weight.blk) +
            (to * weight.to) +
            ((fga - fgm) * weight.fgMiss) +
            ((fta - ftm) * weight.ftMiss);

        const bpm = rawBPM * 0.18;

        // PER calculation (normalized)
        const per = (
            (pts * 1.2) + 
            (reb * 1.0) + 
            (ast * 1.5) + 
            (stl * 2.5) + 
            (blk * 2.5) - 
            (to * 2.0) - 
            ((fga - fgm) * 0.5) - 
            ((fta - ftm) * 0.5)
        );

        // Efficiency Rating (EFF) (normalized)
        const eff = pts + (reb * 1.2) + (ast * 1.5) + (stl * 3) + (blk * 3) - (to * 2) - ((fga - fgm) * 0.7);

        // Offensive Rating (normalized)
        const ortg = (fga + 0.44 * fta + to) > 0 ?
            (pts / (fga + 0.44 * fta + to)) * 100 : 0;
        
        // Defensive Rating (normalized, lower is better)
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