// Initialize data and load default season
let allPlayersData = null;
// In players.js, add at the top
let currentSortKey = null;
let currentSortDirection = 'desc'; // Default to descending

async function loadPlayerData() {
    try {
        // Corrected path for players.json
        const response = await fetch('data/players.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        allPlayersData = await response.json();
        loadPlayerStats('2025');
    } catch (error) {
        console.error('Error loading player data:', error);
        alert('Failed to load player data. Please check console for details.');
    }
}
// In players.js, add this function
function sortPlayers(players, sortKey, direction) {
    return players.slice().sort((a, b) => {
        const aGp = a.gp || 1;
        const bGp = b.gp || 1;
        let aValue, bValue;

        switch (sortKey) {
            case 'ppg':
                aValue = a.pts / aGp;
                bValue = b.pts / bGp;
                break;
            case 'rpg':
                aValue = a.reb / aGp;
                bValue = b.reb / bGp;
                break;
            case 'apg':
                aValue = a.ast / aGp;
                bValue = b.ast / bGp;
                break;
            default:
                aValue = 0;
                bValue = 0;
        }

        return direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
}

function calculateGameRating(game) {
    try {
        // Adjusted weights - still generous but more balanced
        let score = (game.pts * 0.6) + (game.reb * 0.9) + (game.ast * 1.0) +
                   (game.stl * 1.8) + (game.blk * 1.8) - (game.to * 1.0);

        // Shooting adjustments - still rewarding but with slightly higher standards
        const fgPct = game.fga > 0 ? game.fgm / game.fga : 0;
        if (game.fga > 4) {
            if (fgPct > 0.55) score += 3;
            else if (fgPct > 0.45) score += 2;
            else if (fgPct > 0.35) score += 1;
            else if (fgPct < 0.3) score -= 1.5;
        }

        const threePct = game.threeFga > 0 ? game.threeFgm / game.threeFga : 0;
        if (game.threeFga > 3) {
            if (threePct > 0.4) score += 2;
            else if (threePct > 0.35) score += 1;
            else if (threePct > 0.25) score += 0.5;
            else if (threePct < 0.2) score -= 1;
        }

        const ftPct = game.fta > 0 ? game.ftm / game.fta : 0;
        if (game.fta > 3) {
            if (ftPct > 0.85) score += 1.5;
            else if (ftPct > 0.75) score += 1;
            else if (ftPct < 0.6) score -= 1;
        }

        // Final scaling adjustment
        let rating = score / 3.2;  // Between previous 3 and original 4
        return Math.min(10, Math.max(0, Math.round(rating * 10) / 10));
    } catch (e) {
        console.error('Error calculating game rating:', e);
        return 0;
    }
}



function loadPlayerStats(season) {
    try {
        if (!allPlayersData) {
            console.error('Player data not loaded');
            return;
        }
        let players = allPlayersData.seasons[season]?.players || [];
        
        
        // Apply sorting if a sort key is selected
        if (currentSortKey) {
            players = sortPlayers(players, currentSortKey, currentSortDirection);
        }

        // Rest of the function remains the same...
        const tbody = document.getElementById('playersTableBody');
        tbody.innerHTML = '';
        
        
        tbody.innerHTML = '';

        players.forEach(player => {
            const gameRatings = (player.gameLogs || []).map(calculateGameRating);
            const avgRating = gameRatings.length ? 
                gameRatings.reduce((a, b) => a + b, 0) / gameRatings.length : 0;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="images/${season}/players/${player.number}.jpg" 
                        class="player-photo" alt="${player.name}"
                        onerror="this.src='images/players/default.jpg'">
                    <strong>#${player.number} ${player.name}</strong>
                </td>
                <td>${player.grade || ''}</td>  <!-- Add this line -->
                <td>${player.pos}</td>
                <td>${player.ht}</td>
                <td>${player.wt}</td>
                <td>${(player.pts / (player.gp || 1)).toFixed(1)}</td>
                <td>${(player.reb / (player.gp || 1)).toFixed(1)}</td>
                <td>${(player.ast / (player.gp || 1)).toFixed(1)}</td>
                <td>
                    <span class="rating-cell rating-${Math.floor(avgRating)}">
                        ${avgRating.toFixed(1)}
                    </span>
                </td>
            `;

            row.addEventListener('click', () => {
                try {
                    showPlayerDetail(player, gameRatings, season);
                } catch (e) {
                    console.error('Error showing player detail:', e);
                    alert('Error showing player details. Check console.');
                }
            });
            
            tbody.appendChild(row);
        });
    } catch (e) {
        console.error('Error loading player stats:', e);
    }
}


function calculateAdvancedStats(player) {
    try {
        // Calculate basic percentages
        const fgPct = player.fga > 0 ? player.fgm / player.fga : 0;
        const threePct = player.threeFga > 0 ? player.threeFgm / player.threeFga : 0;
        const ftPct = player.fta > 0 ? player.ftm / player.fta : 0;
        
        // Advanced metrics calculations
        const efgPct = (player.fgm + 0.5 * player.threeFgm) / player.fga || 0;
        const tsPct = player.pts / (2 * (player.fga + 0.44 * player.fta)) || 0;
        
        // Usage rate calculation (simplified)
        const teamFga = 237 + 246 + 415 + 209 + 257 + 313 + 167 + 121 + 43 + 72 + 80 + 51;
        const teamFta = 107 + 183 + 192 + 98 + 38 + 35 + 43 + 32 + 7 + 15 + 20 + 8;
        const usgRate = 100 * ((player.fga + 0.44 * player.fta) / (teamFga + 0.44 * teamFta)) || 0;

        // Player Efficiency Rating (simplified)
        const per = (player.pts + player.reb + player.ast + player.stl + player.blk 
                   - (player.fga - player.fgm) - (player.fta - player.ftm) - player.to) 
                   / (player.gp || 1);

        return {
            fgPct: fgPct,
            threePct: threePct,
            ftPct: ftPct,
            efgPct: efgPct,
            tsPct: tsPct,
            usgRate: usgRate,
            per: per,
            ortg: 110,  // Placeholder values
            drtg: 95,   // for demonstration
            bpm: 2.5,
            vorp: 1.8,
            ws: 3.2
        };
    } catch (e) {
        console.error('Error calculating advanced stats:', e);
        return {};
    }
}

function updateSortArrows(sortKey, direction) {
    document.querySelectorAll('[data-sort-key]').forEach(header => {
        header.classList.remove('active-sort', 'asc', 'desc');
        if (header.dataset.sortKey === sortKey) {
            header.classList.add('active-sort', direction);
        }
    });
}


function showPlayerDetail(player, gameRatings = [], season) {
    try {
        // Calculate advanced stats first
        const advancedStats = calculateAdvancedStats(player);

        const playerImg = document.getElementById('detailPlayerPhoto');
        playerImg.src = `images/${season}/players/${player.number}.jpg`;
        playerImg.onerror = () => playerImg.src = 'images/players/default.jpg';
        
        // Calculate average rating
        const avgRating = gameRatings.length ? 
            gameRatings.reduce((a, b) => a + b, 0) / gameRatings.length : 0;
        
        // Calculate rating stats
        const ratingStats = {
            bestRating: gameRatings.length ? Math.max(...gameRatings) : 0,
            worstRating: gameRatings.length ? Math.min(...gameRatings) : 0,
            consistency: gameRatings.length ? 
                (10 - Math.sqrt(gameRatings
                    .map(r => Math.pow(r - avgRating, 2))
                    .reduce((a, b) => a + b, 0) / gameRatings.length)) : 0,
            last5: gameRatings.slice(-5)
        };

        document.getElementById('detailPlayerName').textContent = `#${player.number} ${player.name}`;
        document.getElementById('detailPlayerInfo').textContent = 
            `${player.grade || ''} | ${player.pos} | ${player.ht} | ${player.wt} `;
        document.getElementById('detailPlayerRating').innerHTML = `
            <span class="rating-cell rating-${Math.floor(avgRating)}">
                ${avgRating.toFixed(1)}
            </span>`;

        // Update main stat cards
        const safeGP = player.gp || 1; // Prevent division by zero
        document.getElementById('statMinutes').textContent = (player.min / safeGP).toFixed(1);
        document.getElementById('statPoints').textContent = (player.pts / safeGP).toFixed(1);
        document.getElementById('statAssists').textContent = (player.ast / safeGP).toFixed(1);
        document.getElementById('statRebounds').textContent = (player.reb / safeGP).toFixed(1);

        // Update shooting stats
        document.getElementById('statFgPct').textContent = 
            (advancedStats.fgPct * 100).toFixed(1) + "%";
        document.getElementById('statThreePct').textContent = 
            (advancedStats.threePct * 100).toFixed(1) + "%";
        document.getElementById('statFtPct').textContent = 
            (advancedStats.ftPct * 100).toFixed(1) + "%";
        document.getElementById('statEfgPct').textContent = 
            (advancedStats.efgPct * 100).toFixed(1) + "%";
        document.getElementById('statTsPct').textContent = 
            (advancedStats.tsPct * 100).toFixed(1) + "%";
        document.getElementById('statUsgRate').textContent = 
            advancedStats.usgRate.toFixed(1) + "%";

        // Update advanced metrics
        document.getElementById('statPer').textContent = 
            advancedStats.per.toFixed(1);
        document.getElementById('statOrtg').textContent = 
            advancedStats.ortg.toFixed(1);
        document.getElementById('statDrtg').textContent = 
            advancedStats.drtg.toFixed(1);
        document.getElementById('statBpm').textContent = 
            advancedStats.bpm.toFixed(1);
        document.getElementById('statVorp').textContent = 
            advancedStats.vorp.toFixed(1);
        document.getElementById('statWs').textContent = 
            advancedStats.ws.toFixed(1);

        // Update rating stats
        document.getElementById('statBestRating').innerHTML = `
            <span class="rating-cell rating-${Math.floor(ratingStats.bestRating)}">
                ${ratingStats.bestRating.toFixed(1)}
            </span>`;
        document.getElementById('statWorstRating').innerHTML = `
            <span class="rating-cell rating-${Math.floor(ratingStats.worstRating)}">
                ${ratingStats.worstRating.toFixed(1)}
            </span>`;
        document.getElementById('statConsistency').textContent = 
            ratingStats.consistency.toFixed(1);

        // Update recent ratings
        const recentRatings = document.getElementById('recentRatings');
        recentRatings.innerHTML = '';
        ratingStats.last5.forEach(rating => {
            const ratingEl = document.createElement('div');
            ratingEl.className = `rating-cell rating-${Math.floor(rating)}`;
            ratingEl.textContent = rating.toFixed(1);
            recentRatings.appendChild(ratingEl);
        });

        // Update game logs
        const gameLogsBody = document.getElementById('gameLogsBody');
        gameLogsBody.innerHTML = player.gameLogs.map((game, index) => {
            if (Object.keys(game).length === 0) return ''; // Skip empty game logs
            return `
                <tr class="game-log-row">
                    <td>${game.date || '-'}</td>
                    <td>${game.opponent || '-'}</td>
                    <td>${game.min ? game.min.toFixed(1) : '-'}</td>
                    <td>${game.pts || '-'}</td>
                    <td>
                        <span class="rating-cell rating-${Math.floor(gameRatings[index] || 0)}">
                            ${(gameRatings[index] || 0).toFixed(1)}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        // Show detail section
        document.getElementById('playerListSection').style.display = 'none';
        document.getElementById('playerDetailSection').style.display = 'block';
        setTimeout(() => {
            document.getElementById('playerDetailSection').style.opacity = 1;
        }, 10);

    } catch (error) {
        console.error('Error showing player detail:', error);
        alert('Failed to load player profile. Check console for details.');
    }
}

// Initialize everything with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadPlayerData();
        new bootstrap.Dropdown(document.querySelector('.dropdown-toggle'));
    } catch (e) {
        console.error('Initialization error:', e);
    }
});

document.querySelectorAll('[data-sort-key]').forEach(header => {
    header.addEventListener('click', function() {
        const sortKey = this.dataset.sortKey;
        if (currentSortKey === sortKey) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortKey = sortKey;
            currentSortDirection = 'desc';
        }
        updateSortArrows(currentSortKey, currentSortDirection);
        loadPlayerStats(document.getElementById('seasonSelect').value);
    });
});

document.getElementById('seasonSelect').addEventListener('change', function() {
    try {
        loadPlayerStats(this.value);
    } catch (e) {
        console.error('Season change error:', e);
    }
});

document.getElementById('backButton').addEventListener('click', () => {
    try {
        document.getElementById('playerDetailSection').style.display = 'none';
        document.getElementById('playerListSection').style.display = 'block';
    } catch (e) {
        console.error('Back button error:', e);
    }
});