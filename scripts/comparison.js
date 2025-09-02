let allPlayersData = null;
let allGameLogsData = null;
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
        
        // Process game logs and calculate stats
        await processGameLogs();
        
        setupPlayerSelects();
    } catch (error) {
        console.error('Error loading player data:', error);
        alert('Failed to load player data. Please check console for details.');
    }
}

async function processGameLogs() {
    // Reset and calculate player stats from game logs
    for (const season of Object.keys(allPlayersData.seasons)) {
        const players = allPlayersData.seasons[season].players;
        const seasonGames = allGameLogsData.seasons[season]?.games || [];
        
        // Load schedule data for this season to identify exhibition games
        let scheduleData = [];
        try {
            const scheduleResponse = await fetch(`data/${season}-schedule.json`);
            if (scheduleResponse.ok) {
                scheduleData = await scheduleResponse.json();
            }
        } catch (error) {
            console.error(`Error loading schedule for ${season}:`, error);
        }
        
        // Create a map of exhibition games by opponent and date
        const exhibitionGames = {};
        scheduleData.forEach(game => {
            if (game.exh) {
                try {
                    // Validate date format before processing
                    if (!game.date || isNaN(new Date(game.date).getTime())) {
                        console.warn(`Invalid date in schedule: ${game.date}`);
                        return;
                    }
                    
                    const gameDate = new Date(game.date);
                    const normalizedDate = gameDate.toISOString().split('T')[0];
                    
                    // Use both opponent and date as key to avoid conflicts
                    const key = `${game.opponent.toLowerCase().replace('vs ', '').replace(' (exh)', '')}_${normalizedDate}`;
                    exhibitionGames[key] = true;
                    
                    console.log(`Exhibition game: ${key}`);
                } catch (error) {
                    console.error(`Error processing schedule game date: ${game.date}`, error);
                }
            }
        });
        
        // Initialize stats for all players
        players.forEach(player => {
            // Reset cumulative stats
            player.min = 0;
            player.pts = 0;
            player.reb = 0;
            player.ast = 0;
            player.stl = 0;
            player.blk = 0;
            player.to = 0;
            player.fgm = 0;
            player.fga = 0;
            player.threeFgm = 0;
            player.threeFga = 0;
            player.ftm = 0;
            player.fta = 0;
            player.gp = 0; // Games played
            player.gameLogs = [];
            player.nonExhGameLogs = []; // Separate array for non-exhibition games
        });
        
        // Process each game
        seasonGames.forEach(game => {
            try {
                // Validate date format before processing
                if (!game.date || isNaN(new Date(game.date).getTime())) {
                    console.warn(`Invalid date in game log: ${game.date}`);
                    return;
                }
                
                const gameDate = new Date(game.date);
                const normalizedDate = gameDate.toISOString().split('T')[0];
                
                // Create key for comparison (remove "vs " and "(EXH)" from opponent name)
                const opponentKey = `${game.opponent.toLowerCase().replace('vs ', '').replace(' (exh)', '')}_${normalizedDate}`;
                
                // Check if this is an exhibition game
                const isExhibition = exhibitionGames[opponentKey] || false;
                
                console.log(`Game: ${opponentKey}, isExhibition: ${isExhibition}`);
                
                game.boxscore.forEach(playerStat => {
                    const player = players.find(p => p.number == playerStat.number);
                    if (player) {
                        // Add game to player's game logs (all games)
                        player.gameLogs.push({
                            ...playerStat,
                            date: game.date,
                            opponent: game.opponent,
                            result: game.result,
                            exh: isExhibition
                        });
                        
                        // Only update cumulative stats for non-exhibition games
                        if (!isExhibition) {
                            player.nonExhGameLogs.push({
                                ...playerStat,
                                date: game.date,
                                opponent: game.opponent,
                                result: game.result,
                                exh: false
                            });
                            
                            // Update cumulative stats
                            player.gp++;
                            player.min += playerStat.min || 0;
                            player.pts += playerStat.pts || 0;
                            player.reb += playerStat.reb || 0;
                            player.ast += playerStat.ast || 0;
                            player.stl += playerStat.stl || 0;
                            player.blk += playerStat.blk || 0;
                            player.to += playerStat.to || 0;
                            player.fgm += playerStat.fgm || 0;
                            player.fga += playerStat.fga || 0;
                            player.threeFgm += playerStat.threeFgm || 0;
                            player.threeFga += playerStat.threeFga || 0;
                            player.ftm += playerStat.ftm || 0;
                            player.fta += playerStat.fta || 0;
                        }
                    }
                });
            } catch (error) {
                console.error(`Error processing game: ${game.opponent} on ${game.date}`, error);
            }
        });
    }
}

