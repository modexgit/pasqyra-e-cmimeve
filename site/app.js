"use strict";
(() => {
  const CHAIN_COLOR = { "Big Market": "var(--s1)", "Conad": "var(--s2)", "Extramarket": "var(--s3)", "Spar": "var(--s4)", "Xhangolli": "var(--s5)" };
  const COMPARE = ["XK", "ME", "MK", "RS", "BA", "EL", "IT", "DE", "AT", "FR", "UK"];
  const FOOD_SUBS = new Set(["Kripë", "Vezë", "Oriz", "Qumësht lope", "Thjerëza", "Miell gruri", "Makarona", "Salcë domate", "Fasule", "Kos natyral", "Djathë i bardhë", "Gjalpë", "Ujë", "Niseshte", "Banane", "Sheqer", "Kafe", "Salçiçe / Hot dog", "Proshutë", "Sallam", "Lëngje frutash", "Biskota", "Bullgur", "Vaj luledielli", "Vaj ulliri", "Speca konservë"]);
  const PAGE = 40;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Albanian number format (space thousands, comma decimals) without relying on browser locale data
  const fmt = (v, d) => { const [i, f] = Math.abs(v).toFixed(d).split("."); return (v < 0 ? "−" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + (f ? "," + f : ""); };
  const n0 = (v) => fmt(v, 0);
  const n1 = (v) => fmt(v, 1);
  const eur = (v) => "€" + fmt(v, 2);
  const MONTHS = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
  const lek = (v) => n0(v) + " L";
  const subOf = (k) => k.sub.split(" · ")[0];
  const isFood = (k) => FOOD_SUBS.has(subOf(k));

  // ---------- theme ----------
  const themeBtn = $("#themeBtn");
  const applyTheme = (t) => { if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); };
  try { applyTheme(localStorage.getItem("theme")); } catch (_) { /* storage unavailable */ }
  themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch (_) { /* ignore */ }
  });

  // ---------- tooltip ----------
  const tip = $("#tip");
  document.addEventListener("pointermove", (e) => {
    const t = e.target.closest("[data-tip]");
    if (!t) { tip.classList.remove("on"); return; }
    tip.innerHTML = t.getAttribute("data-tip");
    tip.classList.add("on");
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  });

  // ---------- charts (inline SVG) ----------
  function hbar(el, rows, o = {}) {
    const W = 640, rowH = o.rowH || 30, labelW = o.labelW || 150, valW = 70, top = 8;
    const max = o.max ?? Math.max(...rows.map((r) => r.value), o.ref ?? 0) * 1.05;
    const plotW = W - labelW - valW;
    const H = top + rows.length * rowH + 22;
    const x = (v) => labelW + (Math.max(0, v) / max) * plotW;
    const ticks = o.ticks || [0, max / 2, max].map((t) => Math.round(t));
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "")}">`;
    for (const t of ticks) s += `<line class="gridline" x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${H - 20}"/><text x="${x(t)}" y="${H - 6}" text-anchor="middle">${t}${o.unit || ""}</text>`;
    rows.forEach((r, i) => {
      const y = top + i * rowH, bh = Math.min(18, rowH - 10), by = y + (rowH - bh) / 2;
      const w = Math.max(2, x(r.value) - labelW);
      s += `<g class="row" data-tip="${esc(r.tip || `${r.label}: ${r.value}`)}">`;
      s += `<rect class="hit" x="0" y="${y}" width="${W}" height="${rowH}"/>`;
      s += `<text class="${r.highlight ? "lbl" : ""}" x="${labelW - 10}" y="${y + rowH / 2 + 4}" text-anchor="end">${esc(r.label)}</text>`;
      s += `<path class="bar" d="M${labelW},${by} h${w - 4} a4,4 0 0 1 4,4 v${bh - 8} a4,4 0 0 1 -4,4 h-${w - 4} z" fill="${r.color || "var(--neutral-bar)"}"/>`;
      s += `<text class="val" x="${labelW + w + 6}" y="${y + rowH / 2 + 4}">${esc(r.display ?? r.value)}</text></g>`;
    });
    if (o.ref != null) s += `<line class="ref" x1="${x(o.ref)}" x2="${x(o.ref)}" y1="${top - 4}" y2="${H - 20}"/><text x="${x(o.ref) + 4}" y="${top + 6}" class="small">${esc(o.refLabel || "")}</text>`;
    el.innerHTML = s + "</svg>";
  }

  function hbar2(el, rows, o = {}) { // two bars per row, same scale
    const W = 640, rowH = 40, labelW = 150, valW = 50, top = 8;
    const max = Math.max(...rows.flatMap((r) => [r.a, r.b]), 100) * 1.05;
    const plotW = W - labelW - valW, H = top + rows.length * rowH + 22;
    const x = (v) => labelW + (v / max) * plotW;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "")}">`;
    for (const t of [0, 50, 100, 150].filter((t) => t <= max)) s += `<line class="gridline" x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${H - 20}"/><text x="${x(t)}" y="${H - 6}" text-anchor="middle">${t}</text>`;
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      s += `<g class="row" data-tip="${esc(`<b>${r.label}</b><br>Çmimet e ushqimeve: ${r.a}<br>Konsumi për frymë: ${r.b}`)}"><rect class="hit" x="0" y="${y}" width="${W}" height="${rowH}"/>`;
      s += `<text class="${r.highlight ? "lbl" : ""}" x="${labelW - 10}" y="${y + rowH / 2 + 4}" text-anchor="end">${esc(r.label)}</text>`;
      [[r.a, "var(--s2)", y + 5], [r.b, "var(--s1)", y + 21]].forEach(([v, c, by]) => {
        const w = Math.max(2, x(v) - labelW);
        s += `<path d="M${labelW},${by} h${w - 3} a3,3 0 0 1 3,3 v8 a3,3 0 0 1 -3,3 h-${w - 3} z" fill="${c}"/><text class="val" x="${labelW + w + 5}" y="${by + 11}" style="font-size:11px">${v}</text>`;
      });
      s += "</g>";
    });
    s += `<line class="ref" x1="${x(100)}" x2="${x(100)}" y1="${top - 4}" y2="${H - 20}"/>`;
    el.innerHTML = s + "</svg>";
  }

  function line(el, pts, o = {}) {
    const W = 640, H = 240, l = 40, r = 60, t = 14, b = 28;
    const ys = pts.map((p) => p.y).concat([o.ref ?? pts[0].y]);
    const lo = Math.floor((Math.min(...ys) - 5) / 10) * 10, hi = Math.ceil((Math.max(...ys) + 5) / 10) * 10;
    const X = (i) => l + (i / (pts.length - 1)) * (W - l - r), Y = (v) => t + (1 - (v - lo) / (hi - lo)) * (H - t - b);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "")}">`;
    for (let v = lo; v <= hi; v += 10) s += `<line class="gridline" x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
    if (o.ref != null) s += `<line class="ref" x1="${l}" x2="${W - r}" y1="${Y(o.ref)}" y2="${Y(o.ref)}"/><text x="${W - r + 6}" y="${Y(o.ref) + 4}">${esc(o.refLabel)}</text>`;
    s += `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${X(i)},${Y(p.y)}`).join(" ")}" fill="none" stroke="var(--s2)" stroke-width="2.5" stroke-linejoin="round"/>`;
    pts.forEach((p, i) => {
      s += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${p.x}</text>`;
      s += `<g data-tip="${esc(`${p.x}: <b>${n1(p.y)}</b>`)}"><circle cx="${X(i)}" cy="${Y(p.y)}" r="14" fill="transparent"/><circle cx="${X(i)}" cy="${Y(p.y)}" r="4.5" fill="var(--s2)" stroke="var(--surface)" stroke-width="2"/></g>`;
    });
    const last = pts[pts.length - 1];
    s += `<text class="lbl" x="${X(pts.length - 1) + 8}" y="${Y(last.y) - 8}">${esc(o.lastLabel || "")} ${n1(last.y)}</text>`;
    el.innerHTML = s + "</svg>";
  }

  // ---------- table helper with sort + paging ----------
  function makeTable({ table, pager, columns, rows, initialSort, pageSize = PAGE, empty = "Asnjë rezultat." }) {
    let sortKey = initialSort?.key, dir = initialSort?.dir ?? 1, page = 0, data = rows;
    const render = () => {
      const col = columns.find((c) => c.key === sortKey);
      const sorted = col ? [...data].sort((a, b) => { const x = col.sort(a), y = col.sort(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; }) : data;
      const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
      page = Math.min(page, pages - 1);
      const slice = sorted.slice(page * pageSize, page * pageSize + pageSize);
      table.innerHTML = `<thead><tr>${columns.map((c) => `<th class="${c.num ? "num " : ""}${c.sort ? "sortable " : ""}${c.cls || ""}" data-k="${c.key}" scope="col">${c.label}${c.key === sortKey ? (dir > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead>` +
        `<tbody>${slice.length ? slice.map((r) => `<tr>${columns.map((c) => `<td class="${c.num ? "num " : ""}${c.cls || ""}">${c.cell(r)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}" class="empty">${empty}</td></tr>`}</tbody>`;
      $$("th.sortable", table).forEach((th) => th.addEventListener("click", () => { const k = th.dataset.k; dir = k === sortKey ? -dir : 1; sortKey = k; render(); }));
      if (pager) {
        pager.innerHTML = `<span>${n0(sorted.length)} rreshta · faqja ${page + 1} nga ${pages}</span><span><button type="button" ${page ? "" : "disabled"} data-p="-1">← Para</button> <button type="button" ${page < pages - 1 ? "" : "disabled"} data-p="1">Pas →</button></span>`;
        $$("button", pager).forEach((b) => b.addEventListener("click", () => { page += +b.dataset.p; render(); table.scrollIntoView({ block: "nearest" }); }));
      }
    };
    render();
    return { set(rows) { data = rows; page = 0; render(); } };
  }

  const opt = (sel, items, all) => { sel.innerHTML = (all ? `<option value="">${esc(all)}</option>` : "") + items.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(""); };

  // ---------- main ----------
  fetch("data/app.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init).catch((e) => {
    $("main").innerHTML = `<p class="empty">Të dhënat nuk u ngarkuan (${esc(e.message)}). Provoni përsëri më vonë.</p>`;
  });

  function init(D) {
    const C = Object.fromEntries(D.countries.countries.map((c) => [c.code, c]));
    const pli = D.eurostat.pli, vol = D.eurostat.volume_per_capita;
    const lastYear = (cat) => Object.keys(pli[cat].AL).sort().pop();
    const chains = D.chains;
    const spar = chains.find((c) => c.chain === "Spar");
    const lagged = D.kurse.filter((k) => k.match && !k.consistent);
    const kAvg = D.kurse.reduce((s, k) => s + k.pct, 0) / D.kurse.length;
    const y = lastYear("A0101");
    const foodAL = pli.A0101.AL[y], volAL = vol.A01.AL[y], genAL = pli.A01.AL[y];
    const fmtDate = (d) => { const [yy, mm, dd] = d.split("-").map(Number); return `${dd} ${MONTHS[mm - 1]} ${yy}`; };

    $("#footMeta").textContent = `Të dhënat për Shqipërinë: ${fmtDate(D.meta.snapshot)} (Tiranë). Eurostat: ${y}. Kurset e këmbimit: ${fmtDate(D.countries.fx.as_of)}.`;

    // --- overview ---
    $("#heroStats").innerHTML = [
      [n0(D.meta.products), "produkte bazë të ndjekura në Tiranë"],
      [n0(D.meta.offers), "çmime nga 5 tregtarë"],
      [`−${n1(kAvg)}%`, `ulja mesatare e deklaruar në ${n0(D.kurse.length)} produkte KURSE`],
      [`${C.AL.vat.basic_food}%`, "TVSH mbi ushqimet bazë në Shqipëri"],
    ].map(([v, l]) => `<div class="card stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");

    const lowest = COMPARE.filter((c) => C[c]).map((c) => C[c]).sort((a, b) => a.vat.basic_food - b.vat.basic_food);
    $("#insights").innerHTML = [
      `<div class="card insight"><div class="big">${n1(foodAL)} vs ${volAL}</div><p>Në ${y}, ushqimet në Shqipëri kushtonin <b>${n1(foodAL)}%</b> të mesatares së BE-së, ndërsa konsumi për frymë ishte vetëm <b>${volAL}%</b> e saj. Niveli i përgjithshëm i çmimeve ishte ${n1(genAL)}%, pra ushqimi është relativisht shumë më i shtrenjtë se pjesa tjetër e jetesës.</p><a href="#rajoni" class="small">Shiko krahasimin →</a></div>`,
      `<div class="card insight"><div class="big">20% vs ${lowest.slice(0, 3).map((c) => c.vat.basic_food + "%").join(" / ")}</div><p>Shqipëria vendos TVSH 20% mbi bukën, qumështin e vezët. ${lowest.slice(0, 3).map((c) => `${c.name} ${c.vat.basic_food}%`).join(", ")}; Kosova ${C.XK.vat.basic_food}%. Në një produkt 120 lekë, 20 lekë janë TVSH.</p><a href="#rajoni" class="small">Llogarit TVSH-në →</a></div>`,
      `<div class="card insight"><div class="big">${n0(spar.cheapest_share)}%</div><p>Spar ka çmimin më të ulët në ${n0(spar.cheapest_share)}% të produkteve që shiten nga më shumë se një tregtar në Tiranë. Në ${lagged.length} produkte KURSE të kontrolluara, lista javore e Xhangollit dhe Conad-it ende tregonte çmimin e vjetër ose një çmim tjetër.</p><a href="#tregtaret" class="small">Shiko tregtarët →</a></div>`,
    ].join("");

    const topCuts = [...D.kurse].filter(isFood).sort((a, b) => b.pct - a.pct).slice(0, 6);
    $("#changedSub").textContent = D.changes.length
      ? `${D.changes.length} ndryshime çmimesh nga ${fmtDate(D.meta.snapshots.at(-2))} deri më ${fmtDate(D.meta.snapshot)}.`
      : `Nisma KURSE hyri në fuqi më 12 tetor 2026. Krahasimi javë-pas-jave i çmimeve fillon me përditësimin e ardhshëm (snapshot i parë: ${fmtDate(D.meta.snapshot)}).`;
    const ups = D.changes.filter((c) => c.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 6);
    const downs = D.changes.filter((c) => c.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 6);
    const li = (rows, f) => rows.length ? `<table><tbody>${rows.map(f).join("")}</tbody></table>` : `<p class="muted small">Ende asnjë.</p>`;
    $("#changed").innerHTML =
      `<div class="card"><h3>Uljet më të mëdha te ushqimet (KURSE)</h3>${li(topCuts, (k) => `<tr><td><span class="chip"><span class="dot" style="background:${CHAIN_COLOR[k.chain]}"></span>${esc(k.chain)}</span> ${esc(k.name)}</td><td class="num"><s class="muted">${lek(k.before)}</s> → <b>${lek(k.after)}</b></td><td class="num down">−${n0(k.pct)}%</td></tr>`)}</div>` +
      (D.changes.length
        ? `<div class="card"><h3>Rritjet e javës</h3>${li(ups, (c) => `<tr><td>${esc(c.chain)} · ${esc(c.name)}</td><td class="num">${lek(c.old)} → ${lek(c.new)}</td><td class="num up">+${n1(c.pct)}%</td></tr>`)}<h3 style="margin-top:12px">Uljet e javës</h3>${li(downs, (c) => `<tr><td>${esc(c.chain)} · ${esc(c.name)}</td><td class="num">${lek(c.old)} → ${lek(c.new)}</td><td class="num down">${n1(c.pct)}%</td></tr>`)}</div>`
        : `<div class="card"><h3>Mospërputhje në të dhënat zyrtare</h3>${li(lagged, (k) => `<tr><td><span class="chip"><span class="dot" style="background:${CHAIN_COLOR[k.chain]}"></span>${esc(k.chain)}</span> ${esc(k.name)}</td><td class="num">KURSE ${lek(k.after)} · lista ${lek(k.match.listing_price)}</td><td><span class="flag ${k.lag ? "warn" : "bad"}">${k.lag ? "Vonesë" : "Ndryshe"}</span></td></tr>`)}<p class="small muted">Burimi për të dyja vlerat është pasqyraecmimeve.al. “Vonesë”: lista javore tregon ende çmimin para uljes.</p></div>`);

    // --- products ---
    const groups = [...new Set(D.products.map((p) => p.group))];
    const subs = [...new Set(D.products.map((p) => p.sub))].sort();
    opt($("#fGroup"), groups.map((g) => [g, g]), "Të gjitha grupet");
    opt($("#fSub"), subs.map((s) => [s, s]), "Të gjitha kategoritë");
    opt($("#fChain"), Object.keys(CHAIN_COLOR).map((c) => [c, c]), "Të gjithë tregtarët");
    opt($("#fVat"), COMPARE.map((c) => [c, `Me TVSH si në ${C[c].name} (${C[c].vat.basic_food}%)`]));
    $("#fVat").value = "AT";
    const vatRate = () => C[$("#fVat").value].vat.basic_food;
    const prodTable = makeTable({
      table: $("#tProducts"), pager: $("#pProducts"), initialSort: { key: "unit", dir: 1 },
      columns: [
        { key: "name", label: "Produkti", sort: (p) => p.name, cell: (p) => `<div class="pname">${esc(p.name)}</div><div class="pmeta">${esc(p.brand || "—")} · ${esc(p.size)} · ${esc(p.sub)}</div>${p.qa.map((q) => `<span class="flag warn" data-tip="${esc(q)}">⚠ ${q.startsWith("Madh") ? "Madhësi e paqartë" : "Pa raportim"}</span>`).join(" ")}` },
        { key: "offers", label: "Çmimi sipas tregtarit", cell: (p) => p.offers.map((o) => `<span class="chip ${o.price === p.min && p.offers.length > 1 ? "best" : ""}" data-tip="${esc(`${o.chain}: ${lek(o.price)} · ${o.stores} dyqane në Tiranë`)}"><span class="dot" style="background:${CHAIN_COLOR[o.chain]}"></span>${esc(o.chain)} ${lek(o.price)}</span>`).join("") },
        { key: "unit", label: "Për njësi", num: true, sort: (p) => p.offers[0].unit_price, cell: (p) => `${n0(p.offers[0].unit_price)} L/${esc(p.basis)}` },
        { key: "spread", label: "Diferenca", num: true, cls: "hide-sm", sort: (p) => p.spread_pct ?? -1, cell: (p) => p.spread_pct == null ? `<span class="muted">1 tregtar</span>` : `${n0(p.spread_pct)}%` },
        { key: "vat", label: "nga të cilat TVSH", num: true, cls: "hide-sm", sort: (p) => p.min, cell: (p) => lek(p.min - p.min / 1.2) },
        { key: "alt", label: "Me TVSH tjetër", num: true, sort: (p) => p.min, cell: (p) => { const v = (p.min / 1.2) * (1 + vatRate() / 100); return `<b>${lek(v)}</b><div class="pmeta down">−${lek(p.min - v)}</div>`; } },
      ],
      rows: D.products,
    });
    const filterProducts = () => {
      const q = $("#q").value.trim().toLowerCase(), g = $("#fGroup").value, s = $("#fSub").value, ch = $("#fChain").value;
      prodTable.set(D.products.filter((p) => (!q || (p.name + " " + p.brand).toLowerCase().includes(q)) && (!g || p.group === g) && (!s || p.sub === s) && (!ch || p.offers.some((o) => o.chain === ch))));
    };
    ["#q", "#fGroup", "#fSub", "#fChain", "#fVat"].forEach((id) => $(id).addEventListener("input", filterProducts));

    // --- chains ---
    const listed = chains.filter((c) => c.shared > 0).sort((a, b) => b.cheapest_share - a.cheapest_share);
    hbar($("#cCheapest"), listed.map((c) => ({ label: c.chain, value: c.cheapest_share, display: `${n0(c.cheapest_share)}%`, color: CHAIN_COLOR[c.chain], tip: `<b>${c.chain}</b><br>Më i liri në ${n0(c.cheapest_share)}% të ${c.shared} produkteve të përbashkëta` })), { max: 100, ticks: [0, 50, 100], unit: "%", aria: "Përqindja e produkteve ku tregtari është më i liri" });
    const byPrem = [...listed].sort((a, b) => a.avg_premium - b.avg_premium);
    hbar($("#cPremium"), byPrem.map((c) => ({ label: c.chain, value: c.avg_premium, display: `+${n1(c.avg_premium)}%`, color: CHAIN_COLOR[c.chain], tip: `<b>${c.chain}</b><br>Mesatarisht ${n1(c.avg_premium)}% mbi çmimin më të ulët` })), { unit: "%", aria: "Diferenca mesatare ndaj çmimit më të ulët" });
    makeTable({
      table: $("#tChains"), columns: [
        { key: "chain", label: "Tregtari", sort: (c) => c.chain, cell: (c) => `<span class="chip"><span class="dot" style="background:${CHAIN_COLOR[c.chain]}"></span>${esc(c.chain)}</span>` },
        { key: "stores", label: "Dyqane në Tiranë", num: true, sort: (c) => c.stores_tirana, cell: (c) => c.stores_tirana || "—" },
        { key: "listed", label: "Produkte në listë", num: true, sort: (c) => c.listed, cell: (c) => c.listed || `<span class="flag warn" data-tip="Ky tregtar nuk ka çmime në listën javore për Tiranën, vetëm në KURSE.">0</span>` },
        { key: "cheap", label: "Më i liri", num: true, sort: (c) => c.cheapest_share ?? -1, cell: (c) => c.cheapest_share == null ? "—" : `${n0(c.cheapest_share)}%` },
        { key: "prem", label: "Mbi më të lirin", num: true, sort: (c) => c.avg_premium ?? -1, cell: (c) => c.avg_premium == null ? "—" : `+${n1(c.avg_premium)}%` },
        { key: "kc", label: "Produkte KURSE", num: true, sort: (c) => c.kurse_count, cell: (c) => c.kurse_count },
        { key: "kcut", label: "Ulja mesatare", num: true, sort: (c) => c.kurse_avg_cut ?? -1, cell: (c) => c.kurse_avg_cut == null ? "—" : `−${n1(c.kurse_avg_cut)}%` },
        { key: "kchk", label: "Përputhja KURSE", num: true, sort: (c) => c.kurse_checked ? c.kurse_mismatch / c.kurse_checked : -1, cell: (c) => !c.kurse_checked ? `<span class="muted">s'ka të dhëna</span>` : c.kurse_mismatch === 0 ? `<span class="flag good">✓ ${c.kurse_checked}/${c.kurse_checked}</span>` : `<span class="flag warn" data-tip="${c.kurse_lag} me vonesë (lista tregon çmimin e vjetër), ${c.kurse_mismatch - c.kurse_lag} me çmim tjetër">${c.kurse_checked - c.kurse_mismatch}/${c.kurse_checked}</span>` },
      ], rows: chains, initialSort: { key: "cheap", dir: -1 },
    });

    // --- KURSE ---
    const foodK = D.kurse.filter(isFood);
    $("#kurseStats").innerHTML = [
      [n0(D.kurse.length), "produkte në KURSE"],
      [n0(foodK.length), "prej tyre ushqime"],
      [`−${n1(kAvg)}%`, "ulja mesatare (të gjitha)"],
      [`−${n1(foodK.reduce((s, k) => s + k.pct, 0) / foodK.length)}%`, "ulja mesatare te ushqimet"],
    ].map(([v, l]) => `<div class="card stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
    const cats = {};
    D.kurse.forEach((k) => { (cats[subOf(k)] ||= []).push(k.pct); });
    const catRows = Object.entries(cats).filter(([, v]) => v.length >= 3).map(([c, v]) => ({ c, avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length })).sort((a, b) => b.avg - a.avg).slice(0, 14);
    hbar($("#cKurseCat"), catRows.map((r) => ({ label: r.c, value: r.avg, display: `−${n1(r.avg)}%`, color: "var(--s3)", tip: `<b>${esc(r.c)}</b><br>Ulja mesatare ${n1(r.avg)}% në ${r.n} produkte` })), { unit: "%", labelW: 170, rowH: 26, aria: "Ulja mesatare sipas kategorisë" });
    opt($("#kChain"), [...new Set(D.kurse.map((k) => k.chain))].sort().map((c) => [c, c]), "Të gjithë tregtarët");
    opt($("#kCat"), Object.keys(cats).sort().map((c) => [c, c]), "Të gjitha kategoritë");
    let kf = "all";
    const kTable = makeTable({
      table: $("#tKurse"), pager: $("#pKurse"), initialSort: { key: "pct", dir: -1 },
      columns: [
        { key: "name", label: "Produkti", sort: (k) => k.name, cell: (k) => `<div class="pname">${esc(k.name)}</div><div class="pmeta">${esc(k.sub)}</div>` },
        { key: "chain", label: "Tregtari", sort: (k) => k.chain, cell: (k) => `<span class="chip"><span class="dot" style="background:${CHAIN_COLOR[k.chain]}"></span>${esc(k.chain)}</span>` },
        { key: "before", label: "Para", num: true, sort: (k) => k.before, cell: (k) => `<span class="muted">${lek(k.before)}</span>` },
        { key: "after", label: "Tani", num: true, sort: (k) => k.after, cell: (k) => `<b>${lek(k.after)}</b>` },
        { key: "pct", label: "Ulja", num: true, sort: (k) => k.pct, cell: (k) => `<span class="down">−${n1(k.pct)}%</span><div class="pmeta">${lek(k.saving)}</div>` },
        { key: "check", label: "Kontrolli", sort: (k) => (k.match ? (k.consistent ? 2 : 1) : 0), cell: (k) => !k.match ? `<span class="muted small">—</span>` : k.consistent ? `<span class="flag good">✓ përputhet</span>` : `<span class="flag ${k.lag ? "warn" : "bad"}" data-tip="${esc(`Lista javore për Tiranën tregon ${lek(k.match.listing_price)} për këtë produkt te ${k.chain}.`)}">${k.lag ? "Vonesë" : "Ndryshe"}: ${lek(k.match.listing_price)}</span>` },
      ], rows: D.kurse,
    });
    const filterKurse = () => {
      const q = $("#kq").value.trim().toLowerCase(), ch = $("#kChain").value, ca = $("#kCat").value;
      kTable.set(D.kurse.filter((k) => (!q || k.name.toLowerCase().includes(q)) && (!ch || k.chain === ch) && (!ca || subOf(k) === ca) && (kf === "all" || (kf === "food" ? isFood(k) : k.match && !k.consistent))));
    };
    ["#kq", "#kChain", "#kCat"].forEach((id) => $(id).addEventListener("input", filterKurse));
    $$("[data-kf]").forEach((b) => b.addEventListener("click", () => { kf = b.dataset.kf; $$("[data-kf]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); filterKurse(); }));

    // --- region & EU ---
    const geoName = (g) => g === "EU27_2020" ? "Mesatarja BE" : (C[g]?.name || ({ TR: "Turqi" })[g] || g);
    const geos = ["AL", ...COMPARE];
    opt($("#rCat"), Object.entries(D.eurostat.categories).map(([k, v]) => [k, v]));
    $("#rCat").value = "A0101";
    $("#rLegend").innerHTML = `<span><i style="background:var(--s2)"></i>Shqipëria</span><span><i style="background:var(--neutral-bar)"></i>Vendet e tjera</span><span><i style="border-top:2px dashed var(--text-2);height:0;border-radius:0"></i>Mesatarja BE = 100</span>`;
    const drawPli = () => {
      const cat = $("#rCat").value, data = pli[cat], yr = Object.keys(data.AL).sort().pop();
      const rows = geos.map((g) => {
        const ys = data[g] ? Object.keys(data[g]).filter((k) => data[g][k] != null).sort() : [];
        const yy = ys.includes(yr) ? yr : ys.pop();
        return yy ? { g, v: data[g][yy], yy } : null;
      }).filter(Boolean).sort((a, b) => b.v - a.v);
      $("#rYear").textContent = `Viti ${yr}. Për vendet pa të dhëna për ${yr}, viti i fundit i disponueshëm tregohet në kllapa (Britania nuk mbulohet nga Eurostat pas 2020).`;
      hbar($("#cPli"), rows.map((r) => ({ label: geoName(r.g) + (r.yy !== yr ? ` (${r.yy})` : ""), value: r.v, display: n1(r.v), highlight: r.g === "AL", color: r.g === "AL" ? "var(--s2)" : "var(--neutral-bar)", tip: `<b>${geoName(r.g)}</b> (${r.yy})<br>${n1(r.v)} → ${r.v >= 100 ? "+" : ""}${n1(r.v - 100)}% ndaj mesatares së BE-së` })), { ref: 100, refLabel: "BE = 100", ticks: [0, 50, 100, 150], aria: "Indeksi i nivelit të çmimeve sipas vendit" });
    };
    $("#rCat").addEventListener("input", drawPli);
    drawPli();
    hbar2($("#cAfford"), geos.filter((g) => pli.A0101[g]?.[y] && vol.A01[g]?.[y]).map((g) => ({ label: geoName(g), a: pli.A0101[g][y], b: vol.A01[g][y], highlight: g === "AL" })).sort((p, q) => (q.a / q.b) - (p.a / p.b)), { aria: "Çmimet e ushqimeve kundrejt konsumit për frymë" });
    line($("#cTrend"), Object.keys(pli.A0101.AL).sort().map((yy) => ({ x: yy, y: pli.A0101.AL[yy] })), { ref: 100, refLabel: "BE = 100", lastLabel: "Shqipëria", aria: "Ecuria e nivelit të çmimeve të ushqimeve në Shqipëri" });

    const vatList = ["AL", ...COMPARE].map((c) => C[c]).sort((a, b) => b.vat.basic_food - a.vat.basic_food);
    $("#vatBars").innerHTML = `<h3>TVSH mbi ushqimet bazë</h3><div class="chart" id="cVat"></div><details style="margin-top:8px"><summary class="small">Shënime sipas vendit</summary><ul class="small">${vatList.map((c) => `<li><b>${esc(c.name)}</b> (standard ${c.vat.standard}%): ${esc(c.vat.notes)}</li>`).join("")}</ul></details>`;
    hbar($("#cVat"), vatList.map((c) => ({ label: c.name, value: c.vat.basic_food, display: `${String(c.vat.basic_food).replace(".", ",")}%`, highlight: c.code === "AL", color: c.code === "AL" ? "var(--s2)" : "var(--neutral-bar)", tip: `<b>${esc(c.name)}</b><br>${esc(c.vat.notes)}` })), { max: 25, ticks: [0, 10, 20], unit: "%", rowH: 26, aria: "TVSH mbi ushqimet bazë sipas vendit" });

    $("#vatCalc").innerHTML = `<label class="small" for="spend">Shpenzimi mujor për ushqime (lekë, me TVSH)</label><div class="controls" style="margin-top:4px"><input type="search" inputmode="numeric" id="spend" value="40000" aria-label="Shpenzimi mujor"></div><div id="vatOut"></div><p class="small muted">Llogaritje ilustruese: supozon që i gjithë shpenzimi është për ushqime të shportës bazë dhe që ndryshimi i TVSH-së kalon plotësisht te çmimi.</p>`;
    const calc = () => {
      const s = Math.max(0, +$("#spend").value.replace(/\D/g, "") || 0), net = s / 1.2;
      $("#vatOut").innerHTML = `<p>Nga ${lek(s)} në muaj, <b>${lek(s - net)}</b> janë TVSH (${lek((s - net) * 12)} në vit).</p>` +
        ["XK", "IT", "AT", "DE", "FR", "UK"].map((c) => { const alt = net * (1 + C[c].vat.basic_food / 100); return `<div class="vat-row"><span>Me normën e ${esc(C[c].name)}</span><span class="small muted">TVSH ${lek(alt - net)}</span><b class="down" style="text-align:right">−${lek((s - alt) * 12)}/vit</b></div>`; }).join("");
    };
    $("#spend").addEventListener("input", calc); calc();

    // --- international basket ---
    const fx = D.countries.fx;
    $("#fxNote").textContent = `1 € = ${n1(fx.rates.ALL)} lekë · ${fx.rates.GBP} £ (${fmtDate(fx.as_of)})`;
    const bCountries = ["AL", ...COMPARE.filter((c) => D.basket.some((b) => b.countries[c]))];
    let bv = "eur";
    const drawBasket = () => {
      const t = $("#tBasket");
      t.innerHTML = `<thead><tr><th scope="col">Produkti</th>${bCountries.map((c) => `<th class="num" scope="col">${esc(C[c].name)}</th>`).join("")}</tr></thead><tbody>${D.basket.map((b) => {
        const al = b.countries.AL;
        return `<tr><td><div class="pname">${esc(b.name)}</div><div class="pmeta">${esc(b.size)}${b.branded ? " · e njëjta markë" : " · ekuivalent"}</div></td>${bCountries.map((c) => {
          const x = b.countries[c];
          if (!x) return `<td class="num muted">—</td>`;
          const v = x[bv];
          const diff = al && c !== "AL" ? (v - al[bv]) / al[bv] * 100 : null;
          const tipTxt = c === "AL" ? `${esc(x.label)}<br>${lek(x.price)} · ${esc(x.source)}` : `${esc(x.retailer || "")}<br>${x.price} ${esc(x.currency)} · ${esc(x.date)}${x.promo ? " · ofertë" : ""}${x.note ? "<br>" + esc(x.note) : ""}`;
          const inner = `${eur(v)}${diff != null ? `<div class="pmeta ${diff > 0 ? "up" : "down"}">${diff > 0 ? "+" : ""}${n0(diff)}%</div>` : ""}`;
          return `<td class="num" data-tip="${esc(tipTxt)}">${x.url ? `<a href="${esc(x.url)}" rel="noopener nofollow" target="_blank" style="text-decoration:none">${inner}</a>` : inner}</td>`;
        }).join("")}</tr>`;
      }).join("")}</tbody>`;
    };
    $$("[data-bv]").forEach((b) => b.addEventListener("click", () => { bv = b.dataset.bv; $$("[data-bv]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); drawBasket(); }));
    drawBasket();
    if (bCountries.length === 1) $("#tBasket").insertAdjacentHTML("beforebegin", `<div class="note" style="margin-bottom:10px">Çmimet ndërkombëtare po mblidhen nga rutina automatike javore. Deri atëherë tregohen vetëm çmimet shqiptare të referencës.</div>`);

    // --- methodology ---
    $("#methodList").innerHTML = [
      `<b>Çmimet në Shqipëri</b> merren nga <a href="https://pasqyraecmimeve.al">pasqyraecmimeve.al</a> (platforma zyrtare), për qytetin e Tiranës, me TVSH të përfshirë. Snapshot-i aktual: ${fmtDate(D.meta.snapshot)}. Çdo snapshot ruhet në <span class="kbd">data/raw/</span> që historiku të jetë i verifikueshëm.`,
      `<b>Çmimi për njësi</b> llogaritet nga madhësia e deklaruar e produktit. Kur emri i produktit tregon një madhësi tjetër nga ajo e deklaruar, e shënojmë me ⚠, sepse çmimi për kg mund të jetë i gabuar në burim.`,
      `<b>Tregtarët</b>: “më i liri” dhe “mbi më të lirin” llogariten vetëm mbi produktet identike (e njëjta markë dhe madhësi) që shiten nga të paktën dy tregtarë. Extramarket nuk ka çmime në listën javore për Tiranën, ndaj shfaqet vetëm te KURSE.`,
      `<b>KURSE</b>: çmimet “para” dhe “tani” janë siç i deklaron tregtari. Për çdo produkt KURSE që gjendet <i>saktësisht</i> në listën javore (të gjitha fjalët e emrit përputhen, te i njëjti tregtar), krahasojmë çmimin. “Vonesë” = lista ende tregon çmimin para uljes; “Ndryshe” = një çmim i tretë. Nuk e interpretojmë si shkelje: mund të jetë vonesë përditësimi.`,
      `<b>TVSH</b>: çmimi pa TVSH = çmimi / 1,20. “Me TVSH tjetër” aplikon normën për ushqimet bazë të vendit të zgjedhur mbi çmimin pa TVSH, duke supozuar që ndryshimi kalon plotësisht te konsumatori.`,
      `<b>Rajoni dhe BE</b>: Indeksi i nivelit të çmimeve (PLI) dhe indeksi i vëllimit për frymë nga Eurostat (<span class="kbd">prc_ppp_ind</span>), BE27 = 100. Këto janë statistikat zyrtare të krahasueshme ndërkombëtarisht.`,
      `<b>Shporta ndërkombëtare</b>: çmime nga faqet e supermarketeve në çdo vend, me lidhje dhe datë për secilin. Konvertimi në euro me kursin e ditës. Ofertat e përkohshme shënohen.`,
      `<b>Përditësimi</b>: një rutinë automatike javore rifreskon çmimet, TVSH-në, Eurostat-in dhe shportën ndërkombëtare. Çdo ndryshim kalon validimin para publikimit.`,
    ].map((x) => `<li>${x}</li>`).join("");
    const srcs = new Set(["https://pasqyraecmimeve.al", D.eurostat.source_url, fx.source, ...D.countries.countries.flatMap((c) => c.sources)]);
    $("#sourceList").innerHTML = [...srcs].map((u) => `<li><a href="${esc(u)}" rel="noopener nofollow" target="_blank">${esc(u.replace(/^https?:\/\//, ""))}</a></li>`).join("");

    // --- routing ---
    const route = () => {
      const id = (location.hash || "#pasqyra").slice(1);
      const target = $("#s-" + id) ? id : "pasqyra";
      $$("main > section").forEach((s) => { s.hidden = s.id !== "s-" + target; });
      $$("nav.tabs a").forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + target ? "page" : "false"));
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", route);
    route();
  }
})();
