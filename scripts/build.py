#!/usr/bin/env python3
"""Build site/data/app.json from data/ snapshots and reference files.

Fails (exit 1) on malformed input so a bad data update never reaches the site.
Usage: python3 scripts/build.py [--check]   (--check validates without writing)
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "site" / "data" / "app.json"

CHAINS = {"Bi": "Big Market", "Co": "Conad", "Ex": "Extramarket", "Sp": "Spar", "Xh": "Xhangolli"}
CHAIN_NAMES = set(CHAINS.values())
GROUPS = {
    "ushqime-baze": "Ushqime Bazë",
    "bulmet-veze": "Bulmet & Vezë",
    "mish": "Mish & Produkte Mishi",
    "fruta-perime": "Fruta & Perime",
}
SUBCATS = [  # (regex on normalized name, subcategory)
    (r"\bGJALP", "Gjalpë"), (r"\bVEZE\b", "Vezë"), (r"\b(QUMESHT|PIJE ME BAZE QUMESHTI|LATTE)\b", "Qumësht"),
    (r"\b(KOS|YOGURT|KREM KOSI)\b", "Kos"), (r"\bVAJ\b", "Vaj"), (r"\b(MIELL|FARINA)\b", "Miell"),
    (r"\b(SHEQER|ZUCCHERO)\b", "Sheqer"), (r"\bORIZ\b", "Oriz"), (r"\b(MAKARONA|SPAGHETTI|SPAGHETTINI)\b", "Makarona"),
    (r"\b(PULE|ZOG|PULASTREN)\b", "Pulë"), (r"\bDOMATE\b", "Perime"), (r"\b(MOLLE|BANANE)\b", "Fruta"),
]
FOOD_CATEGORIES = {"Makarona", "Miell", "Gjalpë", "Qumësht", "Kos", "Vezë", "Vaj", "Sheqer", "Oriz", "Pulë", "Fruta", "Perime"}
STOP = {"ME", "I", "E", "NE", "TE", "PER", "GR", "G", "KG", "LT", "L", "ML", "NR", "N", "PZ", "X", "PAKO", "COPE"}

errors: list[str] = []


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.upper())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("DET.", " ").replace("GJALP ", "GJALPE ").replace("THJERRZA", "THJERREZA")
    s = re.sub(r"(\d)[,.](\d)", r"\1_\2", s)
    s = re.sub(r"(\d+)(GR|G|KG|LT|L|ML)\b", r"\1 \2", s)
    s = re.sub(r"[^A-Z0-9_ ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tokens(s: str) -> set[str]:
    return {t for t in norm(s).split() if t not in STOP}


def subcategory(name: str) -> str:
    n = norm(name)
    for rx, cat in SUBCATS:
        if re.search(rx, n):
            return cat
    return "Të tjera"


def split_brand(rest: str) -> tuple[str, str]:
    """'GJALPE ERZENI 250 GR Erzeni' -> ('GJALPE ERZENI 250 GR', 'Erzeni'). Brand = trailing non-uppercase words."""
    words = rest.split()
    i = len(words)
    while i > 1 and words[i - 1] != words[i - 1].upper():
        i -= 1
    if i == len(words):
        return rest, ""
    return " ".join(words[:i]), " ".join(words[i:])


SIZE_RX = re.compile(r"^(\d+(?:[.,]\d+)?) (gr|kg|litër|copë) (.+)$")


def parse_size(val: str, unit: str) -> tuple[float, str]:
    v = float(val.replace(",", "."))
    return {"gr": (v / 1000, "kg"), "kg": (v, "kg"), "litër": (v, "l"), "copë": (v, "copë")}[unit]


def title_size_kg(name: str) -> float | None:
    n = norm(name)
    m = re.search(r"\b(\d+) X (\d+) (GR|G)\b", n) or re.search(r"\b(\d+)X(\d+) (GR|G)\b", n)
    if m:
        return int(m.group(1)) * int(m.group(2)) / 1000
    m = re.search(r"(?<![/_])\b(\d+(?:_\d+)?) (GR|G|KG)\b", n)
    if not m:
        return None
    v = float(m.group(1).replace("_", "."))
    return v / 1000 if m.group(2) in ("GR", "G") else v


def parse_offers(s: str, where: str) -> list[dict]:
    out = []
    for part in filter(None, s.split(",")):
        try:
            code, price, stores = part.split(":")
            p, st = int(price), int(stores)
        except ValueError:
            errors.append(f"{where}: bad offer '{part}'")
            continue
        if code not in CHAINS:
            errors.append(f"{where}: unknown chain '{code}'")
        elif not 0 < p < 100_000:
            errors.append(f"{where}: price out of range {p}")
        else:
            out.append({"chain": CHAINS[code], "price": p, "stores": st})
    return out


def load_listing(date: str) -> list[dict]:
    products = []
    for slug, gname in GROUPS.items():
        f = RAW / f"al-{date}-{slug}.txt"
        if not f.exists():
            continue
        for ln, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip() or line.startswith("#"):
                continue
            where = f"{f.name}:{ln}"
            parts = line.split("|")
            if len(parts) < 3:
                errors.append(f"{where}: expected id|head|offers")
                continue
            pid, head, offers_s, *flags = parts
            m = SIZE_RX.match(head)
            if not pid.isdigit() or not m:
                errors.append(f"{where}: cannot parse id/size from '{head}'")
                continue
            qty, basis = parse_size(m.group(1), m.group(2))
            name, brand = split_brand(m.group(3))
            offers = sorted(parse_offers(offers_s, where), key=lambda o: o["price"])
            if not offers:
                errors.append(f"{where}: no offers")
                continue
            qa = []
            if basis == "kg":
                t = title_size_kg(name)
                if t and abs(t - qty) / qty > 0.05:
                    qa.append(f"Madhësia në emër ({t*1000:g} g) ≠ madhësia e deklaruar ({qty*1000:g} g); çmimi për kg mund të jetë i gabuar.")
            if "NR" in flags:
                qa.append("Të paktën një tregtar nuk e ka raportuar çmimin këtë javë (çmimi i javës së kaluar).")
            per = 10 if basis == "copë" else 1
            for o in offers:
                o["unit_price"] = round(o["price"] / qty * per, 1)
            lo, hi = offers[0]["price"], offers[-1]["price"]
            products.append({
                "id": int(pid), "group": gname, "sub": subcategory(name), "name": name, "brand": brand,
                "size": m.group(1) + " " + m.group(2), "qty": qty,
                "basis": "10 copë" if basis == "copë" else basis,
                "offers": offers, "min": lo, "max": hi,
                "spread_pct": round((hi - lo) / lo * 100, 1) if len(offers) > 1 else None,
                "not_reported": "NR" in flags, "qa": qa,
            })
    return products


def load_kurse(date: str) -> list[dict]:
    f = RAW / f"al-{date}-kurse.txt"
    rows = []
    if not f.exists():
        return rows
    for ln, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) != 5 or parts[0] not in CHAIN_NAMES:
            errors.append(f"{f.name}:{ln}: expected chain|name|sub|after|before")
            continue
        chain, name, sub, after, before = parts
        try:
            a, b = int(after), int(before)
        except ValueError:
            errors.append(f"{f.name}:{ln}: non-integer price")
            continue
        if not 0 < a <= b:
            errors.append(f"{f.name}:{ln}: after price must be >0 and <= before ({a} vs {b})")
            continue
        rows.append({"chain": chain, "name": name, "sub": sub, "after": a, "before": b,
                     "saving": b - a, "pct": round((b - a) / b * 100, 1)})
    return rows


def cross_check(kurse: list[dict], products: list[dict]) -> None:
    """Match each KURSE row to the same product in the weekly listing and compare the chain's price."""
    by_chain = defaultdict(list)
    for p in products:
        tk = tokens(p["name"] + " " + p["brand"])
        for o in p["offers"]:
            by_chain[o["chain"]].append((p, o, tk))
    for k in kurse:
        tk = tokens(k["name"])
        best, score = None, 0.0
        for p, o, tp in by_chain[k["chain"]]:
            if not tk <= tp:  # every KURSE token must appear in the listing name
                continue
            s = len(tk & tp) / len(tk | tp)
            if s > score:
                best, score = (p, o), s
        if best and score >= 0.6:
            p, o = best
            k["match"] = {"id": p["id"], "listing_price": o["price"], "score": round(score, 2)}
            k["consistent"] = o["price"] == k["after"]
            if not k["consistent"]:
                k["lag"] = o["price"] == k["before"]  # weekly listing still shows the pre-KURSE price