function setupPlayerSelects() {
    const player1Season = document.getElementById('player1Season');
    const player2Season = document.getElementById('player2Season');
    const player1Select = document.getElementById('player1Select');
    const player2Select = document.getElementById('player2Select');
    
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
    const season = document.getElementById(seasonSelectId).value;
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

    // Calculate ratings
    const gameRatings = (player.gameLogs || []).map(calculateGameRating);
    player.rating = calculateAverageRating(gameRatings);
    player.season = season; // Store the season with the player
    
    if (target === 'player1') player1 = player;
    if (target === 'player2') player2 = player;
    
    renderComparison();
}

function renderComparison() {
    if (!player1 || !player2) return;
    
    renderPlayerCards();
    renderComparisonChart();
}

function renderPlayerCards() {
    renderPlayerCard(player1, 'player1Card', player2);
    renderPlayerCard(player2, 'player2Card', player1);
}

function renderPlayerCard(player, elementId, comparisonPlayer) {
    const container = document.getElementById(elementId);
    container.innerHTML = `
        <div class="text-center">
            <img src="images/${player.season}/players/${player.number}.jpg" 
                 class="player-photo-lg" alt="${player.name}"
                 onerror="this.src='images/players/default.jpg'">
            <h3 class="text-uk-blue mt-3 mb-1">#${player.number} ${player.name}</h3>
            <div class="text-muted mb-3">${player.pos} | ${player.ht} | ${player.wt}</div>
            <div class="text-muted mb-3">${player.season}-${parseInt(player.season)+1} Season</div>
            <div class="stats-box">
                ${generateStatsList(player, comparisonPlayer)}
            </div>
        </div>
    `;
}

function generateStatsList(player, comparisonPlayer) {
    const statsToCompare = [
        'ppg', 'rpg', 'apg', 
        'fg%', '3p%', 'ft%', 'ts%',
        'bpg', 'spg', 'per', 'eff',
        'ortg', 'drtg', 'usg%', 'bpm'
    ];
    
    // Calculate advanced stats once per player
    const advancedStats = calculateAdvancedStats(player);
    
    return statsToCompare.map(stat => {
        const value = getStatValue(player, advancedStats, stat);
        const comparisonValue = comparisonPlayer ? 
            getStatValue(comparisonPlayer, calculateAdvancedStats(comparisonPlayer), stat) : null;
        
        // Handle percentage values for comparison
        const cleanValue = value.replace('%', '');
        const cleanComparisonValue = comparisonValue ? comparisonValue.replace('%', '') : null;
        const isHigher = comparisonPlayer && (parseFloat(cleanValue) > parseFloat(cleanComparisonValue));

        return `
            <div class="stat-row">
                <div class="stat-label">${stat.toUpperCase()}</div>
                <div class="stat-value ${isHigher ? 'higher-stat' : ''}">${value}</div>
            </div>
        `;
    }).join('');
}

function getStatValue(player, advancedStats, stat) {
    const gp = player.gp || 1;  // Ensure at least 1 game to prevent division by zero
    
    switch(stat.toLowerCase()) {
        case 'ppg': return (player.pts / gp).toFixed(1);
        case 'rpg': return (player.reb / gp).toFixed(1);
        case 'apg': return (player.ast / gp).toFixed(1);
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
    const averagesStats = ['ppg', 'rpg', 'apg', 'bpg', 'spg'];
    const shootingStats = ['fg%', '3p%', 'ft%', 'ts%'];
    const advancedStats = ['per', 'eff', 'ortg', 'drtg', 'usg%', 'bpm'];

    // Destroy existing charts
    [averagesChart, shootingChart, advancedChart].forEach(chart => {
        if (chart) chart.destroy();
    });

    // Calculate advanced stats once per player
    const player1Advanced = calculateAdvancedStats(player1);
    const player2Advanced = calculateAdvancedStats(player2);
    
    // Create averages chart
    averagesChart = new Chart(
        document.getElementById('averagesChart').getContext('2d'),
        getChartConfig(averagesStats, 'Basic Stats', 15)
    );
    
    // Create shooting stats chart
    shootingChart = new Chart(
        document.getElementById('shootingChart').getContext('2d'),
        getChartConfig(shootingStats, 'Shooting Efficiency', 100)
    );

    // Create advanced stats chart
    advancedChart = new Chart(
        document.getElementById('advancedChart').getContext('2d'),
        getChartConfig(advancedStats, 'Advanced Metrics', 40)
    );
}

function getChartConfig(stats, title, yMax) {
    // Calculate advanced stats once per player
    const player1Advanced = calculateAdvancedStats(player1);
    const player2Advanced = calculateAdvancedStats(player2);
    
    return {
        type: 'bar',
        data: {
            labels: stats.map(stat => stat.toUpperCase()),
            datasets: [{
                label: player1.name,
                data: stats.map(stat => parseFloat(getStatValue(player1, player1Advanced, stat))) || 0,
                backgroundColor: 'rgba(0, 51, 160, 0.7)',
                borderColor: 'rgba(0, 51, 160, 1)',
                borderWidth: 2
            }, {
                label: player2.name,
                data: stats.map(stat => parseFloat(getStatValue(player2, player2Advanced, stat))) || 0,
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