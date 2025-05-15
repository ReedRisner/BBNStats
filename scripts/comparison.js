let allPlayersData = null;
let player1 = null;
let player2 = null;

async function loadPlayerData() {
    try {
        const response = await fetch('data/players.json');
        allPlayersData = await response.json();
        setupSeasonSelect();
        setupPlayerSelects();
    } catch (error) {
        console.error('Error loading player data:', error);
    }
}

function setupSeasonSelect() {
    const seasonSelect = document.getElementById('seasonSelect');
    seasonSelect.addEventListener('change', () => {
        player1 = null;
        player2 = null;
        updatePlayerDropdowns();
        clearComparison();
    });
}

function setupPlayerSelects() {
    const player1Select = document.getElementById('player1Select');
    const player2Select = document.getElementById('player2Select');
    
    player1Select.addEventListener('change', (e) => handlePlayerSelect(e, 'player1'));
    player2Select.addEventListener('change', (e) => handlePlayerSelect(e, 'player2'));
    
    updatePlayerDropdowns();
}

function updatePlayerDropdowns() {
    const season = document.getElementById('seasonSelect').value;
    const players = allPlayersData.seasons[season]?.players || [];
    
    const player1Select = document.getElementById('player1Select');
    const player2Select = document.getElementById('player2Select');
    
    player1Select.innerHTML = '<option value="">Select First Player</option>';
    player2Select.innerHTML = '<option value="">Select Second Player</option>';
    
    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.number;
        option.textContent = `#${player.number} ${player.name}`;
        player1Select.appendChild(option.cloneNode(true));
        player2Select.appendChild(option);
    });
}

function handlePlayerSelect(event, target) {
    const season = document.getElementById('seasonSelect').value;
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
    
    if (target === 'player1') player1 = player;
    if (target === 'player2') player2 = player;
    
    renderComparison();
}

function renderComparison() {
    if (!player1 || !player2) return;
    
    renderPlayerCards();
}

function renderPlayerCards() {
    renderPlayerCard(player1, 'player1Card', player2);
    renderPlayerCard(player2, 'player2Card', player1);
}

function renderPlayerCard(player, elementId, comparisonPlayer) {
    const container = document.getElementById(elementId);
    container.innerHTML = `
        <div class="text-center">
            <img src="images/${document.getElementById('seasonSelect').value}/players/${player.number}.jpg" 
                 class="player-photo-lg" alt="${player.name}"
                 onerror="this.src='images/players/default.jpg'">
            <h3 class="text-uk-blue mt-3 mb-1">#${player.number} ${player.name}</h3>
            <div class="text-muted mb-3">${player.pos} | ${player.ht} | ${player.wt}</div>
            <div class="stats-box">
                ${generateStatsList(player, comparisonPlayer)}
            </div>
        </div>
    `;
}

function generateStatsList(player, comparisonPlayer) {
    const statsToCompare = [
        'ppg', 'rpg', 'apg', 'fg%', '3p%', 
        'blk', 'stl', 'ft%', 'per', 'eff'
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
    switch(stat.toLowerCase()) {
        case 'ppg': return (player.pts/gp).toFixed(1);
        case 'rpg': return (player.reb/gp).toFixed(1);
        case 'apg': return (player.ast/gp).toFixed(1);
        case 'fg%': return player.fga ? `${((player.fgm/player.fga)*100).toFixed(1)}%` : '-';
        case '3p%': return player.threeFga ? `${((player.threeFgm/player.threeFga)*100).toFixed(1)}%` : '-';
        case 'ft%': return player.fta ? `${((player.ftm/player.fta)*100).toFixed(1)}%` : '-';
        case 'blk': return (player.blk/gp).toFixed(1);
        case 'stl': return (player.stl/gp).toFixed(1);
        case 'per':
        case 'eff':
            const adv = calculateAdvancedStats(player);
            return stat === 'per' ? adv.per.toFixed(1) : adv.eff.toFixed(1);
        default: return '-';
    }
}

function clearComparison() {
    document.getElementById('player1Card').innerHTML = '';
    document.getElementById('player2Card').innerHTML = '';
}

// Initialize
document.addEventListener('DOMContentLoaded', loadPlayerData);

// Stats calculation functions
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

        // Shooting efficiencies
        const fgEff = fga >= 2 ? (fgm / fga) : 0;
        const ftEff = fta >= 1 ? (ftm / fta) : 0;
        const threeEff = threeFga >= 1 ? (threeFgm / threeFga) : 0;

        rawScore += Math.min(fgEff * 1.2, 2.5);
        rawScore += Math.min(ftEff * 0.7, 1.5);
        rawScore += Math.min(threeEff * 1.0, 2.0);

        // Normalization
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
        const per = (player.pts + player.reb + player.ast + player.stl + player.blk -
                    (player.fga - player.fgm) - (player.fta - player.ftm) - player.to) / gp;
        const eff = (player.pts + player.reb + player.ast + player.stl + player.blk) / gp;
        return { per, eff };
    } catch (e) {
        console.error('Error calculating advanced stats:', e);
        return { per: 0, eff: 0 };
    }
}