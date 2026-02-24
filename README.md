This is a Kentucky Basketball Stats Website!

bbnstats.com

Completely made by me

HTML, CSS, JS, JSON and images are the files used.

## Automatic daily data updates

BBN Stats now includes a scheduled GitHub Action (`.github/workflows/daily-data-update.yml`) that runs every day at midnight (UTC). It calls `scripts/espn-data-sync.mjs` to refresh:

- `data/<season>-schedule.json`
- `data/players.json`
- `data/gameLogs.json`
- `data/update.json` (record metadata)

You can also trigger the workflow manually with **workflow_dispatch** in GitHub Actions.
