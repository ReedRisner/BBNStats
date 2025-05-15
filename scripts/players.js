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

function showGameModal(game, rating) {
    const content = `
        <div class="row">
            <div class="col-6">
                <p class="mb-1"><strong>Date:</strong> ${game.date}</p>
                <p class="mb-1"><strong>Opponent:</strong> ${game.opponent}</p>
                <p class="mb-1"><strong>Result:</strong> ${game.result}</p>
                <p class="mb-1"><strong>Rating:</strong> 
                    <span class="rating-cell rating-${Math.floor(rating)}">
                        ${rating.toFixed(1)}
                    </span>
                </p>
            </div>
            <div class="col-6">
                <p class="mb-1"><strong>Minutes:</strong> ${game.min.toFixed(1)}</p>
                <p class="mb-1"><strong>PTS:</strong> ${game.pts}</p>
                <p class="mb-1"><strong>REB:</strong> ${game.reb}</p>
                <p class="mb-1"><strong>AST:</strong> ${game.ast}</p>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-12">
                <p class="mb-1"><strong>Shooting:</strong> 
                    ${game.fgm}/${game.fga} FG • 
                    ${game.threeFgm}/${game.threeFga} 3PT • 
                    ${game.ftm}/${game.fta} FT
                </p>
                <p class="mb-1"><strong>Defense:</strong> 
                    ${game.stl} STL • ${game.blk} BLK • ${game.to} TO
                </p>
            </div>
        </div>
    `;
    
    document.getElementById('gameStatsContent').innerHTML = content;
    const modal = new bootstrap.Modal('#gameStatsModal');
    modal.show();
}

/* This is old calcuate rating system
function calculateGameRating(game) {
    try {
        // Slightly reduced weights from previous version
        let score = (game.pts * 0.65) + (game.reb * 1.0) + (game.ast * 1.0) +
                   (game.stl * 1.8) + (game.blk * 1.8) - (game.to * 0.7);

        // Tightened shooting efficiency requirements
        const fgPct = game.fga > 0 ? game.fgm / game.fga : 0;
        if (game.fga > 4) {
            if (fgPct > 0.60) score += 3;
            else if (fgPct > 0.55) score += 2;
            else if (fgPct > 0.50) score += 1;
            else if (fgPct < 0.35) score -= 1;
        }

        const threePct = game.threeFga > 0 ? game.threeFgm / game.threeFga : 0;
        if (game.threeFga > 3) {
            if (threePct > 0.45) score += 2.5;
            else if (threePct > 0.40) score += 1.5;
            else if (threePct > 0.35) score += 0.5;
            else if (threePct < 0.25) score -= 0.5;
        }

        const ftPct = game.fta > 0 ? game.ftm / game.fta : 0;
        if (game.fta > 3) {
            if (ftPct > 0.90) score += 1.5;
            else if (ftPct > 0.80) score += 1;
            else if (ftPct < 0.65) score -= 0.5;
        }

        // Adjusted scaling and clamping
        let rating = score / 3.0;  // Increased divisor from 2.8
        rating = Math.min(9.9, Math.max(0, Math.round(rating * 10) / 10)); // Hard cap at 9.9
        
        return rating;
    } catch (e) {
        console.error('Error calculating game rating:', e);
        return 0;
    }
}
*/

