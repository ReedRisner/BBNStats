# BBN Stats

BBN Stats now uses the original multi-page site layout and loads live data directly from public ESPN team endpoints so the website updates automatically without checked-in JSON snapshots.

## Live data sources

- Team schedule/results: ESPN team schedule API
- Team roster/search data: ESPN team roster API
- Team stat cards and record summaries: ESPN statistics/team endpoints

## Local run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.


## Daily automation

A scheduled GitHub Action now regenerates `data/update.json` every day using `scripts/fetch_daily_stats.py` and auto-commits changes.
