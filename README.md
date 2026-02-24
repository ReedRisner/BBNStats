This is a Kentucky Basketball Stats Website!

bbnstats.com

Completely made by me

HTML, CSS, JS, JSON and images are the files used.

## Automatic daily data updates

BBN Stats includes a scheduled GitHub Action (`.github/workflows/daily-data-update.yml`) that runs every day at midnight (UTC). It calls `scripts/espn-data-sync.mjs` to refresh:

- `data/<season>-schedule.json`
- `data/players.json`
- `data/gameLogs.json`
- `data/update.json` (record metadata)

## Run the data sync manually

### Option 1: Run locally from your machine

1. Install Node.js 18+ (Node 20 recommended).
2. From the repo root, run:

```bash
node scripts/espn-data-sync.mjs
```

3. Review changed files:

```bash
git status
```

4. If you want to save the refreshed data:

```bash
git add data/*.json
git commit -m "chore: manual data sync"
```

### Option 2: Run in GitHub Actions (no local setup)

1. Go to **Actions** in your GitHub repo.
2. Open **Daily data update** workflow.
3. Click **Run workflow** (this is `workflow_dispatch`).
4. The action will run the same sync script and auto-commit data changes.