def chain_metrics(products: list[dict], kurse: list[dict]) -> list[dict]:
    m = {c: {"chain": c, "listed": 0, "shared": 0, "cheapest": 0, "premiums": [], "not_reported": 0,
             "stores_tirana": 0} for c in CHAIN_NAMES}
    for p in products:
        multi = len(p["offers"]) > 1
        for o in p["offers"]:
            c = m[o["chain"]]
            c["listed"] += 1
            c["stores_tirana"] = max(c["stores_tirana"], o["stores"])
            if multi:
                c["shared"] += 1
                c["premiums"].append((o["price"] - p["min"]) / p["min"] * 100)
                if o["price"] == p["min"]:
                    c["cheapest"] += 1
    out = []
    for c in m.values():
        ks = [k for k in kurse if k["chain"] == c["chain"]]
        checked = [k for k in ks if "match" in k]
        out.append({
            "chain": c["chain"], "listed": c["listed"], "shared": c["shared"], "stores_tirana": c["stores_tirana"],
            "cheapest_share": round(c["cheapest"] / c["shared"] * 100, 1) if c["shared"] else None,
            "avg_premium": round(sum(c["premiums"]) / len(c["premiums"]), 1) if c["premiums"] else None,
            "kurse_count": len(ks),
            "kurse_avg_cut": round(sum(k["pct"] for k in ks) / len(ks), 1) if ks else None,
            "kurse_median_cut": round(median(k["pct"] for k in ks), 1) if ks else None,
            "kurse_checked": len(checked),
            "kurse_mismatch": sum(1 for k in checked if not k["consistent"]),
            "kurse_lag": sum(1 for k in checked if k.get("lag")),
        })
    return sorted(out, key=lambda r: r["chain"])


