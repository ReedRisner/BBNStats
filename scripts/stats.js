document.addEventListener('DOMContentLoaded', function() {
    const seasonSelect = document.getElementById('seasonSelect');
    
    // Sample data for both seasons
    const statsData = {
        '2024': {
            'Offensive Rating': { value: '123.7', rank: '10' },
            'Defensive Rating': { value: '99.2', rank: '51' },
            'Net Rating': { value: '+24.54', rank: '16' },
            'Pace': { value: '73.7', rank: '9' },
            'Offensive TOV%': { value: '15.0', rank: '39' },
            'Defensive TOV%': { value: '14.1', rank: '338' },
            'O3P%': { value: '37.5', rank: '24' },
            'O2P%': { value: '55.6', rank: '34' },
            'OFT%': { value: '73.1', rank: '131' },
            'D3P%': { value: '30.5', rank: '20' },
            'D2P%': { value: '53.9', rank: '296' },
            'DFT%': { value: '71.7', rank: '120' },
        },
        '2025': {
            'Offensive Rating': { value: '0.0', rank: '0' },
            'Defensive Rating': { value: '0.0', rank: '0' },
            'Net Rating': { value: '0.0', rank: '0' },
            'Pace': { value: '0.0', rank: '0' },
            'Offensive TOV%': { value: '0.0', rank: '0' },
            'Defensive TOV%': { value: '0.0', rank: '0' },
            'O3P%': { value: '0.0', rank: '0' },
            'O2P%': { value: '0.0', rank: '0' },
            'OFT%': { value: '0.0', rank: '0' },
            'D3P%': { value: '0.0', rank: '0' },
            'D2P%': { value: '0.0', rank: '0' },
            'DFT%': { value: '0.0', rank: '0' },
        }
    };

    updateStats(seasonSelect.value);

    seasonSelect.addEventListener('change', function() {
        updateStats(this.value);
    });

    function updateStats(season) {
        document.querySelectorAll('.stat-card').forEach(card => {
            const title = card.querySelector('h3').textContent;
            const valueElement = card.querySelector('.stat-value');
            const rankElement = card.querySelector('.stat-ranking');
            const data = statsData[season][title] || { value: '-', rank: '-' };
            
            // Update value
            let displayValue = data.value;
            if (title.includes('%') || ['3P%', '2P%', 'FT%', 'Offensive TOV%', 'Defensive TOV%'].includes(title)) {
                displayValue = displayValue.replace('%', '');
                valueElement.classList.add('percent-value');
            } else {
                valueElement.classList.remove('percent-value');
            }
            valueElement.textContent = displayValue;
            
            // Update ranking
            rankElement.textContent = `(#${data.rank})`;
        });
    }
});