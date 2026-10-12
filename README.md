# Pasqyra e Çmimeve+

An independent, open-data take on Albania's official price-comparison platform
[pasqyraecmimeve.al](https://pasqyraecmimeve.al), extended with:

- **Region & EU comparison**: Eurostat price-level indices for food (and sub-categories) for Albania,
  Kosovo, Montenegro, North Macedonia, Serbia, Bosnia and Herzegovina, Greece, Italy, Germany, Austria,
  France and the UK, plus food prices vs. consumption per head.
- **VAT breakdown**: how much of each Albanian shelf price is VAT (20% on all food), and what the same
  product would cost under each comparison country's basic-food rate.
- **Shop-style browsing** like the official platform: categories, product cards with every chain's
  price, filters, search, and a detail view per product.
- **Kurse**: every before/after price in the voluntary price-reduction initiative.
- **International basket**: the same branded products priced in supermarkets abroad, with source links.

Not affiliated with the Albanian government. Albanian prices are taken from the official platform.

**Live site:** https://modexgit.github.io/pasqyra-e-cmimeve/

## Layout

```
data/raw/                 append-only snapshots from pasqyraecmimeve.al (Tirana), one file per group per date
data/reference/           countries.json (VAT, FX, sources), eurostat.json
data/international/       basket.json (matched products + prices abroad)
scripts/build.py          validates everything and writes site/data/app.json (fails on bad data)
scripts/fetch_eurostat.py refreshes Eurostat indices
scripts/scrape_pasqyra.js in-browser scraper for the official site (it has no public API)
site/                     static site (no build tooling, no dependencies)
ROUTINE.md                what the weekly automated update does
```

## Run locally

```sh
python3 scripts/build.py
python3 -m http.server -d site 8000
```

Every push to `main` validates the data and deploys to GitHub Pages.
