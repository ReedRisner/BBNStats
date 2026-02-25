#!/usr/bin/env python3
"""Generate data/update.json for BBN Stats.

Primary source: CollegeBasketballData (same API + key used by site).
Fallback source: ESPN team endpoints (when CBD is unavailable).
"""

from __future__ import annotations

import datetime as dt
import json
from json import JSONDecodeError
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.collegebasketballdata.com"
API_KEY = "0/5PdgRvOqvcUo9VqUAcXFUEYqXxU3T26cGqt9c6FFArBcyqE4BD3njMuwOnQz+3"
TEAM_ID = 96
DEFAULT_SEASONS = 3

ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams"


class FetchError(RuntimeError):
    pass


def fetch_json_url(url: str, *, cbd_auth: bool = False) -> dict | list:
    headers = {"Accept": "application/json", "User-Agent": "BBNStats-DailySync/3.0"}
    if cbd_auth:
        headers["Authorization"] = f"Bearer {API_KEY}"
        headers["x-api-key"] = API_KEY

    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=45) as response:
            body = response.read().decode("utf-8", errors="replace")
    except (URLError, HTTPError) as exc:
        raise FetchError(f"{url}: {exc}") from exc

    try:
        return json.loads(body)
    except JSONDecodeError as exc:
        snippet = body.strip().replace("\n", " ")[:140]
        raise FetchError(f"{url}: non-JSON response ({snippet})") from exc


def fetch_cbd(path: str, params: dict | None = None) -> dict | list:
    query = urlencode(params or {})
    url = f"{API_BASE}{path}{'?' + query if query else ''}"
    return fetch_json_url(url, cbd_auth=True)


def fetch_espn(path: str, params: dict | None = None) -> dict | list:
    query = urlencode(params or {})
    url = f"{ESPN_BASE}/{TEAM_ID}/{path}{'?' + query if query else ''}"
    return fetch_json_url(url, cbd_auth=False)


def first_success(calls: list[tuple[str, dict]], fetcher) -> dict | list:
    errors: list[str] = []
    for path, params in calls:
        try:
            return fetcher(path, params)
        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc))
    raise FetchError(" | ".join(errors))


def normalize_array(payload: dict | list) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        if isinstance(payload.get("data"), list):
            return payload["data"]
        if isinstance(payload.get("results"), list):
            return payload["results"]
    return []

def first_success(calls: list[tuple[str, dict]]) -> dict | list:
    errors: list[str] = []
    for path, params in calls:
        try:
            return fetch_json(path, params)
        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc))
    raise RuntimeError(" | ".join(errors))

def infer_recent_seasons() -> list[int]:
    now = dt.datetime.utcnow()
    current = now.year if now.month >= 7 else now.year - 1
    return [current - i for i in range(DEFAULT_SEASONS)]


def season_payload_from_cbd(season: int) -> dict:
    games_raw = first_success([
        ("/games", {"season": season, "team": TEAM_ID}),
        ("/games", {"year": season, "team": TEAM_ID}),
        ("/team/games", {"season": season, "teamId": TEAM_ID}),
    ], fetch_cbd)
    roster_raw = first_success([
        ("/roster", {"season": season, "team": TEAM_ID}),
        ("/team/roster", {"season": season, "teamId": TEAM_ID}),
        ("/players", {"season": season, "team": TEAM_ID}),
    ], fetch_cbd)
    player_stats_raw = first_success([
        ("/stats/players", {"season": season, "team": TEAM_ID}),
        ("/players/stats", {"season": season, "team": TEAM_ID}),
    ], fetch_cbd)
    team_stats_raw = first_success([
        ("/stats/team", {"season": season, "team": TEAM_ID}),
        ("/team/stats", {"season": season, "teamId": TEAM_ID}),
    ], fetch_cbd)

    return {
        "games": normalize_array(games_raw),
        "roster": normalize_array(roster_raw),
        "playerStats": normalize_array(player_stats_raw),
        "teamStats": team_stats_raw,
        "updatedAt": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "source": "collegebasketballdata",
    }


def season_payload_from_espn(season: int) -> dict:
    schedule = fetch_espn("schedule", {"season": season})
    roster = fetch_espn("roster", {"season": season})
    stats = fetch_espn("statistics", {"season": season})

    events = (schedule or {}).get("events") or []
    games = []
    for event in events:
        comp = ((event.get("competitions") or [{}])[0])
        competitors = comp.get("competitors") or []
        us = next((c for c in competitors if ((c.get("team") or {}).get("id") == str(TEAM_ID))), None)
        opp = next((c for c in competitors if ((c.get("team") or {}).get("id") != str(TEAM_ID))), None)
        games.append({
            "date": event.get("date"),
            "opponent": ((opp or {}).get("team") or {}).get("displayName", "Unknown"),
            "location": "home" if (us or {}).get("homeAway") == "home" else "away",
            "teamScore": int((us or {}).get("score") or 0),
            "opponentScore": int((opp or {}).get("score") or 0),
            "result": "W" if (us or {}).get("winner") else ("L" if event.get("status", {}).get("type", {}).get("completed") else "Pending"),
        })

    roster_groups = (roster or {}).get("athletes") or []
    roster_rows = []
    for group in roster_groups:
        for p in group.get("items") or []:
            roster_rows.append({
                "id": p.get("id"),
                "name": p.get("displayName"),
                "jersey": p.get("jersey") or "--",
                "position": (p.get("position") or {}).get("abbreviation") or "N/A",
                "class": p.get("experience") or "N/A",
                "height": p.get("displayHeight") or "N/A",
                "weight": p.get("displayWeight") or "N/A",
            })

    # ESPN team endpoint does not consistently expose a player table; provide placeholders from roster.
    player_stats = [{"name": p.get("name"), "ppg": 0, "rpg": 0, "apg": 0, "mpg": 0} for p in roster_rows]

    return {
        "games": games,
        "roster": roster_rows,
        "playerStats": player_stats,
        "teamStats": stats,
        "updatedAt": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "source": "espn-fallback",
    }


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
    failed: list[tuple[int, str]] = []

    for season in infer_recent_seasons():
        try:
            output[str(season)] = season_payload_from_cbd(season)
            print(f"OK: season {season} cached from CollegeBasketballData")
        except Exception as cbd_error:  # noqa: BLE001
            print(f"WARN: season {season} CBD fetch failed: {cbd_error}")
            try:
                output[str(season)] = season_payload_from_espn(season)
                print(f"OK: season {season} cached from ESPN fallback")
            except Exception as espn_error:  # noqa: BLE001
                failed.append((season, f"CBD={cbd_error} | ESPN={espn_error}"))
                print(f"WARN: season {season} failed: {failed[-1][1]}")

    out_path = Path("data/update.json")
    if not output:
        # Preserve existing cache and avoid failing the workflow.
        print("No seasons could be fetched; keeping existing data/update.json unchanged.")
        return

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path} for seasons: {', '.join(output.keys())}")
    if failed:
        print("Failed seasons:")
        for season, msg in failed:
            print(f"  - {season}: {msg}")


if __name__ == "__main__":
    main()
