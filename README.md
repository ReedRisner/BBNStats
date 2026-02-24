# BBN Stats

A redesigned, API-first Kentucky basketball website.

## What changed

- The old static JSON data snapshots have been removed.
- The ESPN sync script and scheduled GitHub Action were removed.
- The site now requests live data directly from `https://api.collegebasketballdata.com`.
- The UI was fully rebuilt as a modern analytics dashboard with season switching and multi-year coverage.

## Data source

All game, roster, and player-stat views are loaded at runtime from CollegeBasketballData using the API key configured in `scripts/index.js`.

## Local run

Because the app uses ES modules, serve it with a local web server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.


## Deploying updates to `bbnstats.com`

This repo is configured for **GitHub Pages** deployment via `.github/workflows/deploy-pages.yml`.

### 1) Push to `main`
Any push to `main` triggers the deploy workflow and publishes the latest site files.

### 2) Keep `CNAME` in the repo root
`CNAME` must contain your custom domain:

```
bbnstats.com
```

### 3) Verify GitHub Pages settings
In GitHub repo settings:
- **Pages → Source** should be **GitHub Actions**.
- **Custom domain** should be `bbnstats.com`.
- Enable **Enforce HTTPS** once DNS is correct.

### 4) DNS records at your domain provider
Point your domain to GitHub Pages:
- `A` records for `bbnstats.com` to: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `CNAME` record for `www` to: `<your-github-username>.github.io`

After DNS propagates, every merge/push to `main` updates `bbnstats.com` automatically.
