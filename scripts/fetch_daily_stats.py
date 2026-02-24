#!/usr/bin/env python3
"""Generate data/update.json from ESPN APIs for BBN Stats.

This script is safe to run locally or in GitHub Actions.
"""

from __future__ import annotations

import json
import datetime as dt
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

TEAM_ID = "96"
BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams"

# Keep two recent seasons updated by default.
DEFAULT_SEASONS = 2


def fetch_json(url: str) -> dict:
    req = Request(url, headers={"Accept": "application/json", "User-Agent": "BBNStats-DailySync/1.0"})
    try:
        with urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except (URLError, HTTPError) as exc:
        print(f"WARN: failed to fetch {url}: {exc}")
        return {}


def to_stats_map(stats_payload: dict) -> dict:
    out: dict[str, str] = {}
    splits = (((stats_payload or {}).get("results") or {}).get("stats") or {}).get("splits") or []
    for split in splits:
        for stat in split.get("stats", []):
            out[stat.get("name")] = stat.get("displayValue") or str(stat.get("value", "0"))
    return out


def to_schedule_summary(schedule_payload: dict) -> dict:
    events = (schedule_payload or {}).get("events") or []

    wins = losses = 0
    ap_wins = ap_losses = 0
    conf_wins = conf_losses = 0

    for event in events:
        comp = ((event.get("competitions") or [{}])[0])
        status = ((comp.get("status") or {}).get("type") or {})
        if not status.get("completed"):
            continue

        competitors = comp.get("competitors") or []
        us = next((c for c in competitors if ((c.get("team") or {}).get("id") == TEAM_ID)), None)
        opp = next((c for c in competitors if ((c.get("team") or {}).get("id") != TEAM_ID)), None)
        if not us or not opp:
            continue

        if us.get("winner") is True:
            wins += 1
        else:
            losses += 1

        opp_rank = int((((opp.get("curatedRank") or {}).get("current") or 0)))
        if 1 <= opp_rank <= 25:
            if us.get("winner") is True:
                ap_wins += 1
            else:
                ap_losses += 1

        group_name = (((comp.get("group") or {}).get("name")) or "").lower()
        is_conf = "sec" in group_name or "conference" in group_name
        if is_conf:
            if us.get("winner") is True:
                conf_wins += 1
            else:
                conf_losses += 1

    total_games = wins + losses
    win_pct = f"{(wins / total_games * 100):.1f}%" if total_games else "-"

    return {
        "Overall Record": f"{wins}-{losses}",
        "Conference Standings": f"{conf_wins}-{conf_losses}",
        "AP Poll": "-",
        "KenPom": "-",
        "NET Rankings": "-",
        "Evan Miya": "-",
        "Barttorvik": "-",
        "Bracketology": "-",
        "AP Top 25 Record": f"{ap_wins}-{ap_losses}",
        "Win Percentage": win_pct,
    }


def build_stats_block(stats: dict) -> dict:
    def item(value: str | float | int) -> dict:
        return {"value": str(value), "rank": "-"}

    avg_pts = float(stats.get("avgPoints", "0") or 0)
    avg_pts_against = float(stats.get("avgPointsAgainst", "0") or 0)

    return {
        "Offensive Rating": item(stats.get("avgPoints", "0.0")),
        "Defensive Rating": item(stats.get("avgPointsAgainst", "0.0")),
        "Net Rating": item(f"{(avg_pts - avg_pts_against):.1f}"),
        "Tempo": item(stats.get("possessionsPerGame", "0.0")),
        "eFG%": item(str(stats.get("effectiveFieldGoalPct", "0.0")).replace("%", "")),
        "TS%": item(str(stats.get("trueShootingPct", "0.0")).replace("%", "")),
        "3P%": item(str(stats.get("threePointFieldGoalPct", "0.0")).replace("%", "")),
        "2P%": item(str(stats.get("twoPointFieldGoalPct", "0.0")).replace("%", "")),
        "FT%": item(str(stats.get("freeThrowPct", "0.0")).replace("%", "")),
        "Offensive Rebound %": item(stats.get("offensiveReboundsPerGame", "0.0")),
        "Defensive Rebound %": item(stats.get("defensiveReboundsPerGame", "0.0")),
        "Assist %": item(stats.get("assistsPerGame", "0.0")),
        "Turnover %": item(stats.get("turnoversPerGame", "0.0")),
        "Steal %": item(stats.get("stealsPerGame", "0.0")),
        "Block %": item(stats.get("blocksPerGame", "0.0")),
    }


def generate_update_json(seasons: list[int]) -> dict:
    payload: dict[str, dict] = {}

    for season in seasons:
        stats_url = f"{BASE}/{TEAM_ID}/statistics?{urlencode({'season': season})}"
        sched_url = f"{BASE}/{TEAM_ID}/schedule?{urlencode({'season': season})}"

        stats_data = fetch_json(stats_url)
        schedule_data = fetch_json(sched_url)

        stats_map = to_stats_map(stats_data)
        rankings = to_schedule_summary(schedule_data)

        payload[str(season)] = {
            "stats": build_stats_block(stats_map),
            "rankings": rankings,
            "updatedAt": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        }

    return payload


def infer_recent_seasons() -> list[int]:
    now = dt.datetime.utcnow()
    # season is usually named by starting year
    current = now.year if now.month >= 7 else now.year - 1
    return [current - i for i in range(DEFAULT_SEASONS)]


def main() -> None:
    seasons = infer_recent_seasons()
    data = generate_update_json(seasons)

    out_path = Path("data/update.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path} for seasons: {', '.join(map(str, seasons))}")


if __name__ == "__main__":
    main()
