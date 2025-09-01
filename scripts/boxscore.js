// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const season = urlParams.get('season');
const date = urlParams.get('date');

document.addEventListener('DOMContentLoaded', function() {
    const backButton = document.querySelector('a.btn.btn-primary');
    if (backButton && season) {
        backButton.href = `schedule.html?season=${season}`;
    }
});

// Elements
const loading = document.getElementById('loading');
const boxscoreContent = document.getElementById('boxscore-content');
const errorMessage = document.getElementById('error-message');
const playerStats = document.getElementById('player-stats');
const videoButton = document.getElementById('video-button');

// Game info elements
const opponentName = document.getElementById('opponent-name');
const gameDate = document.getElementById('game-date');
const gameResult = document.getElementById('game-result');
const gameLocation = document.getElementById('game-location');

// Stat elements
const fgPct = document.getElementById('fg-pct');
const threePct = document.getElementById('three-pct');
const ftPct = document.getElementById('ft-pct');

// Sorting state
let currentSort = {
    column: 'rating', // Default to rating column
    direction: 'desc' // Default to descending (highest first)
};

// Use the calculateGameRating from players.js instead of local version
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

async function loadBoxScore() {
    try {
        // Load schedule data to get game info
        const scheduleResponse = await fetch(`data/${season}-schedule.json`);
        if (!scheduleResponse.ok) throw new Error('Schedule data not found');
        const scheduleData = await scheduleResponse.json();
        
        // Find the game in schedule
        const game = scheduleData.find(g => parseGameDate(g.date) === date);
        if (!game) throw new Error('Game not found in schedule');
        
        // Set game info
        opponentName.textContent = game.opponent;
        gameDate.textContent = game.date;
        gameResult.textContent = game.result;
        gameLocation.textContent = game.location;
        
        
        // Load game logs for this season
        const gameLogsResponse = await fetch('data/gameLogs.json');
        if (!gameLogsResponse.ok) throw new Error('Game logs not found');
        const gameLogsData = await gameLogsResponse.json();
        
        // Find the specific game log
        const seasonGameLogs = gameLogsData.seasons[season]?.games || [];
        const gameLog = seasonGameLogs.find(g => parseGameDate(g.date) === date);
        if (!gameLog) throw new Error('Game log not found');
        
        // Check for video and show button if available
        if (gameLog.video) {
            videoButton.href = gameLog.video;
            videoButton.style.display = 'block';
        } else {
            videoButton.style.display = 'none';
        }
        
        // Load players data for names
        const playersResponse = await fetch('data/players.json');
        if (!playersResponse.ok) throw new Error('Players data not found');
        const playersData = await playersResponse.json();
        const seasonPlayers = playersData.seasons[season]?.players || [];
        
        // Process player stats
        let teamStats = {
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
        
        playerStats.innerHTML = '';
        
        // Store player data for sorting
        window.playerData = [];
        
        gameLog.boxscore.forEach(playerStat => {
            // Find player info
            const player = seasonPlayers.find(p => p.number == playerStat.number);
            if (!player) return;
            
            // Calculate game rating using players.js function
            const gameRating = calculateGameRating(playerStat);
            
            // Add to team totals
            teamStats.min += playerStat.min || 0;
            teamStats.pts += playerStat.pts || 0;
            teamStats.reb += playerStat.reb || 0;
            teamStats.ast += playerStat.ast || 0;
            teamStats.stl += playerStat.stl || 0;
            teamStats.blk += playerStat.blk || 0;
            teamStats.to += playerStat.to || 0;
            teamStats.fgm += playerStat.fgm || 0;
            teamStats.fga += playerStat.fga || 0;
            teamStats.threeFgm += playerStat.threeFgm || 0;
            teamStats.threeFga += playerStat.threeFga || 0;
            teamStats.ftm += playerStat.ftm || 0;
            teamStats.fta += playerStat.fta || 0;
            
            // Calculate shooting percentages
            const fgPctVal = playerStat.fga > 0 ? (playerStat.fgm / playerStat.fga * 100).toFixed(1) : '0.0';
            const threePctVal = playerStat.threeFga > 0 ? (playerStat.threeFgm / playerStat.threeFga * 100).toFixed(1) : '0.0';
            const ftPctVal = playerStat.fta > 0 ? (playerStat.ftm / playerStat.fta * 100).toFixed(1) : '0.0';
            
            // Store player data for sorting
            const playerRowData = {
                element: null, // Will be set when creating the row
                data: {
                    player: player.name,
                    min: playerStat.min || 0,
                    pts: playerStat.pts || 0,
                    reb: playerStat.reb || 0,
                    ast: playerStat.ast || 0,
                    stl: playerStat.stl || 0,
                    blk: playerStat.blk || 0,
                    to: playerStat.to || 0,
                    fg: playerStat.fgm || 0, // Sort by made field goals
                    threept: playerStat.threeFgm || 0, // Sort by made three pointers
                    ft: playerStat.ftm || 0, // Sort by made free throws
                    rating: gameRating
                },
                rowHtml: `
                    <td class="player-name">${player.number}. ${player.name}</td>
                    <td data-value="${playerStat.min || 0}">${playerStat.min ? playerStat.min.toFixed(1) : '0.0'}</td>
                    <td data-value="${playerStat.pts || 0}">${playerStat.pts || 0}</td>
                    <td data-value="${playerStat.reb || 0}">${playerStat.reb || 0}</td>
                    <td data-value="${playerStat.ast || 0}">${playerStat.ast || 0}</td>
                    <td data-value="${playerStat.stl || 0}">${playerStat.stl || 0}</td>
                    <td data-value="${playerStat.blk || 0}">${playerStat.blk || 0}</td>
                    <td data-value="${playerStat.to || 0}">${playerStat.to || 0}</td>
                    <td data-value="${playerStat.fgm || 0}">${playerStat.fgm || 0}-${playerStat.fga || 0}<br><small>${fgPctVal}%</small></td>
                    <td data-value="${playerStat.threeFgm || 0}">${playerStat.threeFgm || 0}-${playerStat.threeFga || 0}<br><small>${threePctVal}%</small></td>
                    <td data-value="${playerStat.ftm || 0}">${playerStat.ftm || 0}-${playerStat.fta || 0}<br><small>${ftPctVal}%</small></td>
                    <td data-value="${gameRating}">
                        <span class="rating-cell rating-${Math.floor(gameRating)}">
                            ${gameRating.toFixed(1)}
                        </span>
                    </td>
                `
            };
            
            window.playerData.push(playerRowData);
        });
        
        // Sort by rating (highest to lowest) initially
        sortPlayerData(currentSort.column, currentSort.direction);
        
        // Create and append player rows in sorted order
        window.playerData.forEach(playerRowData => {
            const row = document.createElement('tr');
            row.innerHTML = playerRowData.rowHtml;
            playerRowData.element = row;
            playerStats.appendChild(row);
        });
        
        // Add team totals row
        const teamFgPct = teamStats.fga > 0 ? (teamStats.fgm / teamStats.fga * 100).toFixed(1) : '0.0';
        const teamThreePct = teamStats.threeFga > 0 ? (teamStats.threeFgm / teamStats.threeFga * 100).toFixed(1) : '0.0';
        const teamFtPct = teamStats.fta > 0 ? (teamStats.ftm / teamStats.fta * 100).toFixed(1) : '0.0';
        
        const totalsRow = document.createElement('tr');
        totalsRow.innerHTML = `
            <td class="player-name">TEAM</td>
            <td>${teamStats.min.toFixed(1)}</td>
            <td>${teamStats.pts}</td>
            <td>${teamStats.reb}</td>
            <td>${teamStats.ast}</td>
            <td>${teamStats.stl}</td>
            <td>${teamStats.blk}</td>
            <td>${teamStats.to}</td>
            <td>${teamStats.fgm}-${teamStats.fga}<br><small>${teamFgPct}%</small></td>
            <td>${teamStats.threeFgm}-${teamStats.threeFga}<br><small>${teamThreePct}%</small></td>
            <td>${teamStats.ftm}-${teamStats.fta}<br><small>${teamFtPct}%</small></td>
            <td>-</td>
        `;
        playerStats.appendChild(totalsRow);
        
        // Store team row reference
        window.teamRow = totalsRow;
        
        // Update stat cards
        fgPct.textContent = `${teamFgPct}%`;
        threePct.textContent = `${teamThreePct}%`;
        ftPct.textContent = `${teamFtPct}%`;
        
        // Set up sorting
        setupSorting();
        
        // Set initial sort indicator on rating column
        const ratingHeader = document.querySelector('th[data-sort="rating"]');
        if (ratingHeader) {
            ratingHeader.classList.add('sort-desc');
        }
        
        // Hide loading, show content
        loading.style.display = 'none';
        boxscoreContent.style.display = 'block';
        
    } catch (error) {
        loading.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = `Error loading box score: ${error.message}`;
        console.error('Error loading box score:', error);
    }
}

function setupSorting() {
    const headers = document.querySelectorAll('.boxscore-table th[data-sort]');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            
            // Remove previous sort indicators
            headers.forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });
            
            // Determine new sort direction
            if (currentSort.column === column) {
                // Toggle direction if clicking the same column
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // For a new column, set default direction
                currentSort.column = column;
                // For player name, default to ascending, for all others default to descending
                currentSort.direction = column === 'player' ? 'asc' : 'desc';
            }
            
            // Add sort indicator to current header
            header.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            
            // Sort the data
            sortPlayerData(column, currentSort.direction);
            
            // Re-render the table
            renderSortedData();
        });
    });
}

function sortPlayerData(column, direction) {
    window.playerData.sort((a, b) => {
        let valueA = a.data[column];
        let valueB = b.data[column];
        
        // For string comparison (player names)
        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }
        
        if (valueA < valueB) {
            return direction === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

function renderSortedData() {
    // Clear the table body (except team row)
    const tbody = document.getElementById('player-stats');
    tbody.innerHTML = '';
    
    // Add sorted player rows
    window.playerData.forEach(player => {
        tbody.appendChild(player.element);
    });
    
    // Add team row back at the bottom
    tbody.appendChild(window.teamRow);
}
        
// Date parsing function (same as in schedule.js)
function parseGameDate(dateStr) {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

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

// Start loading when page loads
document.addEventListener('DOMContentLoaded', loadBoxScore);