
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

