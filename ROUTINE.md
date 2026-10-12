# Weekly update routine

Instructions for the scheduled Claude routine that keeps the data current. The routine runs in a fresh
clone of this repo. Every change must pass `python3 scripts/build.py --check` before it is committed;
pushing to `main` triggers the GitHub Pages deploy.

## Ground rules

- **Never invent a price.** Every price must come from a page you actually opened in this run, with its
  URL and today's date. If you cannot verify a price, leave it out.
- Prices are shelf prices including VAT, in local currency. Mark temporary offers with `"promo": true`.
- Do not delete history: snapshots in `data/raw/` are append-only (new files per date).
- Keep commits small and described: what was updated, how many prices, what failed.
- If `build.py --check` fails, fix the data you added; if you cannot, do not push. Report what failed.

## Steps

1. **Albania (official platform).** Try to fetch `https://pasqyraecmimeve.al/grupi/{ushqime-baze,bulmet-veze,mish,fruta-perime}`
   and `/kurse` for Tirana. The site is behind Cloudflare and often returns 503 to non-browser clients.
   - If you can read it, write new snapshot files `data/raw/al-YYYY-MM-DD-<group>.txt` and
     `al-YYYY-MM-DD-kurse.txt` in exactly the existing line formats (see the current files and
     `scripts/scrape_pasqyra.js`). Write all groups or none (a partial snapshot is rejected by the build).
   - If blocked, skip this step and say so in the commit message / summary. The site keeps showing the
     last good snapshot.
2. **Eurostat.** Run `python3 scripts/fetch_eurostat.py`.
3. **FX.** Fetch `https://open.er-api.com/v6/latest/EUR` and update `countries.json → fx.rates`
   (ALL, GBP, RSD, MKD, BAM) and `fx.as_of`.
4. **VAT.** For each country in `data/reference/countries.json`, check whether the standard or basic-food
   VAT rate has changed (official tax authority or a reputable tax news source). Only change a value
   when a source confirms it; update `notes`, `sources` and `as_of`. In particular watch: Albania's
   pending zero/reduced-rate bills for basic food.
5. **International basket.** For each item in `data/international/basket.json`, find the current price
   in each country (`XK, ME, MK, RS, BA, EL, IT, DE, AT, FR, UK`) at a major supermarket with an online
   price list. Prefer the same brand and size; for unbranded items (`"branded": false`) use the cheapest
   standard product of that kind. Append to `prices[COUNTRY]`:
   `{ "price": 1.29, "currency": "EUR", "retailer": "Conad (conad.it)", "url": "https://…", "date": "YYYY-MM-DD", "promo": false, "note": "optional" }`.
   Keep at most the 4 most recent entries per country. Aim for full coverage over a few runs; it is
   fine to fill a subset each week. Suggested retailers: IT Conad/Esselunga/Carrefour, DE REWE/Edeka/
   Kaufland, AT BILLA/SPAR/Hofer, FR Carrefour/Auchan/Leclerc, UK Tesco/Sainsbury's/Asda, EL AB/
   Sklavenitis/My Market, XK Viva Fresh/Albi, RS Maxi/Idea, MK Vero/Ramstore, ME Voli/Idea, BA Konzum/Bingo.
6. **Validate & publish.** Run `python3 scripts/build.py --check`. If it passes, commit and push to
   `main`. Summarise: snapshot date, number of basket prices added per country, anything blocked.
