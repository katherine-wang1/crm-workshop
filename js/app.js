/*
 * AI@GSB Workshop 2 — student site mechanics.
 *
 * Structure carried over from the Workshop 1 site (ADA110/outreach-workshop-site):
 * name + email sign-in, ?room=, one step at a time with a side rail, steps unlock
 * in order, progress saved in the browser and synced to /api/progress keyed by
 * email, "Now you know…" after each step, copy cards, a Stuck? drawer.
 *
 * Content lives in index.html. This file only wires it up.
 * The Base URL is held in memory only (never saved, never sent to the server).
 */
(function () {
  "use strict";

  /* ---------- config ---------- */

  const STEPS = ["setup", "what", "db", "skills", "company", "person", "capture", "build", "next"];
  const SUBS = ["setup-1", "setup-2", "setup-3", "setup-4", "setup-5", "setup-6"];
  const REQUIRED_SUBS = SUBS.slice(0, 5); // 0.6 is optional
  const CHECKPOINTS = { capture: 1, build: 1 };
  const KEY = "aigsb-workshop2-v1";

  const params = new URLSearchParams(location.search);
  const ROOM = (params.get("room") || "default").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "default";
  const API = "/api/progress?room=" + encodeURIComponent(ROOM);
  const LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname);
  const DRAFT = params.get("draft") === "1" || (LOCAL && params.get("draft") !== "0");
  if (DRAFT) document.body.classList.add("draft");

  const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- state + sync ---------- */

  const state = { name: "", email: "", steps: {}, feedback: null, notes: {}, cmp: {}, labels: {} };
  let syncOff = false;
  let saveTimer = null;
  let viewing = null;
  let busy = false;
  const SESSION = Math.random().toString(36).slice(2, 12); // one per page load, for the dashboard's step timing

  /* The student's base: memory only. Never written to storage or sent anywhere. */
  let BASE = null;

  function load() {
    try {
      const p = JSON.parse(localStorage.getItem(KEY) || "null");
      if (p && typeof p === "object") {
        if (typeof p.name === "string") state.name = p.name;
        if (typeof p.email === "string") state.email = p.email;
        ["steps", "notes", "cmp", "labels"].forEach((k) => { if (p[k] && typeof p[k] === "object") state[k] = p[k]; });
        if (p.feedback && typeof p.feedback === "object") state.feedback = p.feedback;
      }
    } catch (e) { /* private window or blocked storage */ }
  }
  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function pushRemote() {
    if (syncOff || !state.name || !state.email) return Promise.resolve();
    const steps = {};
    STEPS.concat(SUBS).forEach((s) => { if (state.steps[s]) steps[s] = true; });
    return fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: state.name, email: state.email, steps, viewing: viewing || "", session: SESSION }),
    }).then((r) => r.json().catch(() => ({})).then((j) => {
      if (!r.ok && j && j.error === "storage_unconfigured") syncOff = true;
    })).catch(() => {});
  }
  function save() {
    saveLocal();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushRemote, 400);
  }

  /* ---------- helpers ---------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $all = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      ta.remove();
    });
  }
  function download(filename, blobOrText, type) {
    const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type: type || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function srcText(id) {
    const el = document.getElementById("src-" + id);
    return el ? el.textContent.replace(/^\n/, "").replace(/\s+$/, "") : "";
  }

  /* ---------- confetti ---------- */

  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  let parts = [];
  let raf = 0;
  const PALETTE = { A: ["#FF7A45", "#FFD23F", "#FFB08F"], B: ["#7C5CFF", "#FFD23F", "#B9A6FF"], C: ["#14B8A6", "#FFD23F", "#7FE0D4"], pre: ["#3B82F6", "#FFD23F", "#93C0FF"], core: ["#1F1B2D", "#FFD23F", "#FF7A45", "#7C5CFF", "#14B8A6"], finish: ["#22A06B", "#FFD23F", "#FF7A45", "#7C5CFF", "#14B8A6"] };
  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function burst(x, y, n, colors, power) {
    if (reduceMotion) return;
    if (!raf) sizeCanvas();
    power = power || 10;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const v = power * (0.45 + Math.random() * 0.75);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 4 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length], shape: i % 3, born: performance.now(), life: 1500 + Math.random() * 900 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => t - p.born < p.life);
    parts.forEach((p) => {
      p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      const fade = 1 - (t - p.born) / p.life;
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, fade * 1.6)); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.shape === 0) ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.4, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(0, -p.r / 2); ctx.lineTo(p.r / 2, p.r / 2); ctx.lineTo(-p.r / 2, p.r / 2); ctx.fill(); }
      ctx.restore();
    });
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
  addEventListener("resize", () => { if (raf) sizeCanvas(); });

  /* ---------- sections ---------- */

  const sections = {};
  $all(".step[data-step]").forEach((s) => { sections[s.dataset.step] = s; });
  const ORDER = STEPS.concat(["finish"]);
  const TITLES = {}; const LEARNED = {}; const PART = {};
  ORDER.forEach((id) => {
    const s = sections[id];
    TITLES[id] = s.dataset.title;
    LEARNED[id] = s.dataset.learned || "";
    PART[id] = s.dataset.part || "core";
  });

  const isDone = (id) => !!state.steps[id];
  const doneCount = () => STEPS.filter(isDone).length;
  function currentId() {
    for (const id of STEPS) if (!isDone(id)) return id;
    return "finish";
  }
  const idx = (id) => ORDER.indexOf(id);
  function reachable(id) {
    return isDone(id) || idx(id) <= idx(currentId());
  }
  function stepLabel(id) {
    const n = sections[id].dataset.num;
    return n !== undefined ? "Step " + n : TITLES[id];
  }

  /* ---------- rail ---------- */

  const rail = $("#rail");
  const railPill = $(".rail-pill", rail);
  const railItems = {};
  (function buildRail() {
    let lastGroup = null;
    ORDER.forEach((id) => {
      const s = sections[id];
      const group = s.dataset.group || "Wrap up";
      if (group !== lastGroup) {
        const g = document.createElement("li");
        g.className = "rail-group";
        g.setAttribute("aria-hidden", "true");
        g.dataset.part = s.dataset.part;
        g.innerHTML = /^Part/.test(group) ? '<span class="part-chip">' + esc(group) + "</span>" : esc(group);
        rail.appendChild(g);
        lastGroup = group;
      }
      const li = document.createElement("li");
      li.className = "rail-item" + (CHECKPOINTS[id] ? " checkpoint" : "");
      li.dataset.part = s.dataset.part || "core";
      const num = s.dataset.num !== undefined ? s.dataset.num : "✓";
      const sub = s.dataset.subTitle || s.dataset.when || "";
      li.innerHTML = '<button type="button"><span class="node"><span class="n">' + esc(num) + '</span><svg class="tick"><use href="#i-check"/></svg></span>' +
        '<span class="rail-text"><span class="rail-title">' + esc(TITLES[id]) + "</span>" + (sub ? '<span class="rail-sub">' + esc(sub) + "</span>" : "") + "</span></button>";
      li.querySelector("button").addEventListener("click", () => { if (reachable(id)) { showTab("build"); go(id); } else toast("Finish " + stepLabel(currentId()) + " first."); });
      rail.appendChild(li);
      railItems[id] = li;
    });
  })();

  function placeRailPill() {
    const li = railItems[viewing];
    if (!li) return;
    const horizontal = getComputedStyle(rail).display === "flex";
    const btn = li.querySelector("button");
    if (horizontal) {
      railPill.style.height = btn.offsetHeight + "px";
      railPill.style.width = btn.offsetWidth + "px";
      railPill.style.transform = "translate(" + li.offsetLeft + "px," + li.offsetTop + "px)";
      // keep the current chip in view
      const sc = $(".rail-scroll");
      const left = li.offsetLeft - sc.clientWidth / 2 + li.offsetWidth / 2;
      sc.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      railPill.style.width = "";
      railPill.style.height = btn.offsetHeight + "px";
      railPill.style.transform = "translateY(" + li.offsetTop + "px)";
    }
  }
  addEventListener("resize", () => { placeRailPill(); placeTabPill(); });

  /* progress bar */
  const bar = $("#progress-bar");
  const segs = {};
  STEPS.forEach((id) => {
    const i = document.createElement("i");
    i.style.setProperty("--seg", getComputedStyle(railItems[id]).getPropertyValue("--rc") || "#1F1B2D");
    bar.appendChild(i);
    segs[id] = i;
  });

  function paintNav() {
    const cur = currentId();
    ORDER.forEach((id) => {
      const li = railItems[id];
      const done = id === "finish" ? cur === "finish" && !!state.feedback : isDone(id);
      li.classList.toggle("done", done);
      li.classList.toggle("current", id === viewing);
      li.classList.toggle("locked", !reachable(id));
      const btn = li.querySelector("button");
      btn.setAttribute("aria-current", id === viewing ? "step" : "false");
      btn.setAttribute("aria-label", TITLES[id] + (CHECKPOINTS[id] ? " (checkpoint)" : "") + (done ? ", done" : !reachable(id) ? ", locked" : ""));
    });
    STEPS.forEach((id) => segs[id].classList.toggle("done", isDone(id)));
    $("#progress-text").innerHTML = doneCount() + " of " + STEPS.length + ' <span class="lbl">done</span>';
    placeRailPill();
    paintBackbar();
  }

  function paintBackbar() {
    const cur = currentId();
    const show = viewing && viewing !== cur && $("#app") && !$("#app").hidden && idx(viewing) < idx(cur);
    const bb = $("#backbar");
    bb.hidden = !show;
    if (show) $("#backbar-text").textContent = "You're looking back at " + stepLabel(viewing) + ". " + (cur === "finish" ? "You've finished every step." : "You're up to " + stepLabel(cur) + ": " + TITLES[cur] + ".");
  }
  $("#backbar-go").addEventListener("click", () => go(currentId()));
  $("#backbar-go").textContent = "Back to where you are →";

  /* ---------- step footers ---------- */

  function renderFooter(id) {
    if (id === "finish") return;
    const sec = sections[id];
    let foot = $(".step-foot", sec);
    if (!foot) { foot = document.createElement("div"); foot.className = "step-foot"; sec.appendChild(foot); }
    let learned = $(".learned", sec);
    foot.innerHTML = "";
    const nextId = ORDER[idx(id) + 1];
    if (isDone(id)) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn complete is-done";
      b.innerHTML = '<svg class="tick"><use href="#i-check"/></svg> Done';
      foot.appendChild(b);
      if (nextId && reachable(nextId)) {
        const n = document.createElement("button");
        n.type = "button"; n.className = "btn ghost";
        n.textContent = (nextId === "finish" ? "Finish" : "Next: " + TITLES[nextId]) + " →";
        n.addEventListener("click", () => go(nextId));
        foot.appendChild(n);
      }
      if (!learned && LEARNED[id]) {
        learned = document.createElement("p");
        learned.className = "learned";
        learned.textContent = LEARNED[id];
        sec.appendChild(learned);
      }
    } else {
      if (learned) learned.remove();
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn complete";
      b.innerHTML = '<svg class="tick"><use href="#i-check"/></svg><span>' + (id === "next" ? "I'm done: finish the workshop" : "I've done this step") + "</span> →";
      b.addEventListener("click", () => completeStep(id));
      foot.appendChild(b);
      if (id === "setup") {
        const ok = REQUIRED_SUBS.every(isDone);
        b.disabled = !ok;
        const note = document.createElement("span");
        note.className = "foot-note";
        const left = REQUIRED_SUBS.filter((s) => !isDone(s)).map((s) => "0." + s.slice(-1));
        note.textContent = ok ? "All set. 0.6 is optional." : "Still to check: " + left.join(", ");
        foot.appendChild(note);
      }
      const st = document.createElement("button");
      st.type = "button"; st.className = "stuck-inline"; st.textContent = "Stuck?";
      st.addEventListener("click", () => openDrawer(id));
      foot.appendChild(st);
    }
  }

  /* ---------- navigation ---------- */

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  function focusHeading(sec) {
    const h = $("h2", sec);
    if (!h) return;
    h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll: true });
  }
  function onShow(id) {
    if (id === "setup") openFirstSub();
    if (id === "finish") renderRecap();
  }

  function go(id, instant) {
    if (busy || !sections[id]) return;
    if (id === viewing) { scrollTop(); return; }
    const from = viewing ? sections[viewing] : null;
    const to = sections[id];
    renderFooter(id);
    if (instant || !from || reduceMotion) {
      if (from) from.hidden = true;
      to.hidden = false;
      viewing = id; paintNav(); onShow(id); scrollTop();
      save();
      return Promise.resolve();
    }
    busy = true;
    from.classList.add("leaving");
    return wait(190).then(() => {
      from.hidden = true; from.classList.remove("leaving");
      viewing = id;
      paintNav();
      scrollTop();
      to.hidden = false;
      to.classList.add("entering");
      onShow(id);
      save();
      return wait(650);
    }).then(() => {
      to.classList.remove("entering");
      busy = false;
      focusHeading(to);
    });
  }

  let tickerTimer = null;
  function showTicker(text) {
    if (!text) return;
    const t = $("#ticker");
    $("#ticker-text").textContent = text.replace(/^Now you know /, "");
    t.classList.add("show");
    clearTimeout(tickerTimer);
    tickerTimer = setTimeout(() => t.classList.remove("show"), 3600);
  }

  function completeStep(id) {
    if (busy || isDone(id)) return;
    if (id === "setup" && !REQUIRED_SUBS.every(isDone)) return;
    busy = true;
    const sec = sections[id];
    const btn = $(".complete", sec);
    state.steps[id] = true;
    save();

    if (btn) {
      btn.classList.add("is-done");
      btn.querySelector("span").textContent = "Done";
      const r = btn.getBoundingClientRect();
      const colors = PALETTE[PART[id]] || PALETTE.core;
      burst(r.left + r.width / 2, r.top + r.height / 2, CHECKPOINTS[id] ? 120 : 70, colors, CHECKPOINTS[id] ? 15 : 11);
      if (CHECKPOINTS[id]) setTimeout(() => burst(innerWidth / 2, innerHeight * 0.95, 90, PALETTE.core, 17), 220);
    }
    const seg = segs[id];
    seg.classList.remove("flash"); void seg.offsetWidth; seg.classList.add("flash");
    paintNav();
    showTicker(LEARNED[id]);

    const learned = document.createElement("p");
    learned.className = "learned enter";
    learned.textContent = LEARNED[id];
    sec.appendChild(learned);

    const nextId = currentId();
    if (nextId === "finish") {
      setTimeout(() => burst(innerWidth * 0.25, innerHeight * 0.9, 110, PALETTE.finish, 17), 300);
      setTimeout(() => burst(innerWidth * 0.75, innerHeight * 0.9, 110, PALETTE.finish, 17), 480);
    }
    wait(1300).then(() => {
      busy = false;
      renderFooter(id);
      go(nextId);
    });
  }

  /* ---------- tabs: Workshop / Side quests ---------- */

  function placeTabPill() {
    const sel = $('.tab[aria-selected="true"]');
    const pill = $(".tab-pill");
    if (!sel || !pill) return;
    pill.style.width = sel.offsetWidth + "px";
    pill.style.transform = "translateX(" + (sel.offsetLeft - 4) + "px)";
    pill.style.left = "4px";
  }
  function showTab(tab) {
    $all(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === tab)));
    placeTabPill();
    const q = $("#quests"); const app = $("#app");
    const toQuests = tab === "quests";
    if (q.hidden === !toQuests) return;
    q.hidden = !toQuests;
    app.hidden = toQuests;
    (toQuests ? q : app).classList.remove("view-in"); void (toQuests ? q : app).offsetWidth;
    (toQuests ? q : app).classList.add("view-in");
    if (toQuests) { history.replaceState(null, "", location.pathname + location.search + "#side-quests"); }
    else { history.replaceState(null, "", location.pathname + location.search); placeRailPill(); paintBackbar(); }
    scrollTop();
  }
  $all(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
  document.addEventListener("click", (e) => {
    const ot = e.target.closest("[data-open-tab]");
    if (ot) showTab(ot.dataset.openTab);
    const gs = e.target.closest("[data-goto-step]");
    if (gs) { const id = gs.dataset.gotoStep; if (reachable(id)) go(id); }
  });

  /* ---------- step 0 sub-steps ---------- */

  function setOpen(el, open) {
    el.classList.toggle("open", open);
    const head = $(":scope > .sub-head, :scope > .fold-head", el);
    if (head) head.setAttribute("aria-expanded", String(open));
  }
  function paintSubs() {
    $all(".sub[data-sub]").forEach((el) => {
      const id = el.dataset.sub;
      el.classList.toggle("done", isDone(id));
      const b = $(".sub-done", el);
      if (b) {
        if (isDone(id)) { b.textContent = "Undo check"; b.classList.add("ghost"); b.classList.remove("accent"); }
        else { b.textContent = id === "setup-6" ? "Done" : "Done, next →"; b.classList.remove("ghost"); b.classList.add("accent"); }
      }
    });
    const gate = $("#setup-gate");
    if (gate) gate.hidden = REQUIRED_SUBS.every(isDone);
    if (viewing === "setup" && !isDone("setup")) renderFooter("setup");
  }
  function openFirstSub() {
    if ($(".sub.open")) return;
    const first = SUBS.find((s) => !isDone(s) && s !== "setup-6");
    if (first) setOpen($('.sub[data-sub="' + first + '"]'), true);
  }
  $all(".sub[data-sub]").forEach((el) => {
    const id = el.dataset.sub;
    $(".sub-head", el).addEventListener("click", () => setOpen(el, !el.classList.contains("open")));
    $(".sub-done", el).addEventListener("click", () => {
      if (isDone(id)) { delete state.steps[id]; save(); paintSubs(); return; }
      state.steps[id] = true; save();
      el.classList.add("pop"); setTimeout(() => el.classList.remove("pop"), 700);
      const r = $(".sub-tick", el).getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 28, PALETTE.pre, 7);
      paintSubs();
      setTimeout(() => {
        setOpen(el, false);
        const next = SUBS.slice(SUBS.indexOf(id) + 1).find((s) => !isDone(s) && s !== "setup-6");
        if (next) {
          const nel = $('.sub[data-sub="' + next + '"]');
          setOpen(nel, true);
          setTimeout(() => nel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 120);
        } else if (REQUIRED_SUBS.every(isDone)) {
          setTimeout(() => $(".step-foot", sections.setup).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }), 200);
          toast("Setup checked off. Finish Step 0 at the bottom.");
        }
      }, 420);
    });
  });

  /* folds */
  $all(".fold").forEach((el) => {
    $(":scope > .fold-head", el).addEventListener("click", () => setOpen(el, !el.classList.contains("open")));
  });

  /* ---------- screenshot slots + links ---------- */

  $all("figure.shot[data-shot]").forEach((fig) => {
    const id = fig.dataset.shot;
    const cap = $("figcaption", fig);
    const capHtml = cap ? cap.innerHTML : "";
    const img = new Image();
    img.alt = cap ? cap.textContent : "Screenshot " + id;
    const exts = ["png", "jpg", "webp"];
    let i = 0;
    const placeholder = () => {
      const ph = document.createElement("div");
      ph.className = "shot-empty";
      ph.innerHTML = '<svg aria-hidden="true"><use href="#i-img"/></svg><div><b>Screenshot ' + esc(id) + "</b>" + capHtml + "</div>";
      if (cap) cap.hidden = true;
      fig.insertBefore(ph, fig.firstChild);
    };
    img.onerror = () => { i++; if (i < exts.length) img.src = "img/screens/" + id + "." + exts[i]; else placeholder(); };
    img.onload = () => { fig.insertBefore(img, fig.firstChild); };
    img.src = "img/screens/" + id + "." + exts[0];
    img.addEventListener("click", () => {
      const lb = document.createElement("div");
      lb.className = "lightbox";
      lb.innerHTML = '<img alt="">';
      lb.firstChild.src = img.src;
      lb.addEventListener("click", () => lb.remove());
      document.body.appendChild(lb);
    });
  });

  $all("a.go-link").forEach((a) => {
    a.insertAdjacentHTML("beforeend", '<svg aria-hidden="true"><use href="#i-ext"/></svg>');
    if (a.hasAttribute("data-verify")) {
      a.insertAdjacentHTML("afterend", '<span class="verify-tag" title="This link still needs to be verified">verify</span>');
    }
  });

  /* ---------- copy cards ---------- */

  function crmCardText() {
    return srcText("crm-card")
      .replace(/\{\{BASE_URL\}\}/g, BASE ? BASE.baseUrl : "{{BASE_URL}}")
      .replace(/\{\{BASE_ID\}\}/g, BASE ? BASE.baseId : "{{BASE_ID}}");
  }
  function crmCardHtml() {
    return esc(srcText("crm-card"))
      .replace(/\{\{BASE_URL\}\}/g, BASE ? '<span class="fill">' + esc(BASE.baseUrl) + "</span>" : '<span class="fill missing">your Base URL</span>')
      .replace(/\{\{BASE_ID\}\}/g, BASE ? '<span class="fill">' + esc(BASE.baseId) + "</span>" : '<span class="fill missing">your Base ID</span>');
  }

  function renderCopyCard(card) {
    const id = card.dataset.copy;
    const isCrm = id === "crm-card";
    const text = isCrm ? crmCardText() : srcText(id);
    card.innerHTML =
      '<div class="copy-top"><div class="copy-title"><b>' + esc(card.dataset.title || "Copy this") + "</b>" +
      (card.dataset.sub ? "<span>" + esc(isCrm && !BASE ? "Paste your Base URL below to fill it in" : card.dataset.sub) + "</span>" : "") + "</div>" +
      '<div class="copy-actions"><button type="button" class="btn small copy-btn">Copy</button>' +
      (card.dataset.download ? '<button type="button" class="btn small ghost dl-btn">Download</button>' : "") + "</div></div>" +
      '<pre class="copy-pre">' + (isCrm ? crmCardHtml() : esc(text)) + "</pre>";
    const pre = $(".copy-pre", card);
    requestAnimationFrame(() => {
      if (pre.scrollHeight > pre.clientHeight + 8 && !$(".copy-more", card)) {
        const more = document.createElement("button");
        more.type = "button"; more.className = "copy-more"; more.textContent = "Show all";
        more.addEventListener("click", () => {
          card.classList.toggle("expanded");
          more.textContent = card.classList.contains("expanded") ? "Show less" : "Show all";
        });
        card.appendChild(more);
      }
    });
    const cb = $(".copy-btn", card);
    cb.addEventListener("click", () => {
      if (isCrm && !BASE) { toast("Paste your Base URL first, so the card has your Base ID."); return; }
      const t = isCrm ? crmCardText() : srcText(id);
      copyText(t).then(() => {
        cb.textContent = "Copied ✓"; cb.classList.add("copied");
        setTimeout(() => { cb.textContent = "Copy"; cb.classList.remove("copied"); }, 1800);
        toast(isCrm ? "Copied. Paste it at the end of your request." : "Copied. Paste it into Claude.");
      }, () => toast("Copy was blocked. Select the text and copy it by hand."));
    });
    const db = $(".dl-btn", card);
    if (db) db.addEventListener("click", () => { download(card.dataset.download, text + "\n", "text/markdown"); toast("Downloaded " + card.dataset.download); });
  }
  $all(".copy-card[data-copy]").forEach(renderCopyCard);

  /* ---------- zip generator ---------- */

  const SKILL_INFO = {
    "crm-company": { d: "Add, update or research a company.", step: "Install in Step 4" },
    "crm-person": { d: "Add or update a person.", step: "Install in Step 5" },
    "crm-capture-convo": { d: "Capture a conversation, with a preview before saving.", step: "Install in Step 6" },
    "crm-brief-me": { d: "Our read-only brief-me. The fallback for Step 7.", step: "Fallback for Step 7" },
  };
  const fileCache = {};
  function fetchSkill(skill) {
    if (fileCache[skill]) return fileCache[skill];
    fileCache[skill] = Promise.all([
      fetch("skills/" + skill + "/SKILL.md", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("SKILL.md " + r.status); return r.arrayBuffer(); }),
      fetch("skills/" + skill + "/crm-config.txt", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("crm-config.txt " + r.status); return r.text(); }),
    ]).then(([md, cfg]) => ({ md: new Uint8Array(md), cfg }));
    fileCache[skill].catch(() => { delete fileCache[skill]; });
    return fileCache[skill];
  }
  function downloadSkill(skill, card) {
    if (!BASE) return;
    return fetchSkill(skill).then(({ md, cfg }) => {
      const zip = CRMZip.buildSkillZip(skill, md, cfg, BASE);
      download(skill + ".zip", new Blob([zip], { type: "application/zip" }));
      if (card) card.classList.add("downloaded");
      toast("Downloaded " + skill + ".zip");
    }).catch(() => toast("Couldn't build " + skill + ".zip. Reload the page and try again."));
  }

  function urlEcho(raw, id) {
    const s = esc(raw.trim());
    return s.replace(esc(id), "<mark>" + esc(id) + "</mark>");
  }

  let lastRaw = "";
  function renderZipgen(el, animate) {
    const skills = (el.dataset.skills || "").split(/\s+/).filter(Boolean);
    const compact = el.classList.contains("compact");
    const isCardHelper = el.dataset.purpose === "card";
    if (isCardHelper && BASE) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;

    if (!BASE) {
      el.innerHTML =
        '<label class="zip-label">' + (compact ? (isCardHelper ? "Paste your Base URL to fill in the card" : "Paste your Base URL to make this zip") : "Your Base URL") + "</label>" +
        '<form class="zip-row"><input class="input" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://airtable.com/app…" aria-label="Your Airtable Base URL">' +
        '<button class="btn" type="submit">' + (isCardHelper ? "Fill it in" : compact ? "Make it" : "Make my skills") + "</button></form>" +
        '<div class="zip-msg" aria-live="polite"></div>' +
        (compact ? "" : '<p class="zip-foot">Your Base URL stays in this page. It isn\'t saved anywhere, so you\'ll paste it again if you reload.</p>');
      const form = $("form", el), input = $("input", el), msg = $(".zip-msg", el);
      input.addEventListener("input", () => { msg.textContent = ""; msg.classList.remove("err"); });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const res = CRMZip.parseBaseUrl(input.value);
        if (!res.ok) { msg.textContent = res.error; msg.classList.add("err"); input.focus(); return; }
        BASE = { baseId: res.baseId, baseUrl: res.baseUrl };
        lastRaw = input.value;
        renderAllBase(el);
      });
      return;
    }

    const cards = skills.map((s) =>
      '<div class="zip-card' + (animate ? " flip" : "") + '" data-skill="' + s + '"><span class="zstep">' + esc(SKILL_INFO[s].step) + '</span><span class="zn">' + s + ".zip</span>" +
      '<span class="zd">' + esc(SKILL_INFO[s].d) + '</span><button type="button" class="btn small">Download</button></div>').join("");
    el.innerHTML =
      (compact ? "" : '<div class="zip-ok"><span class="idchip' + (animate ? " lift" : "") + '">Base ID ' + esc(BASE.baseId) + '</span><span class="url-echo">' + urlEcho(lastRaw || BASE.baseUrl, BASE.baseId) + "</span></div>") +
      '<div class="zip-cards">' + cards + "</div>" +
      '<p class="zip-foot">' + (compact ? "For base <code>" + esc(BASE.baseId) + "</code>. " : "Each zip has your Base URL and Base ID in crm-config.txt. SKILL.md is the same for everyone. ") +
      '<button type="button" class="linkish zip-clear">Use a different base</button></p>';
    $all(".zip-card", el).forEach((c, i) => {
      if (animate) c.style.animationDelay = 0.25 + i * 0.12 + "s";
      $(".btn", c).addEventListener("click", () => downloadSkill(c.dataset.skill, c));
    });
    $(".zip-clear", el).addEventListener("click", () => { BASE = null; lastRaw = ""; renderAllBase(); });
  }

  function renderAllBase(source) {
    $all(".zipgen").forEach((z) => renderZipgen(z, z === source));
    $all('.copy-card[data-copy="crm-card"]').forEach(renderCopyCard);
    $all("[data-fill]").forEach((f) => {
      const v = BASE ? (f.dataset.fill === "url" ? BASE.baseUrl : BASE.baseId) : (f.dataset.fill === "url" ? "paste your Base URL in Step 3" : "…");
      f.textContent = v;
      f.classList.toggle("missing", !BASE);
    });
    if (source && BASE) toast("Got it: " + BASE.baseId);
  }
  renderAllBase();

  /* ---------- skill anatomy ---------- */

  const ANAT = {
    name: { k: "Name", wh: "when", v: "The skill's ID. It's what you pick when you type / to call it." },
    desc: { k: "Description", wh: "when", v: "Decides when Claude uses the skill. Claude reads every installed skill's description and picks the one that matches what you asked, so it's written like a trigger: what it does, plus the phrases you'd actually say." },
    title: { k: "Title", wh: "how", v: "A heading for people reading the file. The body starts here." },
    what: { k: "What this skill does", wh: "how", v: "The job and its boundaries: it writes Companies only, never People or Conversation Notes." },
    inputs: { k: "Inputs", wh: "how", v: "What you can give it." },
    fields: { k: "Fields this skill uses", wh: "how", v: "The exact fields and types it expects. Before touching anything it checks these against your real base (Safety rule 2), so a renamed field stops it instead of breaking your data." },
    workflow: { k: "Workflow", wh: "how", v: "The steps, in order. This is where tools come in: research uses web search; saving uses the Airtable connector." },
    process: { k: "My process (edit this)", wh: "how", v: "Your defaults: response length, research sources, how Notes are written. Change these to match how you work." },
    safety: { k: "Safety rules (do not edit)", wh: "how", v: "Rules that always apply and win over My process: use the right base, check the schema, never duplicate, never delete, verify every save." },
  };
  const HEADING_KEY = {
    "What this skill does": "what", "Inputs": "inputs", "Fields this skill uses": "fields", "Workflow": "workflow",
    "My process (edit this)": "process", "Safety rules (do not edit)": "safety",
  };
  /* "Label it yourself": answers are phrased by purpose, so it isn't just matching headings. */
  const LABEL_OPTIONS = [
    ["name", "The ID you call with /"],
    ["desc", "Decides when Claude uses it"],
    ["title", "A heading for people"],
    ["what", "The job and its limits"],
    ["inputs", "What you can give it"],
    ["fields", "What it checks in your base"],
    ["workflow", "The steps, in order"],
    ["process", "Your defaults, yours to change"],
    ["safety", "Always applies; wins over your defaults"],
  ];
  const PERSON_WHY = {
    name: "crm-person: what you pick after /.",
    desc: "Says what it does and what it doesn't (logging conversations, researching people online). The \"does not\" lines help Claude pick the right skill.",
    title: "A heading for people. Claude goes by the description, not this.",
    what: "Writes People only, plus a name-only company stub it hands to crm-company.",
    inputs: "New here. crm-person never researches people online, so it spells out what it accepts: your words, pasted LinkedIn text, an intro email.",
    fields: "People fields, plus two Companies fields for matching and stubs.",
    workflow: "Step 8 is the hand-off: a new company goes to crm-company.",
    process: "Status rules, the Next action format, the New company rule. Change these.",
    safety: "Identical to crm-company's: both save directly and report what they saved (rule 5).",
  };

  function splitSkill(text) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let i = 0;
    if (lines[0] === "---") {
      const end = lines.indexOf("---", 1);
      const fm = lines.slice(0, end + 1);
      const nameI = fm.findIndex((l) => /^name:/.test(l));
      const descI = fm.findIndex((l) => /^description:/.test(l));
      blocks.push({ key: "name", text: fm.slice(0, descI).join("\n") });
      blocks.push({ key: "desc", text: fm.slice(descI).join("\n") });
      i = end + 1;
      void nameI;
    }
    let cur = { key: "title", lines: [] };
    for (; i < lines.length; i++) {
      const m = /^## (.+)$/.exec(lines[i]);
      if (m) {
        blocks.push({ key: cur.key, text: cur.lines.join("\n").replace(/^\n+|\n+$/g, "") });
        cur = { key: HEADING_KEY[m[1].trim()] || "other", lines: [lines[i]] };
      } else cur.lines.push(lines[i]);
    }
    blocks.push({ key: cur.key, text: cur.lines.join("\n").replace(/^\n+|\n+$/g, "") });
    return blocks.filter((b) => b.text.trim());
  }

  function blockHtml(b, i, label) {
    const long = b.text.length > 700;
    return '<div class="ablock' + (label ? " unlabeled" : " ac-" + b.key) + (long ? " long" : "") + '" data-key="' + b.key + '" data-i="' + i + '">' +
      (label ? "" : '<span class="tag">' + esc(ANAT[b.key] ? ANAT[b.key].k.replace(/ \(.*\)$/, "") : b.key) + "</span>") +
      (label ? '<div class="lab-pick"><select aria-label="What is this part?"><option value="">What is this part?</option>' +
        LABEL_OPTIONS.map((o) => '<option value="' + o[0] + '">' + esc(o[1]) + "</option>").join("") + '</select><span class="verdict" aria-live="polite"></span></div>' : "") +
      "<pre>" + esc(b.text) + "</pre>" + (long ? '<button type="button" class="more">Show all</button>' : "") + "</div>";
  }

  function renderAnatomy(el) {
    const skill = el.dataset.skill;
    const label = el.dataset.mode === "label";
    fetch("skills/" + skill + "/SKILL.md", { cache: "no-store" }).then((r) => { if (!r.ok) throw 0; return r.text(); }).then((text) => {
      const blocks = splitSkill(text);
      const doc = '<div class="anat-doc"><div class="anat-doc-top"><i></i><i></i><i></i>&nbsp;' + skill + '/SKILL.md</div><div class="anat-blocks">' +
        blocks.map((b, i) => blockHtml(b, i, label)).join("") + "</div></div>";
      if (!label) {
        const keys = [];
        blocks.forEach((b) => { if (ANAT[b.key] && keys.indexOf(b.key) < 0) keys.push(b.key); });
        const key = '<div class="anat-key">' + keys.map((k) => '<button type="button" class="akey ac-' + k + '" data-key="' + k + '"><span class="ak">' + esc(ANAT[k].k) +
          '<span class="when-how">' + (ANAT[k].wh === "when" ? "When" : "How") + '</span></span><span class="av">' + esc(ANAT[k].v) + "</span></button>").join("") + "</div>";
        el.innerHTML = doc + key;
        const focus = (k) => {
          const on = el.classList.contains("focusing") && $(".akey.on", el) && $(".akey.on", el).dataset.key === k;
          el.classList.toggle("focusing", !on);
          $all(".akey", el).forEach((a) => a.classList.toggle("on", !on && a.dataset.key === k));
          $all(".ablock", el).forEach((b) => {
            const hit = !on && b.dataset.key === k;
            b.classList.toggle("on", hit);
            if (b.classList.contains("long")) {
              b.classList.toggle("expanded", hit);
              const m = $(".more", b); if (m) m.textContent = hit ? "Show less" : "Show all";
            }
          });
          if (!on) {
            const target = $('.ablock[data-key="' + k + '"]', el);
            const box = $(".anat-blocks", el);
            if (target && box) box.scrollTo({ top: target.offsetTop - box.offsetTop - 8, behavior: reduceMotion ? "auto" : "smooth" });
          }
        };
        $all(".akey", el).forEach((a) => a.addEventListener("click", () => focus(a.dataset.key)));
        $all(".ablock", el).forEach((b) => b.addEventListener("click", (e) => { if (!e.target.closest(".more")) focus(b.dataset.key); }));
      } else {
        el.innerHTML = '<div class="labeler-grid">' + doc + '<div class="lab-score"><div class="lab-meter"><i></i></div><span class="lab-count"></span><button type="button" class="btn small ghost lab-reveal">Show answers</button></div></div>';
        el.style.display = "block";
        const saved = state.labels[skill] || {};
        const score = () => {
          const all = $all(".ablock", el);
          const right = all.filter((b) => b.classList.contains("right")).length;
          $(".lab-meter i", el).style.width = (100 * right) / all.length + "%";
          $(".lab-count", el).textContent = right + " of " + all.length + " labeled";
          if (right === all.length && !el.dataset.cheered) {
            el.dataset.cheered = "1";
            const r = $(".lab-meter", el).getBoundingClientRect();
            burst(r.left + r.width / 2, r.top, 60, PALETTE.A, 10);
            toast("All labeled. You can read any skill now.");
          }
        };
        const judge = (b, v, quiet) => {
          const verdict = $(".verdict", b);
          const ok = v === b.dataset.key;
          b.classList.remove("right", "wrong", "unlabeled", "ac-" + b.dataset.key);
          let why = $(".lab-why", b);
          if (!v) { b.classList.add("unlabeled"); verdict.textContent = ""; if (why) why.remove(); return; }
          if (ok) {
            b.classList.add("right", "ac-" + b.dataset.key);
            verdict.textContent = "✓ " + ANAT[b.dataset.key].k;
            if (!why) { why = document.createElement("p"); why.className = "lab-why"; $(".lab-pick", b).after(why); }
            why.textContent = PERSON_WHY[b.dataset.key] || "";
          } else {
            b.classList.add(quiet ? "unlabeled" : "wrong");
            verdict.textContent = "Not quite. Try again.";
            if (why) why.remove();
          }
        };
        $all(".ablock", el).forEach((b) => {
          const sel = $("select", b);
          const i = b.dataset.i;
          if (saved[i]) { sel.value = saved[i]; judge(b, saved[i], true); }
          sel.addEventListener("change", () => {
            state.labels[skill] = state.labels[skill] || {};
            state.labels[skill][i] = sel.value; saveLocal();
            void b.offsetWidth;
            judge(b, sel.value);
            score();
          });
        });
        $(".lab-reveal", el).addEventListener("click", () => {
          $all(".ablock", el).forEach((b) => { $("select", b).value = b.dataset.key; judge(b, b.dataset.key, true); });
          el.dataset.cheered = "1";
          score();
        });
        score();
      }
      $all(".more", el).forEach((m) => m.addEventListener("click", (e) => {
        e.stopPropagation();
        const b = m.closest(".ablock");
        b.classList.toggle("expanded");
        m.textContent = b.classList.contains("expanded") ? "Show less" : "Show all";
      }));
    }).catch(() => { el.innerHTML = '<p class="anat-loading">Couldn\'t load ' + esc(skill) + "/SKILL.md. Reload the page to try again.</p>"; });
  }
  $all(".anatomy[data-skill]").forEach(renderAnatomy);

  /* Step 6: show capture's real Safety rule 5 (the one that creates the preview). */
  fetch("skills/crm-capture-convo/SKILL.md", { cache: "no-store" }).then((r) => r.text()).then((t) => {
    const m = /\n(5\. \*\*Preview[\s\S]*?)\n\s*Example preview:/.exec(t);
    if (m) $("#capture-rule5").textContent = m[1].replace(/\*\*/g, "").replace(/\n {3}/g, "\n");
  }).catch(() => {});

  /* ---------- six questions ---------- */

  const SIX = [
    ["When should it run?", "What would you say to trigger it? (This becomes the description.)"],
    ["What will you give it?", "A name, notes, nothing?"],
    ["Where does it get its information?", "Your CRM, the web, what Claude knows about you?"],
    ["What should come back?", "What's in it, in what format, how long?"],
    ["What should it never do?", "Guardrails: where should a human stay in the loop?"],
    ["How will you know it worked?", "Test it on someone real before you save."],
  ];
  function renderSix(el) {
    const key = el.dataset.key;
    const isNext = el.dataset.variant === "next";
    const qs = SIX.map((q, i) => (isNext && i === 2 ? [q[0], q[1] + " If it saves anything, which table is it stored in?"] : q));
    if (isNext) qs.push(["Manual or scheduled?", "Do you run it when you need it, or should it run on a schedule?"]);
    state.notes[key] = state.notes[key] || {};
    el.innerHTML = qs.map((q, i) =>
      '<div class="six-q' + (isNext && i === 6 ? " extra" : "") + '"><b>' + esc(q[0]) + '</b><span class="hint">' + esc(q[1]) + "</span>" +
      '<textarea rows="2" data-i="' + i + '" aria-label="' + esc(q[0]) + '"></textarea></div>').join("") +
      '<div class="six-actions"><button type="button" class="btn small ghost six-copy">Copy my answers</button><span class="small muted">' +
      (isNext ? "Saved in this browser only." : "Saved in this browser only. Use them as notes, then write your request in your own words.") + "</span></div>";
    $all("textarea", el).forEach((ta) => {
      ta.value = state.notes[key][ta.dataset.i] || "";
      ta.addEventListener("input", () => { state.notes[key][ta.dataset.i] = ta.value; saveLocal(); });
    });
    $(".six-copy", el).addEventListener("click", () => {
      const txt = qs.map((q, i) => q[0] + "\n" + ((state.notes[key][i] || "").trim() || "-")).join("\n\n");
      copyText(txt).then(() => toast("Copied your answers."), () => toast("Copy was blocked."));
    });
  }
  $all(".six[data-key]").forEach(renderSix);

  /* compare checklist */
  $all(".compare input[data-cmp]").forEach((cb) => {
    cb.checked = !!state.cmp[cb.dataset.cmp];
    cb.addEventListener("change", () => { state.cmp[cb.dataset.cmp] = cb.checked; saveLocal(); });
  });

  /* ---------- step 2 database tour ---------- */

  (function dbTour() {
    const tour = $("#dbtour");
    if (!tour) return;
    const cap = $("#db-caption");
    const CAPS = {
      companies: "Companies: one record per company. The People column shows who's linked to each one.",
      people: "People: one record per person. The Company column is a link field. Click a blue chip.",
      notes: "Conversation Notes: one record per conversation, linked to one person. You'll add the first one in Step 6.",
    };
    const show = (name) => {
      $all(".db-tab", tour).forEach((t) => t.setAttribute("aria-selected", String(t.dataset.db === name)));
      $all(".db-panel", tour).forEach((p) => { p.hidden = p.dataset.panel !== name; });
      cap.textContent = CAPS[name];
    };
    $all(".db-tab", tour).forEach((t) => t.addEventListener("click", () => show(t.dataset.db)));
    $all(".db-link", tour).forEach((l) => l.addEventListener("click", () => {
      const [table, rec] = l.dataset.goto.split(":");
      show(table);
      const row = $('.db-panel[data-panel="' + table + '"] tr[data-rec="' + rec + '"]', tour);
      $all("tr.hl", tour).forEach((r) => r.classList.remove("hl"));
      void row.offsetWidth;
      row.classList.add("hl");
      const fromRow = l.closest("tr").querySelector("strong").textContent;
      cap.innerHTML = "<strong>" + esc(fromRow) + "</strong>'s link points to the <strong>" + esc(row.querySelector("strong").textContent) + "</strong> record. That's a link: it points to the record itself, not just the name.";
    }));
  })();

  /* ---------- stuck drawer ---------- */

  const drawer = $("#drawer");
  let lastFocus = null;
  $("#drawer-rules").innerHTML = $("#house-rules").innerHTML;
  function openDrawer(groupId) {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    drawer.classList.remove("closing");
    const body = $("#drawer-body");
    let gid = groupId || viewing;
    if (gid === "setup") {
      const openSub = $(".sub.open");
      gid = openSub ? openSub.dataset.sub : REQUIRED_SUBS.find((s) => !isDone(s)) || "setup-1";
    }
    $all(".stuck-group", body).forEach((g) => g.classList.toggle("here", g.dataset.group === gid));
    const target = $('.stuck-group[data-group="' + gid + '"]', body);
    $("#stuck-search").value = ""; filterStuck("");
    setTimeout(() => {
      if (target) {
        body.scrollTo({ top: target.offsetTop - body.offsetTop - 8, behavior: reduceMotion ? "auto" : "smooth" });
        target.classList.remove("flash"); void target.offsetWidth; target.classList.add("flash");
      } else body.scrollTo({ top: 0 });
    }, 220);
    $("[data-close]", drawer).focus();
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.add("closing");
    setTimeout(() => { drawer.hidden = true; drawer.classList.remove("closing"); }, reduceMotion ? 0 : 260);
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function filterStuck(q) {
    q = q.trim().toLowerCase();
    let any = false;
    $all(".stuck-group[data-group]", drawer).forEach((g) => {
      let vis = 0;
      $all(".stuck-item", g).forEach((it) => {
        const hit = !q || it.textContent.toLowerCase().indexOf(q) >= 0;
        it.hidden = !hit; if (hit) vis++;
        if (q && hit) it.open = true;
      });
      g.hidden = !vis; if (vis) any = true;
    });
    $("#stuck-empty").hidden = any;
  }
  $("#stuck-search").addEventListener("input", (e) => filterStuck(e.target.value));
  $("#stuck-open").addEventListener("click", () => openDrawer());
  drawer.addEventListener("click", (e) => { if (e.target === drawer || e.target.closest("[data-close]")) closeDrawer(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeDrawer(); const lb = $(".lightbox"); if (lb) lb.remove(); }
  });
  document.addEventListener("click", (e) => {
    const s = e.target.closest(".stuck-inline[data-stuck]");
    if (s) openDrawer(s.dataset.stuck);
  });

  /* ---------- finish: recap + feedback ---------- */

  function recapLine(t) {
    const r = t.replace(/^Now you know /, "");
    return r.charAt(0).toUpperCase() + r.slice(1);
  }
  function renderRecap() {
    $("#recap").innerHTML = STEPS.map((id) =>
      '<li data-part="' + PART[id] + '"><span class="rn">' + esc(sections[id].dataset.num) + "</span><span>" + esc(recapLine(LEARNED[id])) + "</span></li>").join("");
  }
  let rating = state.feedback ? state.feedback.rating : 0;
  (function feedback() {
    const stars = $(".stars");
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "star"; b.setAttribute("role", "radio"); b.setAttribute("aria-label", i + (i === 1 ? " star" : " stars"));
      b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.8z" stroke-width="1.2"/></svg>';
      b.addEventListener("click", () => { rating = i; paintStars(); });
      stars.appendChild(b);
    }
    const comment = $("#fb-comment");
    if (state.feedback) comment.value = state.feedback.comment || "";
    function paintStars() {
      $all(".star", stars).forEach((s, i) => { s.classList.toggle("on", i < rating); s.setAttribute("aria-checked", String(i + 1 === rating)); });
      $("#fb-send").disabled = !rating;
    }
    paintStars();
    $("#fb-send").addEventListener("click", () => {
      const st = $("#fb-status");
      const btn = $("#fb-send");
      btn.disabled = true;
      state.feedback = { rating, comment: comment.value.trim() };
      saveLocal();
      fetch("/api/feedback?room=" + encodeURIComponent(ROOM), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.name, email: state.email, rating, comment: comment.value.trim() }),
      }).then((r) => r.json().catch(() => ({})).then((j) => ({ ok: r.ok, j }))).then(({ ok, j }) => {
        st.hidden = false;
        if (ok) {
          st.className = "fb-status ok"; st.textContent = "Thank you. Sent to the workshop team.";
          const r = btn.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 70, PALETTE.finish, 11);
          paintNav();
        } else {
          st.className = "fb-status err"; st.textContent = (j && j.error === "storage_unconfigured") ? "Couldn't send: no database is connected yet. Tell us in person instead!" : "Couldn't send that. Try again in a moment.";
        }
        btn.disabled = false; btn.textContent = "Send again";
      }).catch(() => { st.hidden = false; st.className = "fb-status err"; st.textContent = "Couldn't send that. Check your connection and try again."; btn.disabled = false; });
    });
  })();

  /* ---------- sign in ---------- */

  const welcome = $("#welcome"), app = $("#app");
  const who = $("#who"), emailIn = $("#email"), goBtn = $("#go"), formErr = $("#form-err");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (ROOM !== "default") $("#room-note").textContent = "Room: " + ROOM + ".";

  function formReady() { goBtn.disabled = !(who.value.trim() && emailIn.value.trim()); formErr.hidden = true; }
  who.addEventListener("input", formReady);
  emailIn.addEventListener("input", formReady);

  function chrome(signedIn) {
    ["#tabs", "#progress", "#stuck-open", "#who-wrap"].forEach((s) => { $(s).hidden = !signedIn; });
    if (signedIn) {
      $("#who-btn").textContent = (state.name.trim()[0] || "?").toUpperCase();
      $("#whoami").textContent = "Signed in as " + state.name + " (" + state.email + ")" + (ROOM !== "default" ? " · room: " + ROOM : "");
      requestAnimationFrame(placeTabPill);
    }
  }
  function showWelcome() {
    app.hidden = true; $("#quests").hidden = true; welcome.hidden = false;
    who.value = state.name; emailIn.value = state.email; formReady();
    chrome(false);
    setTimeout(() => who.focus(), 50);
  }
  function enterApp() {
    welcome.hidden = true;
    chrome(true);
    ORDER.forEach((id) => { sections[id].hidden = true; });
    if (location.hash === "#side-quests") { app.hidden = true; $("#quests").hidden = false; $all(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === "quests"))); placeTabPill(); }
    else app.hidden = false;
    viewing = null;
    go(currentId(), true);
    paintSubs();
    requestAnimationFrame(() => { placeRailPill(); placeTabPill(); });
  }
  $("#signin").addEventListener("submit", (e) => {
    e.preventDefault();
    const n = who.value.trim().replace(/\s+/g, " "), m = emailIn.value.trim().toLowerCase();
    if (!n) { formErr.textContent = "Add your name."; formErr.hidden = false; return; }
    if (!EMAIL_RE.test(m)) { formErr.textContent = "That email doesn't look right."; formErr.hidden = false; return; }
    state.name = n.slice(0, 60); state.email = m.slice(0, 120);
    save();
    pushRemote();
    enterApp();
  });

  /* account menu */
  const whoBtn = $("#who-btn"), whoMenu = $("#who-menu");
  whoBtn.addEventListener("click", (e) => { e.stopPropagation(); whoMenu.hidden = !whoMenu.hidden; whoBtn.setAttribute("aria-expanded", String(!whoMenu.hidden)); $("#reset").textContent = "Start over on this device"; });
  document.addEventListener("click", (e) => { if (!whoMenu.hidden && !e.target.closest("#who-wrap")) whoMenu.hidden = true; });
  $("#change-name").addEventListener("click", () => { whoMenu.hidden = true; showWelcome(); });
  $("#reset").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Click again to clear your progress here"; setTimeout(() => { b.dataset.armed = ""; b.textContent = "Start over on this device"; }, 4000); return; }
    try { localStorage.removeItem(KEY); } catch (err) {}
    location.reload();
  });

  /* ---------- boot ---------- */

  load();
  if (state.name && state.email) { enterApp(); pushRemote(); } else showWelcome();

  /* expose a little for testing in the console */
  window.__w2 = { state, go, currentId, get base() { return BASE; } };
})();
