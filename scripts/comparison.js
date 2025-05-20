let allPlayersData = null;
let player1 = null;
let player2 = null;
let averagesChart = null;
let shootingChart = null;
let advancedChart = null;

async function loadPlayerData() {
    try {
        const response = await fetch('data/players.json');
        allPlayersData = await response.json();
        setupPlayerSelects();
    } catch (error) {
        console.error('Error loading player data:', error);
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
        'blk', 'stl', 'per', 'eff',
        'ortg', 'drtg', 'usg%', 'bpm'
    ];
    
    return statsToCompare.map(stat => {
        const value = getStatValue(player, stat);
        const comparisonValue = comparisonPlayer ? getStatValue(comparisonPlayer, stat) : null;
        const isHigher = comparisonPlayer && (parseFloat(value) > parseFloat(comparisonValue));

        return `
            <div class="stat-row">
                <div class="stat-label">${stat.toUpperCase()}</div>
                <div class="stat-value ${isHigher ? 'higher-stat' : ''}">${value}</div>
            </div>
        `;
    }).join('');
}

function getStatValue(player, stat) {
    const gp = player.gp || 1;
    const adv = calculateAdvancedStats(player);
    
    switch(stat.toLowerCase()) {
        case 'ppg': return (player.pts/gp).toFixed(1);
        case 'rpg': return (player.reb/gp).toFixed(1);
        case 'apg': return (player.ast/gp).toFixed(1);
        case 'fg%': return player.fga ? `${((player.fgm/player.fga)*100).toFixed(1)}%` : '-';
        case '3p%': return player.threeFga ? `${((player.threeFgm/player.threeFga)*100).toFixed(1)}%` : '-';
        case 'ft%': return player.fta ? `${((player.ftm/player.fta)*100).toFixed(1)}%` : '-';
        case 'ts%': return adv.tsPct ? `${(adv.tsPct * 100).toFixed(1)}%` : '-';
        case 'blk': return (player.blk/gp).toFixed(1);
        case 'stl': return (player.stl/gp).toFixed(1);
        case 'per': return adv.per.toFixed(1);
        case 'eff': return adv.eff.toFixed(1);
        case 'ortg': return adv.ortg.toFixed(1);
        case 'drtg': return adv.drtg.toFixed(1);
        case 'usg%': return adv.usgRate.toFixed(1) + '%';
        case 'bpm': return adv.bpm.toFixed(1);
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
    const averagesStats = ['ppg', 'rpg', 'apg', 'blk', 'stl'];
    const shootingStats = ['fg%', '3p%', 'ft%', 'ts%'];
    const advancedStats = ['per', 'eff', 'ortg', 'drtg', 'usg%', 'bpm'];

    // Destroy existing charts
    [averagesChart, shootingChart, advancedChart].forEach(chart => {
        if (chart) chart.destroy();
    });

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
    return {
        type: 'bar',
        data: {
            labels: stats.map(stat => stat.toUpperCase()),
            datasets: [{
                label: player1.name,
                data: stats.map(stat => parseFloat(getStatValue(player1, stat))) || 0,
                backgroundColor: 'rgba(0, 51, 160, 0.7)',
                borderColor: 'rgba(0, 51, 160, 1)',
                borderWidth: 2
            }, {
                label: player2.name,
                data: stats.map(stat => parseFloat(getStatValue(player2, stat))) || 0,
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
    try {
        const { pts, reb, ast, stl, blk, to, fgm, fga, threeFgm, threeFga, ftm, fta } = game;
        const weight = { 
            pts: 0.75, 
            reb: 0.95, 
            ast: 1.25, 
            stl: 2.2, 
            blk: 2.0, 
            to: -1.2 
        };
        
        let rawScore = pts * weight.pts +
                      reb * weight.reb +
                      ast * weight.ast +
                      stl * weight.stl +
                      blk * weight.blk +
                      to * weight.to;

        const fgEff = fga >= 2 ? (fgm / fga) : 0;
        const ftEff = fta >= 1 ? (ftm / fta) : 0;
        const threeEff = threeFga >= 1 ? (threeFgm / threeFga) : 0;

        rawScore += Math.min(fgEff * 1.2, 2.5);
        rawScore += Math.min(ftEff * 0.7, 1.5);
        rawScore += Math.min(threeEff * 1.0, 2.0);

        const minuteFactor = Math.cbrt(game.min + 4) + 1.5;
        const scaled = (rawScore / minuteFactor) * 2.8;
        const curvedScore = 10 * (scaled / (scaled + 3.2));
        
        return Math.max(0.0, Math.min(10.0, parseFloat(curvedScore.toFixed(2))));
    } catch (e) {
        console.error('Error calculating game rating:', e);
        return 0;
    }
}

function calculateAverageRating(gameRatings) {
    if (!gameRatings.length) return 0;
    return gameRatings.reduce((a, b) => a + b, 0) / gameRatings.length;
}

function calculateAdvancedStats(player) {
    try {
        const gp = player.gp || 1;
        
        // Basic percentages
        const fgPct = player.fga > 0 ? player.fgm / player.fga : 0;
        const threePct = player.threeFga > 0 ? player.threeFgm / player.threeFga : 0;
        const ftPct = player.fta > 0 ? player.ftm / player.fta : 0;
        const tsPct = player.pts / (2 * (player.fga + 0.44 * player.fta)) || 0;

        // Advanced metrics
        const per = (
            (player.pts * 1.2) + 
            (player.reb * 1.0) + 
            (player.ast * 1.5) + 
            (player.stl * 2.5) + 
            (player.blk * 2.5) - 
            (player.to * 2.0) - 
            ((player.fga - player.fgm) * 0.5) - 
            ((player.fta - player.ftm) * 0.5)
        ) / gp;

        const eff = (
            player.pts + 
            (player.reb * 1.2) + 
            (player.ast * 1.5) + 
            (player.stl * 3) + 
            (player.blk * 3) - 
            (player.to * 2) - 
            ((player.fga - player.fgm) * 0.7)
        ) / gp;

        const ortg = (player.pts / (player.fga + 0.44 * player.fta + player.to)) * 100 || 0;
        const drtg = 95 - ((player.stl + player.blk * 1.2) / gp * 4);
        const usgRate = 100 * ((player.fga + 0.44 * player.fta) / 2000) || 0;

        const bpm = (
            (player.pts * 2.8) +
            (player.reb * 1.8) +
            (player.ast * 3.2) +
            (player.stl * 6.0) +
            (player.blk * 5.5) +
            (player.to * -3.5) +
            ((player.fga - player.fgm) * -1.8) +
            ((player.fta - player.ftm) * -1.2)
        ) / gp * 0.18;

        return {
            tsPct: tsPct,
            per: per,
            eff: eff,
            ortg: ortg,
            drtg: drtg,
            usgRate: usgRate,
            bpm: bpm
        };
    } catch (e) {
        console.error('Error calculating advanced stats:', e);
        return {};
    }
}