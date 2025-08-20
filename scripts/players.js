// Initialize data and load default season
let allPlayersData = null;
let allGameLogsData = null;
let currentSortKey = 'rating'; // Default to rating
let currentSortDirection = 'desc'; // Default to descending

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
        processGameLogs();
        
        loadPlayerStats('2025');
    } catch (error) {
        console.error('Error loading player data:', error);
        alert('Failed to load player data. Please check console for details.');
    }
}

function processGameLogs() {
    // Reset and calculate player stats from game logs
    Object.keys(allPlayersData.seasons).forEach(season => {
        const players = allPlayersData.seasons[season].players;
        const seasonGames = allGameLogsData.seasons[season]?.games || [];
        
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
        });
        
        // Process each game
        seasonGames.forEach(game => {
            game.boxscore.forEach(playerStat => {
                const player = players.find(p => p.number == playerStat.number);
                if (player) {
                    // Add game to player's game logs
                    player.gameLogs.push({
                        ...playerStat,
                        date: game.date,
                        opponent: game.opponent,
                        result: game.result
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
            });
        });
    });
}

// Rest of the file remains the same with minor adjustments to use calculated stats
// ==============================================================================

document.getElementById('advancedStatsToggle').addEventListener('change', function() {
    document.querySelector('.stats-table').classList.toggle('show-advanced');
    loadPlayerStats(document.getElementById('seasonSelect').value);
});

// Update grid view loading function
function loadPlayerGrid(players, season) {
  const gridContainer = document.getElementById('playersGridView');
  gridContainer.innerHTML = '';
  
  players.forEach(player => {
    const gameRatings = (player.gameLogs || []).map(calculateGameRating);
    const avgRating = calculateAverageRating(gameRatings);
    
    // Handle NaN rating
    let ratingDisplay, ratingClass;
    if (isNaN(avgRating)) {
        ratingDisplay = 'N/A';
        ratingClass = 'rating-na';
    } else {
        ratingDisplay = avgRating.toFixed(1);
        ratingClass = `rating-${Math.floor(avgRating)}`;
    }
    
    // Truncate bio to 100 characters for grid view
    const bioSnippet = player.bio ? 
        player.bio.substring(0, 100) + (player.bio.length > 100 ? '...' : '') : 
        'No bio available';
    
    const card = document.createElement('div');
    card.className = 'player-card';
    
    card.innerHTML = `
      <div class="player-card-header">
        <div class="player-card-backdrop"></div>
        <img src="images/${season}/players/${player.number}.jpg" 
             class="player-card-img" alt="${player.name}"
             onerror="this.src='images/players/default.jpg'">
      </div>
      <div class="card-body">
        <h5 class="card-title">#${player.number} ${player.name}</h5>
        <div class="card-text">
          <div>${player.grade || ''} • ${player.pos}</div>
          <div>${player.ht} • ${player.wt}</div>
          <div class="mt-2">
            <span class="rating-cell ${ratingClass}">
              ${ratingDisplay}
            </span>
          </div>
          <!-- Bio snippet -->
          <div class="player-bio small text-muted mt-2">
            ${bioSnippet}
          </div>
        </div>
        <div class="player-stats mt-3">
          <div class="player-stat">
            <span class="stat-value">${(player.pts / (player.gp || 1)).toFixed(1)}</span>
            <span class="stat-label">PPG</span>
          </div>
          <div class="player-stat">
            <span class="stat-value">${(player.reb / (player.gp || 1)).toFixed(1)}</span>
            <span class="stat-label">RPG</span>
          </div>
          <div class="player-stat">
            <span class="stat-value">${(player.ast / (player.gp || 1)).toFixed(1)}</span>
            <span class="stat-label">APG</span>
          </div>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => {
      showPlayerDetail(player, gameRatings, season);
    });
    
    gridContainer.appendChild(card);
  });
}

// Update grid toggle functionality
document.getElementById('gridViewToggle').addEventListener('change', function() {
  const playerListSection = document.getElementById('playerListSection');
  const playersGridView = document.getElementById('playersGridView');
  
  if (this.checked) {
    playerListSection.style.display = 'none';
    playersGridView.style.display = 'grid'; // Changed to 'grid'
    loadPlayerStats(document.getElementById('seasonSelect').value);
  } else {
    playerListSection.style.display = 'block';
    playersGridView.style.display = 'none';
  }
});

function sortPlayers(players, sortKey, direction) {
    return players.slice().sort((a, b) => {
        let aValue, bValue;

        switch (sortKey) {
            case 'rating':
                const aRatings = (a.gameLogs || []).map(calculateGameRating);
                const bRatings = (b.gameLogs || []).map(calculateGameRating);
                aValue = calculateAverageRating(aRatings);
                bValue = calculateAverageRating(bRatings);
                break;

            case 'pos':
                const posOrder = { 'G': 1, 'F': 2 };
                aValue = posOrder[a.pos] || 3;
                bValue = posOrder[b.pos] || 3;
                break;

            case 'grade':
                const gradeOrder = { 'Fr.': 1, 'So.': 2, 'Jr.': 3, 'Sr.': 4 };
                aValue = gradeOrder[a.grade] || 5;
                bValue = gradeOrder[b.grade] || 5;
                break;

            case 'ht':
                const parseHeight = (ht) => {
                    const match = ht?.match(/(\d+)'(\d+)/);
                    return match ? parseInt(match[1]) * 12 + parseInt(match[2]) : 0;
                };
                aValue = parseHeight(a.ht);
                bValue = parseHeight(b.ht);
                break;

            case 'spg':
            case 'bpg': {
                const stat = sortKey === 'spg' ? 'stl' : 'blk';
                const aGp = a.gp || 1;
                const bGp = b.gp || 1;
                aValue = (a[stat] || 0) / aGp;
                bValue = (b[stat] || 0) / bGp;
                break;
            }
            case 'wt':
                aValue = parseInt(a.wt) || 0;
                bValue = parseInt(b.wt) || 0;
                break;

            case 'ppg':
            case 'rpg':
            case 'apg':
                // Fixed per-game stats calculation
                const statMap = {
                    ppg: 'pts',
                    rpg: 'reb',
                    apg: 'ast'
                };
                const stat = statMap[sortKey];
                const aGp = a.gp || 1;
                const bGp = b.gp || 1;
                aValue = (a[stat] || 0) / aGp;
                bValue = (b[stat] || 0) / bGp;
                break;

            // Advanced stats cases
            case 'fgPct':
                aValue = a.fga > 0 ? a.fgm / a.fga : 0;
                bValue = b.fga > 0 ? b.fgm / b.fga : 0;
                break;
            case 'threePct':
                aValue = a.threeFga > 0 ? a.threeFgm / a.threeFga : 0;
                bValue = b.threeFga > 0 ? b.threeFgm / b.threeFga : 0;
                break;
            case 'ftPct':
                aValue = a.fta > 0 ? a.ftm / a.fta : 0;
                bValue = b.fta > 0 ? b.ftm / b.fta : 0;
                break;
            case 'tsPct':
                aValue = a.pts / (2 * (a.fga + 0.44 * a.fta)) || 0;
                bValue = b.pts / (2 * (b.fga + 0.44 * b.fta)) || 0;
                break;
            case 'per':
            case 'eff':
                // Use pre-calculated values from advanced stats
                const aAdvanced = calculateAdvancedStats(a);
                const bAdvanced = calculateAdvancedStats(b);
                aValue = aAdvanced[sortKey];
                bValue = bAdvanced[sortKey];
                break;

            case 'usgRate': {
                const aAdvanced = calculateAdvancedStats(a);
                const bAdvanced = calculateAdvancedStats(b);
                aValue = aAdvanced.usgRate;
                bValue = bAdvanced.usgRate;
                break;
            }

            case 'ortg':
            case 'drtg': {
                const aAdvanced = calculateAdvancedStats(a);
                const bAdvanced = calculateAdvancedStats(b);
                aValue = aAdvanced[sortKey];
                bValue = bAdvanced[sortKey];
                break;
            }

            default:
                aValue = a[sortKey]?.toLowerCase() || '';
                bValue = b[sortKey]?.toLowerCase() || '';
        }

        // Handle string comparison
        if (typeof aValue === 'string') {
            return direction === 'asc' ? 
                aValue.localeCompare(bValue) : 
                bValue.localeCompare(aValue);
        }

        // Numeric comparison
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
}

async function showGameModal(game, rating) {
    try {
        const gameDate = new Date(game.date);
        const season = gameDate.getFullYear();
        const scheduleResponse = await fetch(`data/${season}-schedule.json`);
        
        if (!scheduleResponse.ok) {
            throw new Error(`Failed to load schedule for ${season}`);
        }
        
        const scheduleData = await scheduleResponse.json();
        
        // Find the matching game in the schedule
        const scheduledGame = scheduleData.find(item => {
            const scheduleDate = new Date(item.date);
            return scheduleDate.toDateString() === gameDate.toDateString() && 
                   item.opponent.includes(game.opponent);
        });
        
        // Determine the result text
       
        
        const content = `
            <div class="row">
                <div class="col-6">
                    <p class="mb-1"><strong>Date:</strong> ${game.date}</p>
                    <p class="mb-1"><strong>Opponent:</strong> ${game.opponent}</p>
                    
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
    } catch (error) {
        console.error('Error showing game modal:', error);
        // Fallback content
        const fallbackContent = `
            <div class="row">
                <div class="col-12">
                    <p>Error loading game details. Please try again.</p>
                </div>
            </div>
        `;
        document.getElementById('gameStatsContent').innerHTML = fallbackContent;
        const modal = new bootstrap.Modal('#gameStatsModal');
        modal.show();
    }
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

function loadPlayerStats(season) {
    try {
        if (!allPlayersData || !allPlayersData.seasons?.[season]) {
            console.error('Season data not available:', season);
            return;
        }
        
        let players = allPlayersData.seasons[season]?.players || [];
        
        // Apply sorting if a sort key is selected
        if (currentSortKey) {
            players = sortPlayers(players, currentSortKey, currentSortDirection);
        }

        // Always load table view
        loadPlayerList(players, season);
        
        // If grid view is active, load grid as well
        if (document.getElementById('gridViewToggle').checked) {
            loadPlayerGrid(players, season);
        }
    } catch (e) {
        console.error('Error loading player stats:', e);
    }
}

// Load players in list view (table)
function loadPlayerList(players, season) {
    const tbody = document.getElementById('playersTableBody');
    const showAdvanced = document.getElementById('advancedStatsToggle').checked;
    tbody.innerHTML = '';

    players.forEach(player => {
        const gameRatings = (player.gameLogs || []).map(calculateGameRating);
        const avgRating = calculateAverageRating(gameRatings);
        const advancedStats = calculateAdvancedStats(player);
        
        // Handle NaN rating
        let ratingDisplay, ratingClass;
        if (isNaN(avgRating)) {
            ratingDisplay = 'N/A';
            ratingClass = 'rating-na';
        } else {
            ratingDisplay = avgRating.toFixed(1);
            ratingClass = `rating-${Math.floor(avgRating)}`;
        }

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
            <td>${(player.stl / (player.gp || 1)).toFixed(1)}</td>
            <td>${(player.blk / (player.gp || 1)).toFixed(1)}</td>
            ${showAdvanced ? `
            <td class="advanced-stat">${(advancedStats.fgPct * 100).toFixed(1)}%</td>
            <td class="advanced-stat">${(advancedStats.threePct * 100).toFixed(1)}%</td>
            <td class="advanced-stat">${(advancedStats.ftPct * 100).toFixed(1)}%</td>
            <td class="advanced-stat">${(advancedStats.tsPct * 100).toFixed(1)}%</td>
            <td class="advanced-stat">${advancedStats.per.toFixed(1)}</td>
            <td class="advanced-stat">${advancedStats.eff.toFixed(1)}</td>
            <td class="advanced-stat">${advancedStats.usgRate.toFixed(1)}%</td>
            <td class="advanced-stat">${advancedStats.ortg.toFixed(1)}</td>
            <td class="advanced-stat">${advancedStats.drtg.toFixed(1)}</td>
            ` : ''}
            <td>
                <span class="rating-cell ${ratingClass}">
                    ${ratingDisplay}
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
            per: per, // Added back PER
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
            usgRate: 0,
            ortg: 0,
            drtg: 0,
            bpm: 0
        };
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
        // Hide players page header
        document.getElementById('playersPageHeader').style.display = 'none';
        
        // Sanitize ratings array
        gameRatings = gameRatings.map(r => isNaN(r) ? NaN : r);
        
        // Calculate advanced stats
        const advancedStats = calculateAdvancedStats(player);
        const avgRating = calculateAverageRating(gameRatings);

        const playerImg = document.getElementById('detailPlayerPhoto');
        playerImg.src = `images/${season}/players/${player.number}.jpg`;
        playerImg.onerror = () => playerImg.src = 'images/players/default.jpg';
        
        // Calculate rating stats
        const validRatings = gameRatings.filter(r => !isNaN(r));
        const ratingStats = {
            bestRating: validRatings.length ? Math.max(...validRatings) : NaN,
            worstRating: validRatings.length ? Math.min(...validRatings) : NaN,
            consistency: validRatings.length ? 
                (10 - Math.sqrt(validRatings
                    .map(r => Math.pow(r - avgRating, 2))
                    .reduce((a, b) => a + b, 0) / validRatings.length)) : NaN,
            last5: gameRatings.slice(-5)
        };

        document.getElementById('detailPlayerName').textContent = `#${player.number} ${player.name}`;
        document.getElementById('detailPlayerInfo').textContent = 
            `${player.grade || ''} | ${player.pos} | ${player.ht} | ${player.wt} `;
            
        // Handle NaN rating
        if (isNaN(avgRating)) {
            document.getElementById('detailPlayerRating').innerHTML = `
                <span class="rating-cell rating-na">N/A</span>`;
        } else {
            document.getElementById('detailPlayerRating').innerHTML = `
                <span class="rating-cell rating-${Math.floor(avgRating)}">
                    ${avgRating.toFixed(1)}
                </span>`;
        }

        // Update main stat cards
        const safeGP = player.gp || 1;
        document.getElementById('statMinutes').textContent = (player.min / safeGP).toFixed(1);
        document.getElementById('statPoints').textContent = (player.pts / safeGP).toFixed(1);
        document.getElementById('statAssists').textContent = (player.ast / safeGP).toFixed(1);
        document.getElementById('statRebounds').textContent = (player.reb / safeGP).toFixed(1);
        document.getElementById('statSteals').textContent = (player.stl / safeGP).toFixed(1);
        document.getElementById('statBlocks').textContent = (player.blk / safeGP).toFixed(1);

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
            advancedStats.drtg === 0 ? 'N/A' : advancedStats.drtg.toFixed(1);
        document.getElementById('statUsgRate').textContent = 
            advancedStats.usgRate.toFixed(1) + "%";
        document.getElementById('statBpm').textContent = 
            advancedStats.bpm.toFixed(1);
        
        // Update bio display
        document.getElementById('playerBio').textContent = player.bio || 'No bio available';
        
        // Initialize tooltips
        document.querySelectorAll('[title]').forEach(el => {
            new bootstrap.Tooltip(el);
        });

        // Update rating stats
        if (isNaN(ratingStats.bestRating)) {
            document.getElementById('statBestRating').innerHTML = `
                <span class="rating-cell rating-na">N/A</span>`;
        } else {
            document.getElementById('statBestRating').innerHTML = `
                <span class="rating-cell rating-${Math.floor(ratingStats.bestRating)}">
                    ${ratingStats.bestRating.toFixed(1)}
                </span>`;
        }
        
        if (isNaN(ratingStats.worstRating)) {
            document.getElementById('statWorstRating').innerHTML = `
                <span class="rating-cell rating-na">N/A</span>`;
        } else {
            document.getElementById('statWorstRating').innerHTML = `
                <span class="rating-cell rating-${Math.floor(ratingStats.worstRating)}">
                    ${ratingStats.worstRating.toFixed(1)}
                </span>`;
        }
        
        document.getElementById('statConsistency').textContent = 
            isNaN(ratingStats.consistency) ? 'N/A' : ratingStats.consistency.toFixed(1);

        // Update recent ratings
        const recentRatings = document.getElementById('recentRatings');
        recentRatings.innerHTML = '';

        // Combine games with ratings and sort by date ASC
        const combinedLast5 = player.gameLogs.map((game, i) => ({
        rating: gameRatings[i],
        date: new Date(game.date)
        })).sort((a, b) => a.date - b.date) // oldest → newest
        .slice(-5); // keep last 5

        // Render in reverse (newest left → oldest right)
        [...combinedLast5].reverse().forEach(item => {
        const ratingEl = document.createElement('div');
        if (isNaN(item.rating)) {
            ratingEl.className = 'rating-cell rating-na';
            ratingEl.textContent = 'N/A';
        } else {
            ratingEl.className = `rating-cell rating-${Math.floor(item.rating)}`;
            ratingEl.textContent = item.rating.toFixed(1);
        }
        recentRatings.appendChild(ratingEl);
        });



        // Update game logs - SORTED BY DATE (newest first)
        const gameLogsBody = document.getElementById('gameLogsBody');
        
        // Create combined array of games and ratings
        const combined = player.gameLogs.map((game, index) => ({
            game,
            rating: gameRatings[index]
        }));
        
        // Sort by date (newest first)
        combined.sort((a, b) => 
            new Date(b.game.date) - new Date(a.game.date)
        );

        gameLogsBody.innerHTML = combined.map(item => {
            const game = item.game;
            const rating = item.rating;
            
            // Handle zero values properly (show 0 instead of '-')
            return `
                <tr class="game-log-row" 
                    data-game='${JSON.stringify(game)}'
                    data-rating='${rating}'>
                    <td>${game.date || '-'}</td>
                    <td>${game.opponent || '-'}</td>
                    <td>${typeof game.min === 'number' ? game.min.toFixed(1) : '-'}</td>
                    <td>${typeof game.pts === 'number' ? game.pts : '0'}</td>
                    <td>
                        ${isNaN(rating) ? 
                            '<span class="rating-cell rating-na">N/A</span>' : 
                            `<span class="rating-cell rating-${Math.floor(rating)}">
                                ${rating.toFixed(1)}
                            </span>`
                        }
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
        
        // Update Past Seasons
        const pastSeasonsBody = document.getElementById('pastSeasonsBody');
        pastSeasonsBody.innerHTML = '';
        
        if (player.pastSeasons && player.pastSeasons.length > 0) {
            player.pastSeasons.forEach(seasonData => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${seasonData.year}</td>
                    <td>${seasonData.team}</td>
                    <td>${seasonData.grade}</td>
                    <td>${seasonData.gp || 0}</td>
                    <td>${seasonData.mpg !== undefined ? seasonData.mpg.toFixed(1) : '0.0'}</td>
                    <td>${seasonData.ppg !== undefined ? seasonData.ppg.toFixed(1) : '0.0'}</td>
                    <td>${seasonData.rpg !== undefined ? seasonData.rpg.toFixed(1) : '0.0'}</td>
                    <td>${seasonData.apg !== undefined ? seasonData.apg.toFixed(1) : '0.0'}</td>
                    <td>${seasonData.bpg !== undefined ? seasonData.bpg.toFixed(1) : '0.0'}</td>
                    <td>${seasonData.spg !== undefined ? seasonData.spg.toFixed(1) : '0.0'}</td>
                    <td data-bs-toggle="tooltip" title="Field Goal Percentage">
                        ${seasonData.fgPct !== undefined ? (seasonData.fgPct * 100).toFixed(1) + '%' : '0.0%'}
                    </td>
                    <td data-bs-toggle="tooltip" title="Three-Point Percentage">
                        ${seasonData.threePct !== undefined ? (seasonData.threePct * 100).toFixed(1) + '%' : '0.0%'}
                    </td>
                    <td data-bs-toggle="tooltip" title="Free Throw Percentage">
                        ${seasonData.ftPct !== undefined ? (seasonData.ftPct * 100).toFixed(1) + '%' : '0.0%'}
                    </td>
                `;
                pastSeasonsBody.appendChild(row);
            });
        } else {
            pastSeasonsBody.innerHTML = '<tr><td colspan="13" class="text-center">No past seasons data available</td></tr>';
        }

        // Initialize tooltips for percentages
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            new bootstrap.Tooltip(el);
        });

        // Show detail section
        document.getElementById('playerListSection').style.display = 'none';
        document.getElementById('playersGridView').style.display = 'none';
        document.getElementById('playerDetailSection').style.display = 'block';
        setTimeout(() => {
            document.getElementById('playerDetailSection').style.opacity = 1;
        }, 10);

        const xLink = document.getElementById('x-link');
        const instagramLink = document.getElementById('instagram-link');

        if (player.x) {
            xLink.href = `https://twitter.com/${player.x}`;
            xLink.style.display = 'flex';
        } else {
            xLink.style.display = 'none';
        }

        if (player.instagram) {
            instagramLink.href = `https://instagram.com/${player.instagram}`;
            instagramLink.style.display = 'flex';
        } else {
            instagramLink.style.display = 'none';
        }

    } catch (error) {
        console.error('Error showing player detail:', error);
        alert('Failed to load player profile. Check console for details.');
    }
}

// Initialize everything with error handling

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
         document.getElementById('playersPageHeader').style.display = 'block';
        
        document.getElementById('playerDetailSection').style.display = 'none';
        if (document.getElementById('gridViewToggle').checked) {
            document.getElementById('playersGridView').style.display = 'grid';
        } else {
            document.getElementById('playerListSection').style.display = 'block';
        }
    } catch (e) {
        console.error('Back button error:', e);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        loadPlayerData();
        new bootstrap.Dropdown(document.querySelector('.dropdown-toggle'));
        
        // Set initial sort to PPG after data loads
        setTimeout(() => {
            updateSortArrows(currentSortKey, currentSortDirection);
        }, 100);
    } catch (e) {
        console.error('Initialization error:', e);
    }
});