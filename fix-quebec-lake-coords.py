#!/usr/bin/env python3
"""
Patch the 65 placeholder Quebec lakes in data/fishing.json by looking each
up in Natural Resources Canada's Geographical Names Database (CGNDB).

All other coordinates in fishing.json were already verified. This script
only touches entries currently sitting at the placeholder (46.5, -72).

Usage:
    # Preview matches without writing (recommended first):
    python3 fix-quebec-lake-coords.py --dry-run

    # Apply changes:
    python3 fix-quebec-lake-coords.py

    # Apply, but only update entries where confidence is high:
    python3 fix-quebec-lake-coords.py --strict

Requires: requests   (pip install requests)

API: https://geogratis.gc.ca/services/geoname/en/geonames.json
Docs: https://geogratis.gc.ca/site/eng/geonames

Data source is the public CGNDB — the same database that powers the
government's Canadian Geographical Names search tool.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("This script needs the 'requests' package. Install with: pip install requests")


FISHING_JSON = Path(__file__).parent / "data" / "fishing.json"
PLACEHOLDER_LAT = 46.5
PLACEHOLDER_LNG = -72
API_URL = "https://geogratis.gc.ca/services/geoname/en/geonames.json"
REQUEST_TIMEOUT = 15
SLEEP_BETWEEN = 0.4  # be polite to a government service
USER_AGENT = "outdoorintel-coords-fix/1.0 (coordinate backfill for fishing.json)"


def reconstruct_name(display_name: str) -> list[str]:
    """The dataset stores names in sort order — 'Bécasse, Lac de la'.
    CGNDB expects natural order — 'Lac de la Bécasse'. Return both forms
    as search candidates; the first one to match wins.
    """
    candidates = [display_name]
    if "," in display_name:
        head, tail = display_name.split(",", 1)
        head = head.strip()
        tail = tail.strip()
        candidates.append(f"{tail} {head}")
    return candidates


def search_cgndb(query: str) -> list[dict]:
    """Query the CGNDB for a name. Returns list of feature dicts."""
    params = {"q": query}
    try:
        r = requests.get(
            API_URL,
            params=params,
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        )
        r.raise_for_status()
    except requests.RequestException as e:
        print(f"    API error for {query!r}: {e}", file=sys.stderr)
        return []

    data = r.json()
    # The GeoGratis service returns a FeatureCollection-ish structure.
    # Real responses use "items" at top level; fall back to "features" or the
    # raw list if the shape differs.
    if isinstance(data, list):
        return data
    return data.get("items") or data.get("features") or []


def feature_coords(feature: dict) -> tuple[float, float] | None:
    """Extract (lat, lng) from a CGNDB feature, handling shape variations."""
    # Direct fields
    lat = feature.get("latitude")
    lng = feature.get("longitude")
    if lat is not None and lng is not None:
        return float(lat), float(lng)

    # GeoJSON geometry
    geom = feature.get("geometry") or {}
    coords = geom.get("coordinates")
    if isinstance(coords, (list, tuple)) and len(coords) >= 2:
        # GeoJSON: [lng, lat]
        return float(coords[1]), float(coords[0])

    # Nested "location" fields seen in some variants
    loc = feature.get("location") or {}
    if isinstance(loc, dict) and "latitude" in loc and "longitude" in loc:
        return float(loc["latitude"]), float(loc["longitude"])

    return None


def feature_province(feature: dict) -> str:
    """Best-effort extraction of the province code/name."""
    for key in ("province", "location", "stateProvince", "region"):
        val = feature.get(key)
        if isinstance(val, str):
            return val
        if isinstance(val, dict):
            return val.get("name") or val.get("code") or ""
    return ""


def feature_kind(feature: dict) -> str:
    """Best-effort extraction of the feature type."""
    for key in ("concise", "generic", "featureType", "type"):
        val = feature.get(key)
        if isinstance(val, str):
            return val
        if isinstance(val, dict):
            return val.get("code") or val.get("en") or ""
    return ""


def pick_best(features: list[dict]) -> dict | None:
    """Prefer Quebec results and lake-type features. Return the top survivor."""
    if not features:
        return None

    def score(f: dict) -> tuple[int, int]:
        prov = feature_province(f).lower()
        kind = feature_kind(f).lower()
        prov_rank = 0 if ("quebec" in prov or prov in {"qc", "qu"}) else 1
        kind_rank = 0 if ("lake" in kind or "lac" in kind) else 1
        return (prov_rank, kind_rank)

    return min(features, key=score)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Preview only; do not write.")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Only apply when top match is in Quebec AND a lake feature.",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=FISHING_JSON,
        help=f"Path to fishing.json (default: {FISHING_JSON})",
    )
    args = parser.parse_args()

    with args.file.open(encoding="utf-8") as f:
        data = json.load(f)

    placeholders = [
        s
        for s in data["spots"]
        if s["coordinates"]["lat"] == PLACEHOLDER_LAT
        and s["coordinates"]["lng"] == PLACEHOLDER_LNG
    ]
    print(f"Found {len(placeholders)} placeholder entries at ({PLACEHOLDER_LAT}, {PLACEHOLDER_LNG}).\n")

    updated = 0
    skipped_no_match = []
    skipped_low_confidence = []
    applied = []

    for spot in placeholders:
        name = spot["name"]
        slug = spot["slug"]
        print(f"- {slug:35s} {name!r}")

        match = None
        matched_query = None
        for query in reconstruct_name(name):
            results = search_cgndb(query)
            if results:
                candidate = pick_best(results)
                if candidate and feature_coords(candidate):
                    match = candidate
                    matched_query = query
                    break
            time.sleep(SLEEP_BETWEEN)

        if not match:
            print("    no match")
            skipped_no_match.append(slug)
            continue

        coords = feature_coords(match)
        prov = feature_province(match)
        kind = feature_kind(match)
        assert coords is not None
        lat, lng = coords
        is_qc = "quebec" in prov.lower() or prov.upper() in {"QC", "QU"}
        is_lake = "lake" in kind.lower() or "lac" in kind.lower()

        confidence = "high" if (is_qc and is_lake) else ("medium" if is_qc else "low")
        print(
            f"    -> ({lat:.4f}, {lng:.4f})  prov={prov!r}  type={kind!r}  "
            f"query={matched_query!r}  confidence={confidence}"
        )

        if args.strict and confidence != "high":
            skipped_low_confidence.append((slug, confidence))
            continue

        if not args.dry_run:
            spot["coordinates"] = {"lat": round(lat, 4), "lng": round(lng, 4)}
        applied.append(slug)
        updated += 1

    # Summary
    print("\n" + "=" * 60)
    print(f"Matched and {'would update' if args.dry_run else 'updated'}: {updated}")
    print(f"No match found: {len(skipped_no_match)}")
    if skipped_no_match:
        print("  " + ", ".join(skipped_no_match))
    if args.strict and skipped_low_confidence:
        print(f"Skipped (low confidence, --strict): {len(skipped_low_confidence)}")
        for slug, conf in skipped_low_confidence:
            print(f"  {slug} ({conf})")

    if args.dry_run:
        print("\nDry run — nothing written.")
    elif updated:
        with args.file.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"\nWrote {args.file}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
