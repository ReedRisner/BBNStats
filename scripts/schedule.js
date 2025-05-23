        function parseGameDate(dateStr) {
    // Enhanced date parsing with error handling
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
                const parts = cleaned.split(/\s+/); // Handle multiple spaces
                if (parts.length !== 3) throw new Error('Invalid date format');
                
                const [monthStr, day, year] = parts;
                return `${year}-${months[monthStr]}-${day.padStart(2, '0')}`;
            } catch (error) {
                console.error('Date parsing error:', error.message, 'for date:', dateStr);
                return 'invalid-date';
            }
        }
        async function loadSchedule(season) {
    try {
        const response = await fetch(`data/${season}-schedule.json`);
        if (!response.ok) throw new Error('Schedule not found');
        const games = await response.json();

        const tbody = document.getElementById('scheduleBody');
        tbody.innerHTML = '';

        // Initialize stats variables
        let totalWins = 0, totalLosses = 0, confWins = 0, confLosses = 0;
        let apWins = 0, apLosses = 0, quad1Wins = 0, quad1Losses = 0;

        // SINGLE GAME PROCESSING LOOP
        games.forEach(game => {
            const row = document.createElement('tr');
            
            // Add click handler only for completed games
            if (game.result && game.result !== 'TBD') {
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    const season = document.getElementById('seasonSelect').value;
                    const formattedDate = parseGameDate(game.date);
                    console.log('Navigating to:', formattedDate); // Debug log
                    window.location.href = `boxscore.html?season=${season}&date=${formattedDate}`;
                });
            }

            // Update stats
            if (game.result && game.result !== 'TBD') {
                game.result.startsWith('W') ? totalWins++ : totalLosses++;
                if (game.conference) game.result.startsWith('W') ? confWins++ : confLosses++;
                if (game.opponentRank <= 25) game.result.startsWith('W') ? apWins++ : apLosses++;
                if (game.quad === 1) game.result.startsWith('W') ? quad1Wins++ : quad1Losses++;
            }

            // Populate row
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

        // Update stats displays
        const totalGames = totalWins + totalLosses;
        document.getElementById('totalRecord').textContent = `${totalWins}-${totalLosses}`;
        document.getElementById('conferenceRecord').textContent = `${confWins}-${confLosses}`;
        document.getElementById('winningPercentage').textContent = 
            totalGames > 0 ? `${(totalWins/totalGames*100).toFixed(1)}%` : '-';
        document.getElementById('apTop25Wins').textContent = `${apWins}-${apLosses}`;
        document.getElementById('quad1Wins').textContent = `${quad1Wins}-${quad1Losses}`;
        document.getElementById('tournamentFinish').textContent = 
            season === "2024" ? "Sweet 16" : "-";

    } catch (error) {
        console.error('Error loading schedule:', error);
        document.getElementById('scheduleBody').innerHTML = `
            <tr><td colspan="4" class="text-center text-danger">Error loading schedule data</td></tr>
        `;
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
 