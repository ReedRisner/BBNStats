
        async function loadSchedule(season) {
            try {
                const response = await fetch(`data/${season}-schedule.json`);
                if (!response.ok) throw new Error('Schedule not found');
                const games = await response.json();
                
                const tbody = document.getElementById('scheduleBody');
                tbody.innerHTML = '';

                let totalWins = 0, totalLosses = 0;
                let confWins = 0, confLosses = 0;

                games.forEach(game => {
                    if (game.result && game.result !== 'TBD') {
                        if (game.result.startsWith('W')) totalWins++;
                        if (game.result.startsWith('L')) totalLosses++;

                        if (game.conference === true) {
                            if (game.result.startsWith('W')) confWins++;
                            if (game.result.startsWith('L')) confLosses++;
                        }
                    }
                });

                const totalGames = totalWins + totalLosses;
                const winPct = totalGames > 0 ? (totalWins / totalGames * 100).toFixed(1) + '%' : '-';

                let apWins = 0, apLosses = 0;
                let quad1Wins = 0, quad1Losses = 0;
                let marchMadnessFinish = '-';

                games.forEach(game => {
                    const isWin = game.result && game.result.startsWith('W');
                    const isLoss = game.result && game.result.startsWith('L');

                    // AP Top 25 Record
                    if (game.opponentRank && game.opponentRank <= 25) {
                        if (isWin) apWins++;
                        if (isLoss) apLosses++;
                    }

                    // Quad 1 Record
                    if (game.quad === 1) {
                        if (isWin) quad1Wins++;
                        if (isLoss) quad1Losses++;
                    }
                });

                // Handle March Madness text for 2024-2025 only
                const selectedSeason = document.getElementById('seasonSelect').value;
                if (selectedSeason === "2024") {
                    marchMadnessFinish = "Sweet 16";
                }

                document.getElementById('apTop25Wins').textContent = `${apWins}-${apLosses}`;
                document.getElementById('quad1Wins').textContent = `${quad1Wins}-${quad1Losses}`;
                document.getElementById('tournamentFinish').textContent = marchMadnessFinish;



                document.getElementById('totalRecord').textContent = `${totalWins}-${totalLosses}`;
                document.getElementById('conferenceRecord').textContent = `${confWins}-${confLosses}`;
                document.getElementById('winningPercentage').textContent = winPct;


                games.forEach(game => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td data-label="Date" class="game-date">${game.date}</td>
                        <td data-label="Matchup">
                            <img src="images/opponents/${game.logo}" class="team-logo" alt="${game.opponent} Logo">
                            <strong>${game.opponent}</strong>
                        </td>
                        <td data-label="Location">${game.location}</td>
                        <td data-label="Result">
                            <span class="badge ${game.result === 'TBD' ? 
                                'bg-secondary' : 
                                game.result.startsWith('W') ? 
                                'bg-success' : 
                                'bg-danger'}">
                                ${game.result}
                            </span>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } catch (error) {
                console.error('Error loading schedule:', error);
                const tbody = document.getElementById('scheduleBody');
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading schedule data</td></tr>`;
            }
        }

        // Initial load - default to 2025-2026 season
        document.addEventListener('DOMContentLoaded', () => {
            loadSchedule('2025');
        });

        // Season selector handler
        document.getElementById('seasonSelect').addEventListener('change', function() {
            loadSchedule(this.value);
        });
 