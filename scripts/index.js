     
    
    
    
    async function loadTotalRecordForIndex() {
        try {
            const response = await fetch('data/2025-schedule.json');
            if (!response.ok) throw new Error('Schedule not found');
            const games = await response.json();

            let wins = 0, losses = 0;

            games.forEach(game => {
                if (game.result && game.result !== 'TBD') {
                    if (game.result.startsWith('W')) wins++;
                    if (game.result.startsWith('L')) losses++;
                }
            });

            document.getElementById('indexTotalRecord').textContent = `${wins}-${losses}`;
        } catch (error) {
            console.error('Error loading total record:', error);
            document.getElementById('indexTotalRecord').textContent = 'N/A';
        }
    }

    document.addEventListener('DOMContentLoaded', loadTotalRecordForIndex);
    document.addEventListener('DOMContentLoaded', function() {
    const recentGames = document.getElementById('recent-games');
    
    if (recentGames) {
        recentGames.addEventListener('click', function(e) {
            // Find the closest tr ancestor of the clicked element
            const row = e.target.closest('tr');
            if (!row) return;
            
            // Get the date from the first cell
            const dateCell = row.cells[0];
            const gameDate = dateCell.textContent.trim();
            
            // Parse the date to match the format expected by boxscore.js
            // (using the same parseGameDate function from boxscore.js)
            const parsedDate = parseGameDate(gameDate);
            
            // Navigate to boxscore.html with parameters
            // Using 2024-25 as the season (adjust as needed)
            window.location.href = `boxscore.html?season=2024&date=${parsedDate}`;
        });
    }
    
    // Same parseGameDate function from boxscore.js
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
});
