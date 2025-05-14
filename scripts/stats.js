document.addEventListener('DOMContentLoaded', function() {
    const seasonSelect = document.getElementById('seasonSelect');
    
    // Sample data for both seasons
    const statsData = {
        '2024': {
            'Offensive Rating': '123.7 (10)',
            'Defensive Rating': '99.2 (51)',
            'Net Rating': '+24.54 (16)',
            'Pace': '70.9 (30)',
            'Offensive TOV%': '15.0',
            'Defensive TOV%': '14.1',
            '3P%': '37.5',
            '2P%': '55.6',
            'FT%': '73.1'
        },
        '2025': {
            'Offensive Rating': '0.0',
            'Defensive Rating': '0.0',
            'Net Rating': '0.0',
            'Pace': '0.0',
            'Offensive TOV%': '0.0',
            'Defensive TOV%': '0.0',
            '3P%': '0.0',
            '2P%': '0.0',
            'FT%': '0.0'
        }
    };

    // Initial load
    updateStats(seasonSelect.value);

    seasonSelect.addEventListener('change', function() {
        updateStats(this.value);
    });

    function updateStats(season) {
        document.querySelectorAll('.stat-card').forEach(card => {
            const title = card.querySelector('h3').textContent;
            const valueElement = card.querySelector('.stat-value');
            const value = statsData[season][title] || '-';
            
            // Remove % suffix if it's already there (for percentage values)
            const displayValue = value.endsWith('%') ? value.slice(0, -1) : value;
            valueElement.textContent = displayValue;
            
            // Add % suffix for percentage stats
            if (title.includes('%') || ['3P%', '2P%', 'FT%', 'Offensive TOV%', 'Defensive TOV%'].includes(title)) {
                valueElement.classList.add('percent-value');
            } else {
                valueElement.classList.remove('percent-value');
            }
        });
    }
});