function calculateGameRating(game) {
    try {
        const {
            min, pts, reb, ast, stl, blk, to,
            fgm, fga, threeFgm, threeFga, ftm, fta
        } = game;

        // === Adjusted Weights ===
        const weight = {
            pts: 0.75,     // Slight increase from 0.65
            reb: 0.95,     // Increased from 0.85
            ast: 1.25,     // Increased from 1.1
            stl: 2.2,      // Increased from 2.0
            blk: 2.0,      // Increased from 1.8
            to: -1.2,      // Slightly less punitive
            fgEff: 1.2,    // Increased from 1.0
            ftEff: 0.7,     // Increased from 0.6
            threeEff: 1.0    // Increased from 0.8
        };

        // === Efficiency Thresholds ===
        const fgEff = fga >= 2 ? (fgm / fga) : 0;  // Lower threshold to 2 attempts
        const ftEff = fta >= 1 ? (ftm / fta) : 0;   // Lower threshold to 1 attempt
        const threeEff = threeFga >= 1 ? (threeFgm / threeFga) : 0;

        // === Soft Caps with Gradual Diminishing Returns ===
        let rawScore = 
            pts * weight.pts * Math.min(1, 50/(pts + 25)) + // Softer diminishing returns
            reb * weight.reb * Math.min(1, 20/(reb + 12)) +
            ast * weight.ast * Math.min(1, 15/(ast + 10)) +
            stl * weight.stl +
            blk * weight.blk +
            to * weight.to;

        // === Enhanced Efficiency Bonuses ===
        rawScore += Math.min(fgEff * weight.fgEff, 2.5);  // Increased cap
        rawScore += Math.min(ftEff * weight.ftEff, 1.5);
        rawScore += Math.min(threeEff * weight.threeEff, 2.0);

        // === Minute Adjustment ===
        const minuteFactor = Math.cbrt(min + 4) + 1.5;  // Reduced minute impact
        const scaled = (rawScore / minuteFactor) * 2.8;  // Increased from 2.5

        // === Balanced Final Curve ===
        const curvedScore = 10 * (scaled / (scaled + 3.2));  // Adjusted S-curve
        
        // === Final Clamping ===
        return Math.max(0.0, Math.min(10.0, parseFloat(curvedScore.toFixed(2))));
    } catch (e) {
        console.error('Error calculating game rating:', e);
        return 0;
    }
}



