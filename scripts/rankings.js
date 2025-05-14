
        document.addEventListener('DOMContentLoaded', function() {
            const seasonSelect = document.getElementById('seasonSelect');
            
            // Sample data for both seasons
            const rankingsData = {
                '2024': {
                    'Overall Record': '24-12',
                    'Conference Record': '10-8',
                    'AP Poll': '#12',
                    'KenPom': '#16',
                    'NET Rankings': '#3',
                    'Evan Miya': '#28',
                    'Barttorvik': '#12',
                    'Bracketology': 'No. 3 Seed',
                    'AP Top 25 Record': '8-5'
                },
                '2025': {
                    'Overall Record': '0-0',
                    'Conference Record': '0-0',
                    'AP Poll': '#0',
                    'KenPom': '#0',
                    'NET Rankings': '#0',
                    'Evan Miya': '#0',
                    'Barttorvik': '#0',
                    'Bracketology': 'No. 2 Seed',
                    'AP Top 25 Record': '0-0'
                }
            };

            // Initial load
            updateRankings(seasonSelect.value);

            seasonSelect.addEventListener('change', function() {
                updateRankings(this.value);
            });

            function updateRankings(season) {
                document.querySelectorAll('.ranking-card').forEach(card => {
                    const title = card.querySelector('h3').textContent;
                    const valueElement = card.querySelector('.ranking-value');
                    valueElement.textContent = rankingsData[season][title] || '-';
                });
            }
        });
   