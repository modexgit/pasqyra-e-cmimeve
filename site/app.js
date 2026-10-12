"use strict";
(() => {
  // ---------- constants ----------
  const CHAIN = {
    "Big Market": { c: "#2a78d6", ab: "BM" }, "Conad": { c: "#e0582a", ab: "CO" }, "Extramarket": { c: "#13976a", ab: "EX" },
    "Spar": { c: "#1f8a3c", ab: "SP" }, "Xhangolli": { c: "#c44f7e", ab: "XH" },
  };
  const GROUPS = [
    { slug: "ushqime-baze", name: "Ushqime Bazë", subs: ["Sheqer", "Miell", "Oriz", "Makarona", "Vaj"] },
    { slug: "bulmet-veze", name: "Bulmet & Vezë", subs: ["Qumësht", "Kos", "Vezë", "Gjalpë"] },
    { slug: "mish", name: "Mish & Produkte Mishi", subs: ["Pulë"] },
    { slug: "fruta-perime", name: "Fruta & Perime", subs: ["Fruta", "Perime"] },
  ];
  const SUB = {
    "Sheqer": ["Sheqer & Ëmbëlsues", "🍬"], "Miell": ["Miell & Produkte Mielli", "🌾"], "Oriz": ["Oriz & Drithëra", "🍚"],
    "Makarona": ["Makarona", "🍝"], "Vaj": ["Vaj & Yndyrna Ushqimore", "🌻"], "Qumësht": ["Qumësht UHT", "🥛"],
    "Kos": ["Kos natyral", "🥣"], "Vezë": ["Vezë", "🥚"], "Gjalpë": ["Gjalpë", "🧈"], "Pulë": ["Pulë", "🍗"],
    "Fruta": ["Fruta të Freskëta", "🍎"], "Perime": ["Perime të Freskëta", "🍅"],
  };
  const SUB_EUROSTAT = { Sheqer: "A01010199", Miell: "A01010101", Oriz: "A01010101", Makarona: "A01010101", Vaj: "A01010105", Gjalpë: "A01010105", Qumësht: "A01010104", Kos: "A01010104", Vezë: "A01010104", Pulë: "A01010102", Fruta: "A01010106", Perime: "A01010106" };
  const COMPARE = ["XK", "ME", "MK", "RS", "BA", "EL", "IT", "DE", "AT", "FR", "UK"];
  const PAGE = 24;
  const KURSE_EMOJI = [[/Kripë/, "🧂"], [/Vezë/, "🥚"], [/Sapun|Shampo|Deodorant|Bojë|Pastë|Furçë/, "🧴"], [/Detergjent|Zbutës|Zbardhues|Letër/, "🧺"], [/Oriz|Bullgur/, "🍚"], [/Qumësht/, "🥛"], [/Kos/, "🥣"], [/Djathë/, "🧀"], [/Gjalpë/, "🧈"], [/Makarona/, "🍝"], [/Miell|Niseshte/, "🌾"], [/Thjerëza|Fasule/, "🫘"], [/Salcë|Speca/, "🥫"], [/Kafe/, "☕"], [/Pelena/, "👶"], [/Banane/, "🍌"], [/Sheqer/, "🍬"], [/Vaj/, "🌻"], [/Ujë|Lëngje/, "🧃"], [/Salçiçe|Proshutë|Sallam/, "🥓"], [/Biskota/, "🍪"]];

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Albanian number format (space thousands, comma decimals) without relying on browser locale data
  const fmt = (v, d) => { const [i, f] = Math.abs(v).toFixed(d).split("."); return (v < 0 ? "−" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (f ? "," + f : ""); };
  const n0 = (v) => fmt(v, 0), n1 = (v) => fmt(v, 1);
  const pct = (v) => `${fmt(v, v % 1 ? 1 : 0)}%`;
  const lek = (v) => `${n0(v)} lekë`;
  const eur = (v) => "€" + fmt(v, 2);
  const MONTHS = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
  const fmtDate = (d) => { const [y, m, dd] = d.split("-").map(Number); return `${dd} ${MONTHS[m - 1]} ${y}`; };
  const logo = (ch, size = 28) => `<span class="logo" style="background:${CHAIN[ch]?.c || "#888"};width:${size}px;height:${size}px">${CHAIN[ch]?.ab || "?"}</span>`;
  const kEmoji = (sub) => (KURSE_EMOJI.find(([rx]) => rx.test(sub)) || [0, "🛒"])[1];

  const tip = $("#tip");
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const t = e.target.closest?.("[data-tip]");
    if (!t) { tip.classList.remove("on"); return; }
    tip.innerHTML = t.getAttribute("data-tip"); tip.classList.add("on");
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  });

  // mobile: filters fold behind a toggle button
  $$("[data-filters-toggle]").forEach((b) => b.addEventListener("click", () => {
    const aside = b.closest(".layout").querySelector("aside.filters");
    const open = aside.classList.toggle("open");
    b.setAttribute("aria-expanded", String(open));
  }));

  // ---------- charts ----------
  // charts are drawn at the container's real width so text stays legible on phones
  const chartW = (el) => Math.round(Math.min(640, Math.max(300, el.clientWidth || 640)));
  function hbar(el, rows, o = {}) {
    const W = chartW(el), rowH = o.rowH || 30, labelW = Math.min(o.labelW || 160, Math.round(W * 0.36)), top = 8;
    const max = o.max ?? Math.max(...rows.map((r) => r.value), o.ref ?? 0) * 1.08;
    const plotW = W - labelW - (W < 480 ? 64 : 80), H = top + rows.length * rowH + 22;
    const x = (v) => labelW + (Math.max(0, v) / max) * plotW;
    const ticks = o.ticks || [0, Math.round(max / 2), Math.round(max)];
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "")}">`;
    for (const t of ticks) s += `<line class="gridline" x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${H - 20}"/><text x="${x(t)}" y="${H - 6}" text-anchor="middle">${t}${o.unit || ""}</text>`;
    rows.forEach((r, i) => {
      const y = top + i * rowH, bh = Math.min(18, rowH - 10), by = y + (rowH - bh) / 2, w = Math.max(4, x(r.value) - labelW);
      s += `<g data-tip="${esc(r.tip || `${r.label}: ${r.value}`)}"><rect class="hit" x="0" y="${y}" width="${W}" height="${rowH}"/>`;
      s += `<text class="${r.highlight ? "lbl" : ""}" x="${labelW - 10}" y="${y + rowH / 2 + 4}" text-anchor="end">${esc(r.label)}</text>`;
      s += `<path d="M${labelW},${by} h${w - 4} a4,4 0 0 1 4,4 v${bh - 8} a4,4 0 0 1 -4,4 h-${w - 4} z" fill="${r.color || "var(--neutral-bar)"}"/>`;
      s += `<text class="val" x="${labelW + w + 6}" y="${y + rowH / 2 + 4}">${esc(r.display ?? r.value)}</text></g>`;
    });
    if (o.ref != null) s += `<line class="ref" x1="${x(o.ref)}" x2="${x(o.ref)}" y1="${top - 4}" y2="${H - 20}"/>`;
    el.innerHTML = s + "</svg>";
  }
  function line(el, pts, o = {}) {
    const W = chartW(el), H = W < 480 ? 200 : 230, l = 40, r = 70, t = 14, b = 28;
    const ys = pts.map((p) => p.y).concat([o.ref ?? pts[0].y]);
    const lo = Math.floor((Math.min(...ys) - 5) / 10) * 10, hi = Math.ceil((Math.max(...ys) + 5) / 10) * 10;
    const X = (i) => l + (i / (pts.length - 1)) * (W - l - r), Y = (v) => t + (1 - (v - lo) / (hi - lo)) * (H - t - b);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "")}">`;
    for (let v = lo; v <= hi; v += 10) s += `<line class="gridline" x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
    if (o.ref != null) s += `<line class="ref" x1="${l}" x2="${W - r}" y1="${Y(o.ref)}" y2="${Y(o.ref)}"/><text x="${W - r + 6}" y="${Y(o.ref) + 4}">BE = 100</text>`;
    s += `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${X(i)},${Y(p.y)}`).join(" ")}" fill="none" stroke="var(--green-2)" stroke-width="2.5" stroke-linejoin="round"/>`;
    pts.forEach((p, i) => {
      s += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${p.x}</text><g data-tip="${esc(`${p.x}: <b>${n1(p.y)}</b>`)}"><circle cx="${X(i)}" cy="${Y(p.y)}" r="14" fill="transparent"/><circle cx="${X(i)}" cy="${Y(p.y)}" r="4.5" fill="var(--green-2)" stroke="#fff" stroke-width="2"/></g>`;
    });
    el.innerHTML = s + "</svg>";
  }

  function pager(el, total, page, onGo) {
    const pages = Math.ceil(total / PAGE);
    if (pages <= 1) { el.innerHTML = ""; return; }
    const nums = [...new Set([0, page - 1, page, page + 1, pages - 1].filter((p) => p >= 0 && p < pages))].sort((a, b) => a - b);
    let h = `<button type="button" data-go="${page - 1}" ${page ? "" : "disabled"} aria-label="Faqja e mëparshme">←</button>`;
    nums.forEach((p, i) => { if (i && p - nums[i - 1] > 1) h += `<button type="button" disabled>…</button>`; h += `<button type="button" data-go="${p}" aria-current="${p === page}">${p + 1}</button>`; });
    h += `<button type="button" data-go="${page + 1}" ${page < pages - 1 ? "" : "disabled"} aria-label="Faqja tjetër">→</button>`;
    el.innerHTML = h;
    $$("button[data-go]", el).forEach((b) => b.addEventListener("click", () => { onGo(+b.dataset.go); scrollTo({ top: 0, behavior: "smooth" }); }));
  }

  fetch("data/app.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init).catch((e) => {
    $("main").innerHTML = `<p class="empty">Të dhënat nuk u ngarkuan (${esc(e.message)}). Provoni përsëri më vonë.</p>`;
  });

  function init(D) {
    const C = Object.fromEntries(D.countries.countries.map((c) => [c.code, c]));
    const pli = D.eurostat.pli;
    const P = D.products;
    const byId = Object.fromEntries(P.map((p) => [p.id, p]));
    const basketById = {};
    D.basket.forEach((b) => (b.al_ids || []).forEach((id) => { basketById[id] = b; }));
    const latest = (cat, g) => { const d = pli[cat]?.[g]; if (!d) return null; const y = Object.keys(d).filter((k) => d[k] != null).sort().pop(); return y ? { y, v: d[y] } : null; };
    const geoName = (g) => g === "EU27_2020" ? "Mesatarja e BE-së" : (C[g]?.name || g);
    const SHORT = { UK: "Britania", MK: "Maqedonia V.", BA: "Bosnja e H." };
    const chartName = (g) => SHORT[g] || geoName(g);
    const abroadOf = (b) => (b ? COMPARE.filter((c) => b.countries[c]) : []);

    $("#stripText").innerHTML = `Përditësuar më <b>${fmtDate(D.meta.snapshot)}</b><span class="hide-sm"> · burimi: pasqyraecmimeve.al</span>`;

    // ---------- home ----------
    $("#heroStats").innerHTML = [["🛒", D.meta.products, "artikuj bazë"], ["🏪", 5, "tregtarë të përfshirë"], ["🏷️", D.kurse.length, "produkte në Kurse"], ["🌍", COMPARE.length, "vende për krahasim"]]
      .map(([ic, v, l]) => `<div class="hero-stat"><span class="ic">${ic}</span><span><b>${n0(v)}</b><small>${l}</small></span></div>`).join("");
    $("#homeGroups").innerHTML = GROUPS.map((g) => {
      const ps = P.filter((p) => p.group === g.name);
      const chains = new Set(ps.flatMap((p) => p.offers.map((o) => o.chain)));
      const subs = g.subs.filter((s) => ps.some((p) => p.sub === s));
      const cards = subs.map((s) => {
        const sp = ps.filter((p) => p.sub === s);
        const best = sp.reduce((a, p) => (p.offers[0].unit_price < a.offers[0].unit_price ? p : a));
        return `<a class="cat-card" href="#/grupi/${g.slug}/${encodeURIComponent(s)}"><div class="em" aria-hidden="true">${SUB[s][1]}</div><h3>${SUB[s][0]}</h3><div class="n">${sp.length} artikuj</div><div class="from"><span>Fillon nga</span><b>${n0(best.offers[0].unit_price)} lekë/${best.basis}</b></div></a>`;
      }).join("");
      return `<div class="panel"><div class="panel-head"><div><h2>${g.name}</h2><div class="meta"><b>${subs.length}</b> nënkategori · <b>${ps.length}</b> artikuj · <b>${chains.size}</b> tregtarë</div></div><a class="btn" href="#/grupi/${g.slug}">Shiko çmimet →</a></div><div class="panel-body"><div class="cat-grid">${cards}</div></div></div>`;
    }).join("");
    const alYear = latest("A0101", "AL").y;
    $("#homeCompare").innerHTML = `<thead><tr><th>Vendi</th><th class="num">Çmimet e ushqimeve<br><span class="th-sub">BE = 100</span></th><th class="num">TVSH ushqime</th><th class="num hide-sm">TVSH standarde</th></tr></thead><tbody>${["AL", ...COMPARE].map((g) => {
      const v = latest("A0101", g);
      return `<tr${g === "AL" ? ' class="hl"' : ""}><td>${esc(C[g].name)}</td><td class="num">${v ? `${n1(v.v)}${v.y !== alYear ? ` <span class="muted small">(${v.y})</span>` : ""}` : "—"}</td><td class="num">${pct(C[g].vat.basic_food)}</td><td class="num hide-sm">${C[g].vat.standard}%</td></tr>`;
    }).join("")}</tbody>`;
    $("#homeChains").innerHTML = D.chains.map((c) => `<a class="card chain-card" href="#/tregtaret">${logo(c.chain, 44)}<b>${esc(c.chain)}</b><span class="small muted">${c.stores_tirana ? `${c.stores_tirana} dyqane në Tiranë · ${c.listed} artikuj` : `${c.kurse_count} produkte në Kurse`}</span></a>`).join("");

    // ---------- product card & modal ----------
    const productCard = (p) => {
      const multi = p.offers.length > 1;
      const abroad = abroadOf(basketById[p.id]);
      return `<article class="pcard" tabindex="0" role="button" data-pid="${p.id}" aria-label="${esc(p.name)}">
        <div class="top"><span class="size">${esc(p.size)}</span><span class="em-sm" aria-hidden="true">${SUB[p.sub]?.[1] || "🛒"}</span></div>
        <div class="body"><h3>${esc(p.name)}</h3><div class="brandline">${esc(p.brand || "Pa markë")} · ${esc(SUB[p.sub]?.[0] || p.sub)}</div><span class="unit">Për njësi: <b>${n0(p.offers[0].unit_price)} lekë/${esc(p.basis)}</b></span></div>
        <div class="offers">${p.offers.map((o, i) => `<div class="offer ${multi && o.price === p.min ? "best" : ""}">${logo(o.chain)}<div class="who"><b>${esc(o.chain)}</b><small>${o.stores} dyqane në Tiranë${i && o.price > p.min ? ` · <span class="plus">+${n1((o.price - p.min) / p.min * 100)}%</span>` : ""}</small></div><div class="pr"><b>${lek(o.price)}</b><small>${n0(o.unit_price)}/${esc(p.basis)}</small></div></div>`).join("")}</div>
        <div class="foot"><span>Shiko detajet →</span><span class="eu">${abroad.length ? `🌍 Krahaso në ${abroad.length} vende` : `TVSH: ${lek(p.min - p.min / 1.2)}`}</span></div>
      </article>`;
    };
    const modal = $("#pModal");
    const openProduct = (p) => {
      const net = p.min / 1.2, vat = p.min - net;
      const ecat = SUB_EUROSTAT[p.sub];
      const b = basketById[p.id];
      const vatRows = ["XK", "IT", "AT", "DE", "FR", "UK"].map((c) => `<tr><td>${esc(C[c].name)}</td><td class="num">${pct(C[c].vat.basic_food)}</td><td class="num"><b>${lek(net * (1 + C[c].vat.basic_food / 100))}</b></td></tr>`).join("");
      const idx = ecat ? ["AL", "XK", "RS", "EL", "IT", "DE", "AT", "FR"].map((g) => ({ g, l: latest(ecat, g) })).filter((r) => r.l) : [];
      modal.innerHTML = `<div class="m-head"><span class="em" aria-hidden="true">${SUB[p.sub]?.[1] || "🛒"}</span><div class="m-title"><h2 id="mTitle">${esc(p.name)}</h2><div class="small muted">${esc(p.brand || "Pa markë")} · ${esc(p.size)} · ${esc(SUB[p.sub]?.[0] || p.sub)}</div></div><button class="close" type="button" aria-label="Mbyll">×</button></div>
      <div class="m-body">
        <div><h4>Çmimet sipas tregtarit (Tiranë)</h4><div class="offers boxed">${p.offers.map((o) => `<div class="offer ${p.offers.length > 1 && o.price === p.min ? "best" : ""}">${logo(o.chain)}<div class="who"><b>${esc(o.chain)}</b><small>${o.stores} dyqane në Tiranë</small></div><div class="pr"><b>${lek(o.price)}</b><small>${n0(o.unit_price)} lekë/${esc(p.basis)}</small></div></div>`).join("")}</div></div>
        <div class="grid g2">
          <div><h4>Përbërja e çmimit më të ulët</h4><div class="vat-split"><i style="width:${(net / p.min) * 100}%"></i><i style="width:${(vat / p.min) * 100}%"></i></div><div class="small chips"><span class="chip"><span class="dot" style="background:var(--green-2)"></span>Pa TVSH ${lek(net)}</span><span class="chip"><span class="dot" style="background:#f0b45a"></span>TVSH 20% ${lek(vat)}</span></div></div>
          <div><h4>Me normën e TVSH-së së vendeve të tjera</h4><table class="small"><tbody>${vatRows}</tbody></table></div>
        </div>
        ${b && abroadOf(b).length ? `<div><h4>I njëjti produkt në vende të tjera</h4><div class="table-wrap"><table class="small"><tbody>${Object.entries(b.countries).map(([c, x]) => `<tr><td>${esc(C[c].name)}</td><td class="hide-sm">${esc(c === "AL" ? "pasqyraecmimeve.al" : x.retailer || "")}</td><td class="num">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener nofollow">${eur(x.eur)}</a>` : eur(x.eur)}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
        ${idx.length ? `<div><h4>Niveli i çmimeve: ${esc(D.eurostat.categories[ecat])} (BE = 100)</h4><div class="chart" id="mChart"></div></div>` : ""}
      </div>`;
      $(".close", modal).addEventListener("click", () => modal.close());
      modal.showModal();
      modal.scrollTop = 0;
      if (idx.length) hbar($("#mChart"), idx.sort((a, b) => b.l.v - a.l.v).map((r) => ({ label: chartName(r.g), value: r.l.v, display: n1(r.l.v), highlight: r.g === "AL", color: r.g === "AL" ? "var(--green-2)" : "var(--neutral-bar)", tip: `${geoName(r.g)} (${r.l.y}): ${n1(r.l.v)}` })), { ref: 100, ticks: [0, 50, 100, 150], rowH: 26, aria: "Niveli i çmimeve sipas vendit" });
    };
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
    document.addEventListener("click", (e) => { const c = e.target.closest(".pcard[data-pid]"); if (c) openProduct(byId[c.dataset.pid]); });
    document.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { const c = e.target.closest?.(".pcard[data-pid]"); if (c) { e.preventDefault(); openProduct(byId[c.dataset.pid]); } } });

    // ---------- listing (group / search) ----------
    const L = { group: null, q: "", sort: "unit", chains: new Set(), subs: new Set(), page: 0 };
    const subOrder = Object.keys(SUB);
    const renderList = () => {
      const base = L.group ? P.filter((p) => p.group === L.group.name) : P;
      const q = L.q.toLowerCase();
      const rows = base.filter((p) => (!q || `${p.name} ${p.brand} ${SUB[p.sub]?.[0]}`.toLowerCase().includes(q)) && (!L.subs.size || L.subs.has(p.sub)) && (!L.chains.size || p.offers.some((o) => L.chains.has(o.chain))))
        .sort((a, b) => {
          if (L.sort === "chains") return b.offers.length - a.offers.length || a.offers[0].unit_price - b.offers[0].unit_price;
          // unit prices are only comparable within a category, so keep categories together
          return subOrder.indexOf(a.sub) - subOrder.indexOf(b.sub) || (L.sort === "unit-desc" ? -1 : 1) * (a.offers[0].unit_price - b.offers[0].unit_price);
        });
      const pages = Math.max(1, Math.ceil(rows.length / PAGE));
      L.page = Math.min(L.page, pages - 1);
      const slice = rows.slice(L.page * PAGE, L.page * PAGE + PAGE);
      $("#pgrid").innerHTML = slice.length ? slice.map(productCard).join("") : `<div class="empty" style="grid-column:1/-1">Asnjë produkt nuk përputhet me filtrat.</div>`;
      $("#listCount").textContent = rows.length ? `${L.page * PAGE + 1}–${L.page * PAGE + slice.length} nga ${rows.length}` : "";
      const active = L.chains.size + L.subs.size;
      $("#fToggleCount").textContent = active ? ` (${active})` : "";
      pager($("#pager"), rows.length, L.page, (p) => { L.page = p; renderList(); });
    };
    const checkList = (el, items, set, counts, rerender) => {
      el.innerHTML = items.map(([v, l]) => `<label><input type="checkbox" value="${esc(v)}" ${set.has(v) ? "checked" : ""} ${counts[v] ? "" : "disabled"}> ${esc(l)}<span class="cnt">${counts[v] || 0}</span></label>`).join("");
      $$("input", el).forEach((i) => i.addEventListener("change", () => { i.checked ? set.add(i.value) : set.delete(i.value); rerender(); }));
    };
    const showList = (group, sub, q) => {
      L.group = group; L.q = q || ""; L.page = 0; L.subs = new Set(sub ? [sub] : []); L.chains = new Set();
      $("#fq").value = L.q;
      const base = group ? P.filter((p) => p.group === group.name) : P;
      $("#crumbGroup").textContent = group ? group.name : "Kërkimi";
      $("#listTitle").textContent = group ? group.name : `Rezultatet për “${q}”`;
      const sc = {}; base.forEach((p) => { sc[p.sub] = (sc[p.sub] || 0) + 1; });
      $("#listMeta").textContent = `${Object.keys(sc).length} nënkategori · prekni një artikull për detajet`;
      const cc = {}; base.forEach((p) => p.offers.forEach((o) => { cc[o.chain] = (cc[o.chain] || 0) + 1; }));
      const rr = () => { L.page = 0; renderList(); };
      checkList($("#fChains"), Object.keys(CHAIN).map((c) => [c, c]), L.chains, cc, rr);
      checkList($("#fSubs"), subOrder.filter((s) => sc[s]).map((s) => [s, SUB[s][0]]), L.subs, sc, rr);
      renderList();
    };
    $("#fq").addEventListener("input", (e) => { L.q = e.target.value; L.page = 0; renderList(); });
    $$("input[name=sort]").forEach((r) => r.addEventListener("change", () => { L.sort = r.value; renderList(); }));
    $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); const q = $("#searchInput").value.trim(); if (q) location.hash = `#/kerko/${encodeURIComponent(q)}`; $("#searchInput").blur(); });

    // ---------- Kurse ----------
    const K = { q: "", sort: "pct", chains: new Set(), cats: new Set(), page: 0 };
    const kCat = (k) => k.sub.split(" · ")[0];
    const kAvg = D.kurse.reduce((s, k) => s + k.pct, 0) / D.kurse.length;
    const maxSave = D.kurse.reduce((m, k) => Math.max(m, k.saving), 0);
    const kChainsList = [...new Set(D.kurse.map((k) => k.chain))].sort();
    $("#kStats").innerHTML = [[n0(D.kurse.length), "produkte"], [kChainsList.length, "tregtarë"], [`−${n1(kAvg)}%`, "ulja mesatare"], [lek(maxSave), "kursimi më i madh"]]
      .map(([v, l]) => `<div class="stat-soft"><b>${v}</b><span>${l}</span></div>`).join("");
    const renderKurse = () => {
      const q = K.q.toLowerCase();
      const rows = D.kurse.filter((k) => (!q || k.name.toLowerCase().includes(q)) && (!K.chains.size || K.chains.has(k.chain)) && (!K.cats.size || K.cats.has(kCat(k))))
        .sort(K.sort === "name" ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b[K.sort] - a[K.sort]);
      const pages = Math.max(1, Math.ceil(rows.length / PAGE));
      K.page = Math.min(K.page, pages - 1);
      const slice = rows.slice(K.page * PAGE, K.page * PAGE + PAGE);
      $("#kgrid").innerHTML = slice.length ? slice.map((k) => `<article class="pcard static">
        <div class="top"><span class="size">${esc(k.sub.split(" · ")[1] || kCat(k))}</span><span class="badge">−${n0(k.pct)}%</span></div>
        <div class="body"><h3><span aria-hidden="true">${kEmoji(k.sub)}</span> ${esc(k.name)}</h3><div class="brandline">${esc(kCat(k))}</div></div>
        <div class="offers"><div class="offer best">${logo(k.chain)}<div class="who"><b>${esc(k.chain)}</b><small>kursen ${lek(k.saving)}</small></div><div class="pr"><b>${lek(k.after)}</b><small><s>${lek(k.before)}</s></small></div></div></div>
      </article>`).join("") : `<div class="empty" style="grid-column:1/-1">Asnjë produkt nuk përputhet me filtrat.</div>`;
      $("#kCount").textContent = rows.length ? `${K.page * PAGE + 1}–${K.page * PAGE + slice.length} nga ${rows.length}` : "";
      const active = K.chains.size + K.cats.size;
      $("#kToggleCount").textContent = active ? ` (${active})` : "";
      pager($("#kpager"), rows.length, K.page, (p) => { K.page = p; renderKurse(); });
    };
    const kcc = {}, kcat = {};
    D.kurse.forEach((k) => { kcc[k.chain] = (kcc[k.chain] || 0) + 1; kcat[kCat(k)] = (kcat[kCat(k)] || 0) + 1; });
    const kr = () => { K.page = 0; renderKurse(); };
    checkList($("#kChains"), kChainsList.map((c) => [c, c]), K.chains, kcc, kr);
    checkList($("#kCats"), Object.keys(kcat).sort().map((c) => [c, c]), K.cats, kcat, kr);
    $("#kq").addEventListener("input", (e) => { K.q = e.target.value; kr(); });
    $$("input[name=ksort]").forEach((r) => r.addEventListener("change", () => { K.sort = r.value; renderKurse(); }));
    renderKurse();

    // ---------- Rajoni & BE ----------
    let redrawCharts = () => {};
    const sel = $("#rCat");
    sel.innerHTML = Object.entries(D.eurostat.categories).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
    sel.value = "A0101";
    const drawPli = () => {
      const cat = sel.value, yr = latest(cat, "AL").y;
      const rows = ["AL", ...COMPARE].map((g) => ({ g, l: latest(cat, g) })).filter((r) => r.l).sort((a, b) => b.l.v - a.l.v);
      $("#rYear").textContent = `Viti ${yr}. Kur një vend nuk ka të dhëna për këtë vit, viti i fundit tregohet në kllapa.`;
      hbar($("#cPli"), rows.map((r) => ({ label: chartName(r.g) + (r.l.y !== yr ? ` (${r.l.y})` : ""), value: r.l.v, display: n1(r.l.v), highlight: r.g === "AL", color: r.g === "AL" ? "var(--green-2)" : "var(--neutral-bar)", tip: `<b>${geoName(r.g)}</b> (${r.l.y})<br>${n1(r.l.v)} (BE = 100)` })), { ref: 100, ticks: [0, 50, 100, 150], labelW: 190, aria: "Niveli i çmimeve sipas vendit" });
    };
    sel.addEventListener("input", drawPli);
    const vatList = ["AL", ...COMPARE].map((c) => C[c]).sort((a, b) => b.vat.basic_food - a.vat.basic_food);
    const drawRegion = () => {
      drawPli();
      hbar($("#cVat"), vatList.map((c) => ({ label: chartName(c.code), value: c.vat.basic_food, display: pct(c.vat.basic_food), highlight: c.code === "AL", color: c.code === "AL" ? "var(--green-2)" : "var(--neutral-bar)", tip: `<b>${esc(c.name)}</b><br>${esc(c.vat.notes)}` })), { max: 25, ticks: [0, 10, 20], unit: "%", rowH: 26, labelW: 190, aria: "TVSH për ushqimet bazë" });
      line($("#cTrend"), Object.keys(pli.A0101.AL).sort().map((y) => ({ x: y, y: pli.A0101.AL[y] })), { ref: 100, aria: "Ecuria e nivelit të çmimeve të ushqimeve në Shqipëri" });
    };

    const fx = D.countries.fx;
    $("#fxNote").textContent = `Kursi: 1 € = ${n1(fx.rates.ALL)} lekë (${fmtDate(fx.as_of)}). Çmimet ndërkombëtare përditësohen çdo javë; “—” do të thotë që çmimi nuk është mbledhur ende.`;
    const bCountries = ["AL", ...COMPARE.filter((c) => D.basket.some((b) => b.countries[c]))];
    let bv = "eur";
    const drawBasket = () => {
      $("#tBasket").innerHTML = `<thead><tr><th class="sticky-col">Produkti</th>${bCountries.map((c) => `<th class="num">${esc(C[c].name)}</th>`).join("")}</tr></thead><tbody>${D.basket.map((b) => `<tr><td class="sticky-col"><b>${esc(b.name)}</b><div class="small muted">${esc(b.size)}</div></td>${bCountries.map((c) => {
        const x = b.countries[c];
        if (!x) return `<td class="num muted">—</td>`;
        const t = c === "AL" ? `${esc(x.label)}<br>${lek(x.price)}` : `${esc(x.retailer || "")}<br>${x.price} ${esc(x.currency)} · ${esc(x.date)}`;
        return `<td class="num" data-tip="${esc(t)}">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener nofollow">${eur(x[bv])}</a>` : eur(x[bv])}</td>`;
      }).join("")}</tr>`).join("")}</tbody>`;
    };
    $$("[data-bv]").forEach((b) => b.addEventListener("click", () => { bv = b.dataset.bv; $$("[data-bv]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); drawBasket(); }));
    drawBasket();

    // ---------- Tregtarët ----------
    $("#chainCards").innerHTML = D.chains.map((c) => `<div class="card chain-card flat">${logo(c.chain, 44)}<b style="font-size:17px">${esc(c.chain)}</b><dl>
      <dt>Dyqane në Tiranë</dt><dd>${c.stores_tirana || "—"}</dd>
      <dt>Artikuj në listë</dt><dd>${c.listed || "—"}</dd>
      <dt>Me çmimin më të ulët</dt><dd>${c.shared ? `${Math.round(c.cheapest_share * c.shared / 100)} nga ${c.shared}` : "—"}</dd>
      <dt>Produkte në Kurse</dt><dd>${c.kurse_count || "—"}</dd>
      <dt>Ulja mesatare në Kurse</dt><dd>${c.kurse_avg_cut != null ? `−${n1(c.kurse_avg_cut)}%` : "—"}</dd></dl></div>`).join("");
    const drawChains = () => {
    const shared = D.chains.filter((c) => c.shared).map((c) => ({ ...c, n: Math.round(c.cheapest_share * c.shared / 100) })).sort((a, b) => b.n - a.n);
    hbar($("#cCheapest"), shared.map((c) => ({ label: c.chain, value: c.n, display: `${c.n} nga ${c.shared}`, color: CHAIN[c.chain].c, tip: `<b>${c.chain}</b><br>Çmimi më i ulët në ${c.n} nga ${c.shared} produkte të përbashkëta` })), { aria: "Produkte me çmimin më të ulët", labelW: 120 });
    const kc = D.chains.filter((c) => c.kurse_count).sort((a, b) => b.kurse_count - a.kurse_count);
    hbar($("#cKurse"), kc.map((c) => ({ label: c.chain, value: c.kurse_count, display: `${c.kurse_count} · −${n1(c.kurse_avg_cut)}%`, color: CHAIN[c.chain].c, tip: `<b>${c.chain}</b><br>${c.kurse_count} produkte, ulja mesatare ${n1(c.kurse_avg_cut)}%` })), { aria: "Produkte në Kurse sipas tregtarit", labelW: 120 });
    };
    redrawCharts = () => { if (!$("#v-krahasim").hidden) drawRegion(); if (!$("#v-tregtaret").hidden) drawChains(); };

    // ---------- Rreth ----------
    $("#methodList").innerHTML = [
      `<b>Çmimet në Shqipëri</b> merren nga platforma zyrtare <a href="https://pasqyraecmimeve.al" rel="noopener">pasqyraecmimeve.al</a> për qytetin e Tiranës. Janë çmime finale për konsumatorin, me TVSH. Përditësimi i fundit: ${fmtDate(D.meta.snapshot)}.`,
      `<b>Çmimi për njësi</b> (lekë/kg, lekë/l ose lekë për 10 copë) llogaritet nga madhësia e deklaruar e produktit, si në platformën zyrtare.`,
      `<b>Kurse</b>: çmimet “para” dhe “tani” janë siç i deklarojnë tregtarët në kuadër të nismës.`,
      `<b>TVSH</b>: çmimi pa TVSH = çmimi / 1,20. Krahasimi me vendet e tjera zbaton normën e tyre për ushqimet bazë mbi të njëjtin çmim pa TVSH.`,
      `<b>Rajoni dhe BE</b>: indeksi i nivelit të çmimeve nga Eurostat (prc_ppp_ind), ku mesatarja e BE-së = 100.`,
      `<b>Shporta ndërkombëtare</b>: çmime nga faqet e supermarketeve në çdo vend, me lidhje dhe datë për secilin, të konvertuara në euro.`,
      `Ky është një projekt informues i pavarur. Për çdo pasaktësi, na shkruani te <a href="https://github.com/modexgit/pasqyra-e-cmimeve/issues" rel="noopener">GitHub</a>.`,
    ].map((x) => `<li>${x}</li>`).join("");
    const srcs = new Set(["https://pasqyraecmimeve.al", D.eurostat.source_url, fx.source, ...D.countries.countries.flatMap((c) => c.sources)]);
    $("#sourceList").innerHTML = [...srcs].map((u) => `<li><a href="${esc(u)}" rel="noopener nofollow" target="_blank">${esc(u.replace(/^https?:\/\//, ""))}</a></li>`).join("");

    // ---------- routing ----------
    const NAV = { grupi: "grupi", kerko: "grupi", kurse: "kurse", krahasim: "krahasim", tregtaret: "tregtaret", rreth: "rreth" };
    const route = () => {
      const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
      const view = NAV[parts[0]] || "home";
      if (parts[0] === "grupi") showList(GROUPS.find((g) => g.slug === parts[1]) || GROUPS[0], parts[2], "");
      if (parts[0] === "kerko") showList(null, null, parts[1] || "");
      $$("main > section").forEach((s) => { s.hidden = s.id !== "v-" + view; });
      $$("aside.filters").forEach((a) => a.classList.remove("open"));
      $$("[data-filters-toggle]").forEach((b) => b.setAttribute("aria-expanded", "false"));
      let current = null;
      $$("nav.main a").forEach((a) => {
        const h = a.getAttribute("href").slice(2);
        const on = parts[0] === "grupi" ? h === `grupi/${parts[1]}` : h === parts[0];
        a.setAttribute("aria-current", on ? "page" : "false");
        if (on) current = a;
      });
      current?.scrollIntoView({ block: "nearest", inline: "center" });
      if (modal.open) modal.close();
      scrollTo(0, 0);
      redrawCharts();
    };
    addEventListener("hashchange", route);
    route();
    let rz;
    addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(redrawCharts, 200); });
  }
})();