function calculateAverageRating(gameRatings) {
    if (!gameRatings.length) return 0;
    
    // Weighted average approach - low scores still count but have reduced impact
    const weightedRatings = gameRatings.map(rating => {
        if (rating < 2.0) {
            // For ratings below 2.0, apply a diminishing weight
            // The lower the rating, the less it affects the average
            return rating * (0.3 + (rating / 2.0 * 0.7)); // Scales from 30% to 100% weight
        }
        return rating; // Full weight for ratings 2.0 and above
    });

    // Apply trimmed mean for 5+ games
    if (gameRatings.length < 5) {
        return weightedRatings.reduce((a, b) => a + b, 0) / weightedRatings.length;
    }
    
    const sorted = [...weightedRatings].sort((a, b) => a - b);
    const trimCount = Math.floor(sorted.length * 0.15);
    const trimmed = sorted.slice(trimCount);
    
    return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
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

        const tbody = document.getElementById('playersTableBody');
        tbody.innerHTML = '';

        players.forEach(player => {
            const gameRatings = (player.gameLogs || []).map(calculateGameRating);
            const avgRating = calculateAverageRating(gameRatings); // Use the updated function

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="images/${season}/players/${player.number}.jpg" 
                        class="player-photo" alt="${player.name}"
                        onerror="this.src='images/players/default.jpg'">
                    <strong>#${player.number} ${player.name}</strong>
                </td>
                <td>${player.grade || ''}</td>
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
        // Basic percentages
        const fgPct = player.fga > 0 ? player.fgm / player.fga : 0;
        const threePct = player.threeFga > 0 ? player.threeFgm / player.threeFga : 0;
        const ftPct = player.fta > 0 ? player.ftm / player.fta : 0;
        
        // Advanced metrics
        const tsPct = player.pts / (2 * (player.fga + 0.44 * player.fta)) || 0;
        
        // Usage rate (placeholder team totals)
        const teamFga = 237 + 246 + 415 + 209 + 257 + 313 + 167 + 121 + 43 + 72 + 80 + 51;
        const usgRate = 100 * ((player.fga + 0.44 * player.fta) / teamFga) || 0;

        // Efficiency (EFF) - Basic box score efficiency
        const eff = (
            player.pts + 
            player.reb + 
            player.ast + 
            player.stl + 
            player.blk - 
            (player.fga - player.fgm) - 
            (player.fta - player.ftm) - 
            player.to
        ) / (player.gp || 1);

        // Player Efficiency Rating (PER) - Weighted version
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

        // Offensive Rating (ORtg)
        const ortgDenominator = player.fga + 0.44 * player.fta + player.to;
        const ortg = ortgDenominator !== 0 ? (player.pts / ortgDenominator) * 100 : 0;

        // Defensive Rating (DRtg) - Based on defensive contributions
        const drtg = 100 - ((player.stl + player.blk * 1.5) / (player.gp || 1) * 2.5);

        // Box Plus/Minus (BPM) - Aligned with tier ranges
        const rawBPM = (
            (player.pts * 1.0) + 
            (player.reb * 0.8) + 
            (player.ast * 2.0) + 
            (player.stl * 3.5) + 
            (player.blk * 3.5) - 
            (player.to * 2.0) - 
            ((player.fga - player.fgm) * 0.5) - 
            ((player.fta - player.ftm) * 0.5)
        );
        const bpm = (rawBPM / (player.gp || 1)) * 0.1; // Scaled to target range

        return {
            fgPct: (fgPct),
            threePct: (threePct),
            ftPct: (ftPct ),
            tsPct: (tsPct ),
            usgRate: usgRate,
            per: per,
            eff: eff,
            ortg: ortg,
            drtg: drtg,
            bpm: bpm
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
        
        // Calculate average rating using the updated function
        const avgRating = calculateAverageRating(gameRatings);
        
        // Calculate rating stats (using filtered ratings)
        const filteredRatings = gameRatings.filter(rating => rating >= 2.0);
        const ratingsToUse = filteredRatings.length > 0 ? filteredRatings : gameRatings;
        
        const ratingStats = {
            bestRating: ratingsToUse.length ? Math.max(...ratingsToUse) : 0,
            worstRating: ratingsToUse.length ? Math.min(...ratingsToUse) : 0,
            consistency: ratingsToUse.length ? 
                (10 - Math.sqrt(ratingsToUse
                    .map(r => Math.pow(r - avgRating, 2))
                    .reduce((a, b) => a + b, 0) / ratingsToUse.length)) : 0,
            last5: gameRatings.slice(-5) // Show last 5 including any below 2.0 for transparency
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
        document.getElementById('statTsPct').textContent = 
            (advancedStats.tsPct * 100).toFixed(1) + "%";

        // Update advanced metrics
        document.getElementById('statPer').textContent = 
            advancedStats.per.toFixed(1);
        document.getElementById('statEff').textContent = 
            advancedStats.eff.toFixed(1);
        document.getElementById('statOrtg').textContent = 
            advancedStats.ortg.toFixed(1);
        document.getElementById('statDrtg').textContent = 
            advancedStats.drtg.toFixed(1);
        document.getElementById('statUsgRate').textContent = 
            advancedStats.usgRate.toFixed(1) + "%";
        document.getElementById('statBpm').textContent = 
            advancedStats.bpm.toFixed(1);
        
            

        // Initialize tooltips
        document.querySelectorAll('[title]').forEach(el => {
            new bootstrap.Tooltip(el);
        });

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
            if (Object.keys(game).length === 0) return '';
            return `
                <tr class="game-log-row" 
                    data-game='${JSON.stringify(game)}'
                    data-rating='${gameRatings[index] || 0}'>
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

        const gameLogRows = document.querySelectorAll('.game-log-row');
        gameLogRows.forEach(row => {
            const game = JSON.parse(row.dataset.game);
            const rating = parseFloat(row.dataset.rating);
            
            // Click handler
            row.addEventListener('click', () => showGameModal(game, rating));
            
            // Hover tooltip
            row.setAttribute('title', `Click to view ${game.opponent} details`);
            new bootstrap.Tooltip(row, {
                trigger: 'hover'
            });
        });

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