def history(dates: list[str]) -> list[dict]:
    """Price changes per product/chain between consecutive snapshots."""
    changes = []
    prev = None
    for d in dates:
        cur = {(p["id"], o["chain"]): (o["price"], p["name"]) for p in load_listing(d) for o in p["offers"]}
        if prev is not None:
            for key, (price, name) in cur.items():
                if key in prev[1] and prev[1][key][0] != price:
                    old = prev[1][key][0]
                    changes.append({"id": key[0], "chain": key[1], "name": name, "from_date": prev[0], "to_date": d,
                                    "old": old, "new": price, "pct": round((price - old) / old * 100, 1)})
        prev = (d, cur)
    return changes


def basket(products: list[dict], kurse: list[dict], countries: dict) -> list[dict]:
    spec = json.loads((ROOT / "data" / "international" / "basket.json").read_text(encoding="utf-8"))
    rates = countries["fx"]["rates"]
    vat = {c["code"]: c["vat"] for c in countries["countries"]}
    by_id = {p["id"]: p for p in products}
    out = []
    for it in spec["items"]:
        al = it["al"]
        ref, al_ids = None, []
        if "product_ids" in al:
            ps = [by_id[i] for i in al["product_ids"] if i in by_id]
            if ps:
                al_ids = [p["id"] for p in ps]
                ref = {"price": min(p["min"] for p in ps), "label": ps[0]["name"], "source": "pasqyraecmimeve.al"}
        elif "generic" in al:
            ps = [p for p in products if p["sub"] == al["generic"]]
            if ps:
                p = min(ps, key=lambda p: p["offers"][0]["unit_price"])
                al_ids = [p["id"]]
                ref = {"price": round(p["offers"][0]["unit_price"]), "label": f"{p['name']} (për {p['basis']})",
                       "source": "pasqyraecmimeve.al"}
        elif "kurse" in al:
            ks = [k for k in kurse if f"{k['chain']}|{k['name']}" in al["kurse"]]
            if ks:
                div = al.get("per_unit_divisor", 1)
                ref = {"price": round(ks[0]["after"] / div, 1), "label": ks[0]["name"], "source": "KURSE"}
        food = it["category"] in FOOD_CATEGORIES
        row = {"key": it["key"], "name": it["name"], "size": it["size"], "category": it["category"],
               "branded": it["branded"], "food": food, "al_ids": al_ids, "countries": {}}
        if ref:
            eur = ref["price"] / rates["ALL"]
            r = vat["AL"]["basic_food" if food else "standard"]
            row["countries"]["AL"] = {**ref, "currency": "ALL", "eur": round(eur, 2), "eur_net": round(eur / (1 + r / 100), 2)}
        for code, lst in it.get("prices", {}).items():
            if code not in vat:
                errors.append(f"basket {it['key']}: unknown country {code}")
                continue
            valid = [x for x in lst if x.get("price") and x.get("currency") in rates and x.get("url") and x.get("date")]
            if len(valid) != len(lst):
                errors.append(f"basket {it['key']}/{code}: every price needs price, currency, url, date")
            if not valid:
                continue
            x = sorted(valid, key=lambda x: x["date"])[-1]
            eur = x["price"] / rates[x["currency"]]
            r = vat[code]["basic_food" if food else "standard"]
            row["countries"][code] = {**x, "eur": round(eur, 2), "eur_net": round(eur / (1 + r / 100), 2)}
        out.append(row)
    return out


