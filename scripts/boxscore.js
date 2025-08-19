    
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const season = urlParams.get('season');
        const date = urlParams.get('date');

        // Elements
        const loading = document.getElementById('loading');
        const boxscoreContent = document.getElementById('boxscore-content');
        const errorMessage = document.getElementById('error-message');
        const playerStats = document.getElementById('player-stats');
        
        // Game info elements
        const opponentName = document.getElementById('opponent-name');
        const gameDate = document.getElementById('game-date');
        const gameResult = document.getElementById('game-result');
        const gameLocation = document.getElementById('game-location');
        
        // Stat elements
        const fgPct = document.getElementById('fg-pct');
        const threePct = document.getElementById('three-pct');
        const ftPct = document.getElementById('ft-pct');

        // Game rating calculation function (from players.js)
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
                // Load players data
                const playersResponse = await fetch('data/players.json');
                if (!playersResponse.ok) throw new Error('Players data not found');
                const playersData = await playersResponse.json();
                
                // Load schedule data to get game info
                const scheduleResponse = await fetch(`data/${season}-schedule.json`);
                if (!scheduleResponse.ok) throw new Error('Schedule data not found');
                const scheduleData = await scheduleResponse.json();
                
                // Find the game in schedule
                const game = scheduleData.find(g => parseGameDate(g.date) === date);
                if (!game) throw new Error('Game not found in schedule');
                
                // Set game info (remove duplicate "vs")
                opponentName.textContent = game.opponent;
                gameDate.textContent = game.date;
                gameResult.textContent = game.result;
                gameLocation.textContent = game.location;
                
                // Get players for this season
                const seasonPlayers = playersData.seasons[season]?.players || [];
                
                // Process player stats for this game
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
                
                seasonPlayers.forEach(player => {
                    // Find this player's game log for the selected date
                    const gameLog = player.gameLogs?.find(log => log.date === date);
                    if (!gameLog) return;
                    
                    // Calculate game rating
                    const gameRating = calculateGameRating(gameLog);
                    
                    // Add to team totals
                    teamStats.min += gameLog.min || 0;
                    teamStats.pts += gameLog.pts || 0;
                    teamStats.reb += gameLog.reb || 0;
                    teamStats.ast += gameLog.ast || 0;
                    teamStats.stl += gameLog.stl || 0;
                    teamStats.blk += gameLog.blk || 0;
                    teamStats.to += gameLog.to || 0;
                    teamStats.fgm += gameLog.fgm || 0;
                    teamStats.fga += gameLog.fga || 0;
                    teamStats.threeFgm += gameLog.threeFgm || 0;
                    teamStats.threeFga += gameLog.threeFga || 0;
                    teamStats.ftm += gameLog.ftm || 0;
                    teamStats.fta += gameLog.fta || 0;
                    
                    // Calculate shooting percentages
                    const fgPctVal = gameLog.fga > 0 ? (gameLog.fgm / gameLog.fga * 100).toFixed(1) : '0.0';
                    const threePctVal = gameLog.threeFga > 0 ? (gameLog.threeFgm / gameLog.threeFga * 100).toFixed(1) : '0.0';
                    const ftPctVal = gameLog.fta > 0 ? (gameLog.ftm / gameLog.fta * 100).toFixed(1) : '0.0';
                    
                    // Create player row with rating
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="player-name">${player.number}. ${player.name}</td>
                        <td>${gameLog.min ? gameLog.min.toFixed(1) : '0.0'}</td>
                        <td>${gameLog.pts || 0}</td>
                        <td>${gameLog.reb || 0}</td>
                        <td>${gameLog.ast || 0}</td>
                        <td>${gameLog.stl || 0}</td>
                        <td>${gameLog.blk || 0}</td>
                        <td>${gameLog.to || 0}</td>
                        <td>${gameLog.fgm || 0}-${gameLog.fga || 0}<br><small>${fgPctVal}%</small></td>
                        <td>${gameLog.threeFgm || 0}-${gameLog.threeFga || 0}<br><small>${threePctVal}%</small></td>
                        <td>${gameLog.ftm || 0}-${gameLog.fta || 0}<br><small>${ftPctVal}%</small></td>
                        <td>
                            <span class="rating-cell rating-${Math.floor(gameRating)}">
                                ${gameRating.toFixed(1)}
                            </span>
                        </td>
                    `;
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
                
                // Update stat cards
                fgPct.textContent = `${teamFgPct}%`;
                threePct.textContent = `${teamThreePct}%`;
                ftPct.textContent = `${teamFtPct}%`;
                
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
        
        // Date parsing function (same as in schedule.js)
        function parseGameDate(dateStr) {
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


