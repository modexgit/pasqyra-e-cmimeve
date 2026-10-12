// Run in the DevTools console (or via browser automation) on https://pasqyraecmimeve.al/grupi/<group>
// after selecting city "Tiranë". Clicks through the client-side pagination and returns lines in the
// data/raw/al-YYYY-MM-DD-<group>.txt format: id|<size> <unit> <NAME> <Brand>|Chain:price:stores,...[|NR]
// The official site has no public API; please scrape gently (one group page at a time).
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const C = { "Big Market": "Bi", Conad: "Co", Extramarket: "Ex", Spar: "Sp", Xhangolli: "Xh" };
  const city = localStorage.getItem("pw-qyteti");
  if (city !== "Tiranë") { localStorage.setItem("pw-qyteti", "Tiranë"); location.reload(); return "City set to Tiranë — page reloading, run again."; }
  const grab = (m) => {
    for (const a of document.querySelectorAll('a[href*="/artikulli/"]')) {
      const id = a.href.match(/artikulli\/(\d+)/)[1];
      let el = a;
      for (let k = 0; k < 6 && el.parentElement && !/Raporto/.test(el.innerText); k++) el = el.parentElement;
      const t = el.innerText.replace(/\s+/g, " ").trim();
      if (!m.has(id) || m.get(id).length < t.length) m.set(id, t);
    }
  };
  const all = new Map();
  const pages = Math.max(1, ...[...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter((t) => /^\d+$/.test(t)).map(Number));
  for (let p = 1; p <= pages; p++) {
    if (p > 1) { const b = [...document.querySelectorAll("button")].find((b) => b.innerText.trim() === String(p)); if (!b) break; b.click(); await sleep(1200); }
    grab(all);
  }
  return [...all].map(([id, t]) => {
    const s = t.replace(/ Shiko historikun.*$/, "");
    let head = s.split(" · krahasuar")[0];
    if (/krahasuar në/.test(head)) head = head.replace(/ krahasuar.*$/, "") + " Pa markë";
    const offers = [...s.matchAll(/(Big Market|Conad|Extramarket|Spar|Xhangolli) (\d+) dyqane? në Tiranë(?: · [+−-]?[\d,]+%)? ([\d ]+) lekë/g)].map((m) => `${C[m[1]]}:${m[3].replace(/ /g, "")}:${m[2]}`);
    return `${id}|${head}|${offers.join(",")}${/pa raportim/.test(s) ? "|NR" : ""}`;
  }).join("\n");
})();