def main() -> int:
    dates = sorted({m.group(1) for f in RAW.glob("al-*.txt") if (m := re.match(r"al-(\d{4}-\d{2}-\d{2})-", f.name))})
    if not dates:
        print("no snapshots in data/raw", file=sys.stderr)
        return 1
    latest = dates[-1]
    products = load_listing(latest)
    kurse = load_kurse(max((d for d in dates if (RAW / f"al-{d}-kurse.txt").exists()), default=latest))
    cross_check(kurse, products)
    countries = json.loads((ROOT / "data" / "reference" / "countries.json").read_text(encoding="utf-8"))
    eurostat = json.loads((ROOT / "data" / "reference" / "eurostat.json").read_text(encoding="utf-8"))
    bsk = basket(products, kurse, countries)
    if len({p["id"] for p in products}) != len(products):
        errors.append("duplicate product ids in latest snapshot")
    if len(products) < 50:
        errors.append(f"only {len(products)} products in latest snapshot — refusing to publish a partial scrape")
    if errors:
        print("VALIDATION FAILED:\n  " + "\n  ".join(errors[:50]), file=sys.stderr)
        return 1
    app = {
        "meta": {"snapshot": latest, "snapshots": dates, "city": "Tiranë", "products": len(products),
                 "offers": sum(len(p["offers"]) for p in products), "kurse": len(kurse),
                 "source": "https://pasqyraecmimeve.al"},
        "products": products, "kurse": kurse, "chains": chain_metrics(products, kurse),
        "changes": history(dates), "countries": countries, "eurostat": eurostat, "basket": bsk,
    }
    if "--check" not in sys.argv:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(app, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    checked = [k for k in kurse if "match" in k]
    print(f"ok: {len(products)} products, {app['meta']['offers']} offers, {len(kurse)} KURSE rows "
          f"({len(checked)} cross-checked, {sum(not k['consistent'] for k in checked)} mismatches), "
          f"{len(app['changes'])} price changes, basket {sum(len(b['countries']) for b in bsk)} prices")
    return 0


if __name__ == "__main__":
    sys.exit(main())
