This is a Kentucky Basketball Stats Website!

bbnstats.com

Completely made by me.

HTML, CSS, JS, JSON and images are the files used.

## Data system (revamped)

The website pages/layout remain the same, but the data refresh pipeline now uses `https://api.collegebasketballdata.com` instead of the old ESPN-based source.

The sync script (`scripts/espn-data-sync.mjs`) updates:

- `data/<season>-schedule.json`
- `data/players.json`
- `data/gameLogs.json`
- `data/update.json` (record metadata)

## Automatic daily data updates

BBN Stats includes a scheduled GitHub Action (`.github/workflows/daily-data-update.yml`) that runs every day at midnight (UTC).

### Required GitHub secret

Add this repo secret before running the workflow:

- `COLLEGE_BASKETBALL_DATA_API_KEY` = your API key

## Run the data sync manually

### Option 1: Run locally from your machine

1. Install Node.js 18+ (Node 20 recommended).
2. Export your API key:

```bash
export COLLEGE_BASKETBALL_DATA_API_KEY="your_key_here"
```

3. From the repo root, run:

```bash
node scripts/espn-data-sync.mjs
```

4. Review changed files:

```bash
git status
```

5. If you want to save the refreshed data:

```bash
git add data/*.json
git commit -m "chore: manual data sync"
```

### Option 2: Run in GitHub Actions (no local setup)

1. Go to **Actions** in your GitHub repo.
2. Open **Daily data update** workflow.
3. Click **Run workflow** (`workflow_dispatch`).
4. The action will use the repo secret API key and auto-commit data changes.
