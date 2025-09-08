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
        await processGameLogs();
        
        loadPlayerStats('2025');
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
            player.gameLogs = []; // All games including exhibition
            player.nonExhGameLogs = []; // Only non-exhibition games for stats
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
                        const gameLogEntry = {
                            ...playerStat,
                            date: game.date,
                            opponent: game.opponent,
                            result: game.result,
                            exh: isExhibition
                        };
                        
                        player.gameLogs.push(gameLogEntry);
                        
                        // Only update cumulative stats for non-exhibition games
                        if (!isExhibition) {
                            player.nonExhGameLogs.push(gameLogEntry);
                            
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

function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Add this function to set default view based on device
function setDefaultView() {
            const gridToggle = document.getElementById('gridViewToggle');
            if (isMobileDevice()) {
                // Always default to grid view on mobile
                gridToggle.checked = true;
                toggleView(true);
                // Force grid view preference for mobile
                sessionStorage.setItem('viewPreference', 'grid');
            } else if (!sessionStorage.getItem('viewPreference')) {
                // Default behavior for desktop
                gridToggle.checked = false;
                toggleView(false);
            }
}

// Add this function to handle view toggling
function toggleView(isGrid) {
    const playerListSection = document.getElementById('playerListSection');
    const playersGridView = document.getElementById('playersGridView');
    
    if (isGrid) {
        playerListSection.style.display = 'none';
        playersGridView.style.display = 'grid';
        sessionStorage.setItem('viewPreference', 'grid');
    } else {
        playerListSection.style.display = 'block';
        playersGridView.style.display = 'none';
        sessionStorage.setItem('viewPreference', 'table');
    }
}

// FIXED: Create a centralized function to add sort event listeners
function addSortEventListeners() {
    document.querySelectorAll('[data-sort-key]').forEach(header => {
        // Remove existing listeners to prevent duplicates
        header.replaceWith(header.cloneNode(true));
    });
    
    // Re-select elements after cloning and add fresh listeners
    document.querySelectorAll('[data-sort-key]').forEach(header => {
        header.addEventListener('click', function() {
            const sortKey = this.dataset.sortKey;
            if (currentSortKey === sortKey) {
                currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                currentSortKey = sortKey;
                currentSortDirection = 'desc';
            }
            updateSortArrows(currentSortKey, currentSortDirection);
            loadPlayerStats(document.getElementById('seasonSelect').value);
        });
    });
}

document.getElementById('advancedStatsToggle').addEventListener('change', function() {
    document.querySelector('.stats-table').classList.toggle('show-advanced');
    loadPlayerStats(document.getElementById('seasonSelect').value);
});

// Update grid view loading function
function loadPlayerGrid(players, season) {
  const gridContainer = document.getElementById('playersGridView');
  gridContainer.innerHTML = '';
  
  players.forEach(player => {
    // Use non-exhibition games for ratings
    const gameRatings = (player.nonExhGameLogs || []).map(calculateGameRating);
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
    toggleView(this.checked);
    loadPlayerStats(document.getElementById('seasonSelect').value);
});

function sortPlayers(players, sortKey, direction) {
    return players.slice().sort((a, b) => {
        let aValue, bValue;

        switch (sortKey) {
            case 'rating':
                const aRatings = (a.nonExhGameLogs || []).map(calculateGameRating);
                const bRatings = (b.nonExhGameLogs || []).map(calculateGameRating);
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
            case 'mpg':
            case 'tpg': {
                const statMap = {
                    ppg: 'pts',
                    rpg: 'reb',
                    apg: 'ast',
                    mpg: 'min',
                    tpg: 'to'
                };
                const stat = statMap[sortKey];
                const aGp = a.gp || 1;
                const bGp = b.gp || 1;
                aValue = (a[stat] || 0) / aGp;
                bValue = (b[stat] || 0) / bGp;
                break;
            }

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
        
        const content = `
            <div class="row">
                <div class="col-6">
                    <p class="mb-1"><strong>Date:</strong> ${game.date}</p>
                    <p class="mb-1"><strong>Opponent:</strong> ${game.opponent}</p>
                    ${game.exh ? '<p class="mb-1 text-warning"><strong>Exhibition Game</strong></p>' : ''}
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
    const { min, pts, reb, ast, stl, blk, to, fgm, fga, threeFgm, threeFga, ftm, fta } = game;
    
    if (min <= 0) return 0.0;
    
    const fgPct = fga > 0 ? fgm / fga : 0;
    const threePct = threeFga > 0 ? threeFgm / threeFga : 0;
    const ftPct = fta > 0 ? ftm / fta : 0;
    
    const pace = 36 / min;
    const normalizedPoints = pts * pace;
    const normalizedRebounds = reb * pace;
    const normalizedAssists = ast * pace;
    const normalizedSteals = stl * pace;
    const normalizedBlocks = blk * pace;
    const normalizedTurnovers = to * pace;

    let offensiveRating = 0.9;
    const pointsScore = Math.min(2.5, normalizedPoints / 7.2);
    offensiveRating += pointsScore;
    
    let efficiencyScore = 0.3;
    if (fga >= 2) {
        efficiencyScore += fgPct * 1.4;
    }
    if (threeFga >= 1) {
        efficiencyScore += threePct * 0.6;
    }
    if (fta >= 1) {
        efficiencyScore += ftPct * 0.4;
    }
    efficiencyScore = Math.min(2.0, efficiencyScore);
    offensiveRating += efficiencyScore;

    let defensiveRating = 0;
    const reboundScore = Math.min(1.5, normalizedRebounds / 8);
    defensiveRating += reboundScore;
    
    const stealBlockScore = Math.min(1.5, (normalizedSteals + normalizedBlocks) / 3);
    defensiveRating += stealBlockScore;

    let efficiencyCare = 2.0;
    const turnoverPenalty = Math.min(2.0, normalizedTurnovers / 6);
    efficiencyCare -= turnoverPenalty;
    efficiencyCare = Math.max(0, efficiencyCare);

    let totalRating = offensiveRating + defensiveRating + efficiencyCare;
    
    return Math.round(Math.min(10.0, Math.max(0.0, totalRating)) * 10) / 10;
}

function calculateAverageRating(gameRatings) {
    const validRatings = gameRatings.filter(r => !isNaN(r));
    if (validRatings.length === 0) return NaN;
    
    if (validRatings.length <= 3) {
        const sum = validRatings.reduce((a, b) => a + b, 0);
        return parseFloat((sum / validRatings.length).toFixed(1));
    }
    
    const sortedRatings = [...validRatings].sort((a, b) => b - a);
    const ratingsToAverage = sortedRatings.slice(0, -3);
    
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
        
        if (currentSortKey) {
            players = sortPlayers(players, currentSortKey, currentSortDirection);
        }

        // FIXED: Update table headers for mobile and re-add event listeners
        updateTableHeaders();
        
        loadPlayerList(players, season);
        
        if (document.getElementById('gridViewToggle').checked) {
            loadPlayerGrid(players, season);
        }
        
        // FIXED: Update sort arrows after loading the table
        updateSortArrows(currentSortKey, currentSortDirection);
    } catch (e) {
        console.error('Error loading player stats:', e);
    }
}

function loadPlayerList(players, season) {
    const tbody = document.getElementById('playersTableBody');
    const showAdvanced = document.getElementById('advancedStatsToggle').checked;
    const isMobile = isMobileDevice();
    tbody.innerHTML = '';

    players.forEach(player => {
        const gameRatings = (player.nonExhGameLogs || []).map(calculateGameRating);
        const avgRating = calculateAverageRating(gameRatings);
        // Moved advancedStats calculation here so it's available in both mobile and desktop views
        const advancedStats = calculateAdvancedStats(player);
        
        let ratingDisplay, ratingClass;
        if (isNaN(avgRating)) {
            ratingDisplay = 'N/A';
            ratingClass = 'rating-na';
        } else {
            ratingDisplay = avgRating.toFixed(1);
            ratingClass = `rating-${Math.floor(avgRating)}`;
        }

        const row = document.createElement('tr');
        
        // For mobile, show a more compact version with only essential stats
        if (isMobile && !showAdvanced) {
            row.innerHTML = `
                <td class="mobile-player-cell">
                    <div class="d-flex align-items-center">
                        <img src="images/${season}/players/${player.number}.jpg" 
                            class="player-photo me-2" alt="${player.name}"
                            onerror="this.src='images/players/default.jpg'">
                        <div class="flex-grow-1">
                            <strong>#${player.number} ${player.name}</strong><br>
                            <small class="text-muted">${player.grade || ''} ${player.pos}</small>
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    <div class="mobile-stats">
                        <div><strong>${(player.pts / (player.gp || 1)).toFixed(1)}</strong><br><small>PPG</small></div>
                    </div>
                </td>
                <td class="text-center">
                    <div class="mobile-stats">
                        <div><strong>${(player.reb / (player.gp || 1)).toFixed(1)}</strong><br><small>RPG</small></div>
                    </div>
                </td>
                <td class="text-center">
                    <div class="mobile-stats">
                        <div><strong>${(player.ast / (player.gp || 1)).toFixed(1)}</strong><br><small>APG</small></div>
                    </div>
                </td>
                <td class="text-center">
                    <span class="rating-cell ${ratingClass}" style="font-size: 0.8rem;">
                        ${ratingDisplay}
                    </span>
                </td>
            `;
        } else {
            // Desktop version (existing code)
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
                <td class="advanced-stat">${(player.min / (player.gp || 1)).toFixed(1)}</td>
                <td>${(player.pts / (player.gp || 1)).toFixed(1)}</td>
                <td>${(player.reb / (player.gp || 1)).toFixed(1)}</td>
                <td>${(player.ast / (player.gp || 1)).toFixed(1)}</td>
                <td>${(player.stl / (player.gp || 1)).toFixed(1)}</td>
                <td>${(player.blk / (player.gp || 1)).toFixed(1)}</td>
                ${showAdvanced ? `
                <td class="advanced-stat">${(player.to / (player.gp || 1)).toFixed(1)}</td>
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
        }

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

// FIXED: Update table headers function with proper event listener management
function updateTableHeaders() {
            const thead = document.querySelector('.stats-table thead tr');
            const isMobile = isMobileDevice();
            const showAdvanced = document.getElementById('advancedStatsToggle').checked;
            
            if (isMobile) {
                thead.innerHTML = `
                    <th style="width:40%">Player</th>
                    <th style="width:15%" data-sort-key="ppg">PPG<span class="sort-arrow"></span></th>
                    <th style="width:15%" data-sort-key="rpg">RPG<span class="sort-arrow"></span></th>
                    <th style="width:15%" data-sort-key="apg">APG<span class="sort-arrow"></span></th>
                    <th style="width:15%" data-sort-key="rating">Rating<span class="sort-arrow"></span></th>
                `;
            } else {
        // Reset to full desktop headers (existing HTML)
        thead.innerHTML = `
            <th>Player</th>
            <th data-sort-key="grade">Grade<span class="sort-arrow"></span></th>
            <th data-sort-key="pos">POS<span class="sort-arrow"></span></th>
            <th data-sort-key="ht">HT<span class="sort-arrow"></span></th>
            <th data-sort-key="wt">WT<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="mpg">MPG<span class="sort-arrow"></span></th>
            <th data-sort-key="ppg">PPG<span class="sort-arrow"></span></th>
            <th data-sort-key="rpg">RPG<span class="sort-arrow"></span></th>
            <th data-sort-key="apg">APG<span class="sort-arrow"></span></th>
            <th data-sort-key="spg">SPG<span class="sort-arrow"></span></th>
            <th data-sort-key="bpg">BPG<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="tpg">TO<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="fgPct">FG%<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="threePct">3P%<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="ftPct">FT%<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="tsPct">TS%<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="per">PER<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="eff">EFF<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="usgRate">USG<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="ortg">ORtg<span class="sort-arrow"></span></th>
            <th class="advanced-stat" data-sort-key="drtg">DRtg<span class="sort-arrow"></span></th>
            <th data-sort-key="rating">Rating<span class="sort-arrow"></span></th>
        `;
    }
    
    // Re-add event listeners after updating headers
    addSortEventListeners();
}

function calculateAdvancedStats(player) {
    try {
        const fgPct = player.fga > 0 ? player.fgm / player.fga : 0;
        const threePct = player.threeFga > 0 ? player.threeFgm / player.threeFga : 0;
        const ftPct = player.fta > 0 ? player.ftm / player.fta : 0;
        
        const tsPct = player.pts / (2 * (player.fga + 0.44 * player.fta)) || 0;
        
        const teamFga = 2000;
        const usgRate = 100 * ((player.fga + 0.44 * player.fta) / teamFga) || 0;

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

        const eff = (
            player.pts + 
            (player.reb * 1.2) + 
            (player.ast * 1.5) + 
            (player.stl * 3) + 
            (player.blk * 3) - 
            (player.to * 2) - 
            ((player.fga - player.fgm) * 0.7)
        ) / (player.gp || 1);

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

// FIXED: Update sort arrows function
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
        document.getElementById('playersPageHeader').style.display = 'none';
        
        // Calculate ratings for all games (including exhibition) for display
        const allGameRatings = player.gameLogs.map(game => calculateGameRating(game));
        
        // Calculate average rating only from non-exhibition games for stats
        const nonExhRatings = (player.nonExhGameLogs || []).map(calculateGameRating);
        const avgRating = calculateAverageRating(nonExhRatings);

        const playerImg = document.getElementById('detailPlayerPhoto');
        playerImg.src = `images/${season}/players/${player.number}.jpg`;
        playerImg.onerror = () => playerImg.src = 'images/players/default.jpg';
        
        const validNonExhRatings = nonExhRatings.filter(r => !isNaN(r));
        const ratingStats = {
            bestRating: validNonExhRatings.length ? Math.max(...validNonExhRatings) : NaN,
            worstRating: validNonExhRatings.length ? Math.min(...validNonExhRatings) : NaN,
            consistency: validNonExhRatings.length ? 
                (10 - Math.sqrt(validNonExhRatings
                    .map(r => Math.pow(r - avgRating, 2))
                    .reduce((a, b) => a + b, 0) / validNonExhRatings.length)) : NaN,
            last5: allGameRatings.slice(-5) // Show last 5 including exhibition
        };

        const advancedStats = calculateAdvancedStats(player);

        document.getElementById('detailPlayerName').textContent = `#${player.number} ${player.name}`;
        document.getElementById('detailPlayerInfo').textContent = 
            `${player.grade || ''} | ${player.pos} | ${player.ht} | ${player.wt} `;
            
        if (isNaN(avgRating)) {
            document.getElementById('detailPlayerRating').innerHTML = `
                <span class="rating-cell rating-na">N/A</span>`;
        } else {
            document.getElementById('detailPlayerRating').innerHTML = `
                <span class="rating-cell rating-${Math.floor(avgRating)}">
                    ${avgRating.toFixed(1)}
                </span>`;
        }

        const safeGP = player.gp || 1;
        document.getElementById('statMinutes').textContent = (player.min / safeGP).toFixed(1);
        document.getElementById('statPoints').textContent = (player.pts / safeGP).toFixed(1);
        document.getElementById('statAssists').textContent = (player.ast / safeGP).toFixed(1);
        document.getElementById('statRebounds').textContent = (player.reb / safeGP).toFixed(1);
        document.getElementById('statSteals').textContent = (player.stl / safeGP).toFixed(1);
        document.getElementById('statBlocks').textContent = (player.blk / safeGP).toFixed(1);

        document.getElementById('statFgPct').textContent = 
            (advancedStats.fgPct * 100).toFixed(1) + "%";
        document.getElementById('statThreePct').textContent = 
            (advancedStats.threePct * 100).toFixed(1) + "%";
        document.getElementById('statFtPct').textContent = 
            (advancedStats.ftPct * 100).toFixed(1) + "%";
        document.getElementById('statTsPct').textContent = 
            (advancedStats.tsPct * 100).toFixed(1) + "%";

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
        
        document.getElementById('playerBio').textContent = player.bio || 'No bio available';
        
        document.querySelectorAll('[title]').forEach(el => {
            new bootstrap.Tooltip(el);
        });

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

        const recentRatings = document.getElementById('recentRatings');
        recentRatings.innerHTML = '';

        // Combine all game logs with their ratings (including exhibition)
        const combinedAll = player.gameLogs.map((game, index) => ({
            game,
            rating: allGameRatings[index],
            date: new Date(game.date)
        })).sort((a, b) => a.date - b.date) // Sort by date
        .slice(-5); // Get last 5

        // Display them in reverse order (most recent first)
        [...combinedAll].reverse().forEach(item => {
            const ratingEl = document.createElement('div');
            if (isNaN(item.rating)) {
                ratingEl.className = 'rating-cell rating-na';
                ratingEl.textContent = 'N/A';
            } else {
                ratingEl.className = `rating-cell rating-${Math.floor(item.rating)}`;
                if (item.game.exh) {
                    ratingEl.classList.add('exhibition-rating');
                    ratingEl.setAttribute('data-bs-toggle', 'tooltip');
                    ratingEl.setAttribute('title', 'Exhibition Game');
                }
                ratingEl.textContent = item.rating.toFixed(1);
            }
            recentRatings.appendChild(ratingEl);
        });

        // Game logs table (show all games, including exhibition)
        const gameLogsBody = document.getElementById('gameLogsBody');
        
        // Combine all game logs with ratings (including exhibition)
        const allGamesCombined = player.gameLogs.map((game, index) => ({
            game,
            rating: allGameRatings[index]
        }));
        
        // Sort by date (most recent first)
        allGamesCombined.sort((a, b) => 
            new Date(b.game.date) - new Date(a.game.date)
        );

        gameLogsBody.innerHTML = allGamesCombined.map(item => {
            const game = item.game;
            const rating = item.rating;
            
            return `
                <tr class="game-log-row ${game.exh ? 'exhibition-game' : ''}" 
                    data-game='${JSON.stringify(game)}'
                    data-rating='${rating}'>
                    <td>${game.date || '-'}</td>
                    <td>${game.opponent || '-'} ${game.exh ? ' (Exh)' : ''}</td>
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
            
            row.addEventListener('click', () => showGameModal(game, rating));
            
            row.setAttribute('title', `Click to view ${game.opponent} details`);
            new bootstrap.Tooltip(row, {
                trigger: 'hover'
            });
        });
        
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

        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            new bootstrap.Tooltip(el);
        });

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

// REMOVED: The duplicate event listener setup that was causing issues

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
        
        // Set default view for mobile
        setDefaultView();
        
        // FIXED: Add initial sort event listeners after DOM is loaded
        setTimeout(() => {
            addSortEventListeners();
            updateSortArrows(currentSortKey, currentSortDirection);
        }, 100);
    } catch (e) {
        console.error('Initialization error:', e);
    }
});