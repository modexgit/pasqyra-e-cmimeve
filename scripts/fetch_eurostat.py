#!/usr/bin/env python3
"""Refresh data/reference/eurostat.json from the Eurostat API (prc_ppp_ind).

Keeps existing values when the API is unreachable or returns nothing, so a network
failure never wipes data. UK is not covered after 2020 and is carried over as-is.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "reference" / "eurostat.json"
API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_ppp_ind"
GEOS = ["AL", "XK", "ME", "MK", "RS", "BA", "TR", "EL", "IT", "DE", "AT", "FR", "EU27_2020"]


def fetch(na_item: str, cats: list[str]) -> dict:
    q = "&".join([f"na_item={na_item}", "sinceTimePeriod=2019", "format=JSON", "lang=en"]
                 + [f"ppp_cat={c}" for c in cats] + [f"geo={g}" for g in GEOS])
    with urllib.request.urlopen(f"{API}?{q}", timeout=60) as r:
        d = json.load(r)
    ids, size = d["id"], d["size"]
    stride = [1] * len(size)
    for i in range(len(size) - 2, -1, -1):
        stride[i] = stride[i + 1] * size[i + 1]
    inv = {dim: {j: c for c, j in d["dimension"][dim]["category"]["index"].items()} for dim in ids}
    out: dict = {}
    for k, val in d.get("value", {}).items():
        k = int(k)
        co = {dim: inv[dim][k // stride[i] % size[i]] for i, dim in enumerate(ids)}
        out.setdefault(co["ppp_cat"], {}).setdefault(co["geo"], {})[co["time"]] = val
    return out


def merge(dst: dict, src: dict) -> int:
    n = 0
    for cat, geos in src.items():
        for geo, years in geos.items():
            for y, v in years.items():
                if v is not None and dst.setdefault(cat, {}).setdefault(geo, {}).get(y) != v:
                    dst[cat][geo][y] = v
                    n += 1
    return n


def main() -> int:
    cur = json.loads(OUT.read_text(encoding="utf-8"))
    try:
        changed = merge(cur["pli"], fetch("PLI_EU27_2020", list(cur["categories"])))
        changed += merge(cur["volume_per_capita"], fetch("VI_PPS_EU27_2020_HAB", ["A01", "GDP"]))
    except Exception as e:  # network/API failure: keep existing data
        print(f"eurostat fetch failed, keeping existing data: {e}", file=sys.stderr)
        return 0
    if changed:
        from datetime import date
        cur["fetched"] = date.today().isoformat()
        OUT.write_text(json.dumps(cur, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"eurostat: {changed} values updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
