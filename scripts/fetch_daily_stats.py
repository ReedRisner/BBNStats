#!/usr/bin/env python3
"""Generate data/update.json from CollegeBasketballData API.

This creates cache payloads used by the static site when browser-side live API calls fail
(e.g., CORS/network issues).
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.collegebasketballdata.com"
API_KEY = "0/5PdgRvOqvcUo9VqUAcXFUEYqXxU3T26cGqt9c6FFArBcyqE4BD3njMuwOnQz+3"
TEAM_ID = 96
DEFAULT_SEASONS = 3


def fetch_json(path: str, params: dict | None = None) -> dict | list:
    query = urlencode(params or {})
    url = f"{API_BASE}{path}{'?' + query if query else ''}"
    req = Request(
        url,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {API_KEY}",
            "x-api-key": API_KEY,
            "User-Agent": "BBNStats-DailySync/2.0",
        },
    )

    try:
        with urlopen(req, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except (URLError, HTTPError) as exc:
        print(f"WARN: fetch failed for {url}: {exc}")
        raise


def first_success(calls: list[tuple[str, dict]]) -> dict | list:
    errors: list[str] = []
    for path, params in calls:
        try:
            return fetch_json(path, params)
        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc))
    raise RuntimeError(" | ".join(errors))


def normalize_array(payload: dict | list) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        if isinstance(payload.get("data"), list):
            return payload["data"]
        if isinstance(payload.get("results"), list):
            return payload["results"]
    return []


def infer_recent_seasons() -> list[int]:
    now = dt.datetime.utcnow()
    current = now.year if now.month >= 7 else now.year - 1
    return [current - i for i in range(DEFAULT_SEASONS)]


def season_payload(season: int) -> dict:
    games_raw = first_success([
        ("/games", {"season": season, "team": TEAM_ID}),
        ("/games", {"year": season, "team": TEAM_ID}),
        ("/team/games", {"season": season, "teamId": TEAM_ID}),
    ])
    roster_raw = first_success([
        ("/roster", {"season": season, "team": TEAM_ID}),
        ("/team/roster", {"season": season, "teamId": TEAM_ID}),
        ("/players", {"season": season, "team": TEAM_ID}),
    ])
    player_stats_raw = first_success([
        ("/stats/players", {"season": season, "team": TEAM_ID}),
        ("/players/stats", {"season": season, "team": TEAM_ID}),
    ])
    team_stats_raw = first_success([
        ("/stats/team", {"season": season, "team": TEAM_ID}),
        ("/team/stats", {"season": season, "teamId": TEAM_ID}),
    ])

    return {
        "games": normalize_array(games_raw),
        "roster": normalize_array(roster_raw),
        "playerStats": normalize_array(player_stats_raw),
        "teamStats": team_stats_raw,
        "updatedAt": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    }


def main() -> None:
    output: dict[str, dict] = {}
    failed: list[int] = []

    for season in infer_recent_seasons():
        try:
            output[str(season)] = season_payload(season)
            print(f"OK: season {season} cached")
        except Exception as exc:  # noqa: BLE001
            failed.append(season)
            print(f"WARN: season {season} failed: {exc}")

    if not output:
        raise SystemExit("No seasons could be fetched; refusing to overwrite data/update.json")

    out_path = Path("data/update.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path} for seasons: {', '.join(output.keys())}")
    if failed:
        print(f"Skipped seasons: {', '.join(map(str, failed))}")


if __name__ == "__main__":
    main()
