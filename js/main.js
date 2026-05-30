
/* ══════════════════════════════════════════════════════
   LOADING OVERLAY
══════════════════════════════════════════════════════ */
// Runs cb in a new task after the browser has committed a paint.
const afterPaint = cb => requestAnimationFrame(() => setTimeout(cb, 0));

function openXlsxPicker() {
  showLoading("", "Vyberte soubor xlsx…");

  requestAnimationFrame(() => {
    document.getElementById("xlsx-upload").click();
  });
}

window.addEventListener("focus", () => {
  setTimeout(() => {
    const input = document.getElementById("xlsx-upload");

    if (!input.value) {
      hideLoading();
    }
  }, 300);
});

function showLoading(filename, msg) {
  document.getElementById("loading-filename").textContent = filename || "";
  document.getElementById("loading-msg").textContent = msg || "Čtu soubor xlsx…";
  document.getElementById("loading-overlay").classList.add("visible");
}
function setLoadingMsg(msg) {
  document.getElementById("loading-msg").textContent = msg;
}
function hideLoading() {
  document.getElementById("loading-overlay").classList.remove("visible");
}

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
let players = [];
let config = {};
let currentSeason = "2025";
let searchTerm = "";
let selectedCategories = [];
let sortField = "surname";
let sortDir = "asc";
let editorSeason = "2025";
let editingUid = null;
let filterActiveOnly = false;
let filterGenderMale   = false;
let filterGenderFemale = false;
let filterPhotoExpiring = false;
let hamburgerOpen = false;
let filtersPanelOpen = true;

// Merge state
let mergeIncoming   = [];
let mergeChanges    = [];
let mergeOptRemove      = false;
let mergeOptNoOverwrite = false;
let mergeOptOnlyChanges = true;

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
function toBool(v) {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "ano", "yes", "y"].includes(s);
}

/* ── DATE HELPERS (timestamps as storage format) ── */

function parseDateToTs(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    if (val === 0) return null;
    // Excel serials are < 200 000; ms timestamps are billions
    if (val < 200000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    return val;
  }
  const s = String(val).trim();
  if (!s) return null;
  const m1 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m1) {
    const d = new Date(parseInt(m1[3]), parseInt(m1[2]) - 1, parseInt(m1[1]));
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) {
    const d = new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]));
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.getTime();
}

// Timestamp → "DD.MM.YYYY" for display
function tsToDisplay(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

// Timestamp → "YYYY-MM-DD" for <input type="date"> value
function tsToInputVal(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// <input type="date"> "YYYY-MM-DD" → ms timestamp (or null)
function inputValToTs(yyyymmdd) {
  if (!yyyymmdd) return null;
  const m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return isNaN(d.getTime()) ? null : d.getTime();
}

// Returns a Date from any stored value (ts, Excel serial, legacy string)
function parsePhotoDate(val) {
  const ts = parseDateToTs(val);
  return ts ? new Date(ts) : null;
}

// Returns 'expired' | 'expiring' | 'ok' | null
function getPhotoStatus(val) {
  const d = parsePhotoDate(val);
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthLater = new Date(today); monthLater.setMonth(monthLater.getMonth() + 1);
  if (d < today) return 'expired';
  if (d <= monthLater) return 'expiring';
  return 'ok';
}

function getVersion() {
  return `verze ${APP.version}`;
}

async function saveFile(blob, filename) {
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ══════════════════════════════════════════════════════
   SUPPORT MODAL
══════════════════════════════════════════════════════ */
function openSupportModal() {
  document.getElementById("support-overlay").classList.add("open");
}

function closeSupportModal() {
  document.getElementById("support-overlay").classList.remove("open");
}

/* ══════════════════════════════════════════════════════
   INFO / ABOUT MODAL
══════════════════════════════════════════════════════ */
function openInfoModal() {
  document.getElementById("info-version").textContent = `${getVersion()}`;
  const src = document.querySelector("#header .logo-icon");
  const dst = document.querySelector("#info-overlay .logo-icon");
  if (src && dst) dst.innerHTML = src.innerHTML;
  document.getElementById("info-overlay").classList.add("open");
}

function closeInfoModal() {
  document.getElementById("info-overlay").classList.remove("open");
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
function init() {
  const savedCfg = localStorage.getItem("categories_config");
  if (savedCfg) {
    config = JSON.parse(savedCfg);
  } else {
    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    saveConfig(); // persist defaults so they survive a reload before the editor is opened
  }

  const savedPlayers = localStorage.getItem("roster_data");
  if (savedPlayers) {
    try {
      players = JSON.parse(savedPlayers).map((p, i) => ({
        clubActive: true, comment: "", ...p, _uid: i
      }));
    } catch { players = []; }
  }

  loadIcon();

  renderSeasonTabs();
  renderStatsGrid();
  renderTableHead();
  renderTable(getFiltered());
}

/* ══════════════════════════════════════════════════════
   ICON LOADER
══════════════════════════════════════════════════════ */
function loadIcon() {
  fetch("assets/icon.svg")
    .then(r => r.text())
    .then(svg => document.querySelectorAll(".logo-icon").forEach(el => el.innerHTML = svg))
    .catch(() => {});
}

/* ══════════════════════════════════════════════════════
   SAVE CONFIG / PERSIST PLAYERS
══════════════════════════════════════════════════════ */
function saveConfig() {
  localStorage.setItem("categories_config", JSON.stringify(config));
}

function persistPlayers() {
  try { localStorage.setItem("roster_data", JSON.stringify(players)); } catch(e) {}
}

/* ══════════════════════════════════════════════════════
   XLSX LOAD → MERGE
══════════════════════════════════════════════════════ */
function loadXlsx(event) {
  const file = event.target.files[0];
  if (!file) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {

      const reader = new FileReader();

      reader.onload = e => {
        setLoadingMsg("Zpracovávám data…");

        afterPaint(() => {
          const incoming = parsePlayersFromBuffer(e.target.result);
          event.target.value = "";
          const isInitialLoad = players.length === 0;

          openMergeModalShell(incoming, file.name, null, isInitialLoad);

          afterPaint(() => {
            buildMergeChanges();
            renderMergeTable();

            afterPaint(() => {
              hideLoading();
            });
          });
        });
      };

      reader.onerror = () => {
        hideLoading();
        alert("Chyba při čtení souboru.");
      };

      reader.readAsArrayBuffer(file);
    });
  });
}

function parsePlayersFromBuffer(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return rows.map(r => {
    const parentClub = r["Mateřský klub"] || r["Matersky klub"] || "";
    const { clubId: parentClubId, clubName: parentClubName } = parseClub(parentClub);
    const guestClub  = r["Hostuje v"] || "";
    const { clubId: guestClubId, clubName: guestClubName } = parseClub(guestClub);
    return {
      id:            r["Členské ID"] || r["Clenské ID"] || r["ID"] || "",
      surname:       r["Příjmení"]   || r["Prijmeni"]   || r["surname"]   || "",
      firstname:     r["Jméno"]      || r["Jmeno"]      || r["name"]      || "",
      birthYear:     parseInt(r["Rok narození"] || r["Rok narozeni"] || r["birth_year"] || 0),
      parentClubId, parentClubName, guestClubId, guestClubName,
      active:        toBool(r["Aktivním členem"] || r["active"]),
      since:         parseDateToTs(r["Členem od"] || r["Clenem od"] || ""),
      photoValidity: parseDateToTs(r["Platnost fotografie"] || r["platnost fotografie"] || ""),
      clubActive:    true,
      gender:        null,
      comment:       ""
    };
  }).filter(p => p.surname || p.firstname);
}

function parseClub(raw) {
  if (!raw) return { clubId: "", clubName: "" };
  const parts = raw.split(" - ");
  return { clubId: parts[0]?.trim() || "", clubName: parts[1]?.trim() || "" };
}

function finishLoad(filename) {
  try {
    localStorage.setItem("roster_data", JSON.stringify(players));
    localStorage.setItem("roster_filename", filename || "");
  } catch(e) {}
  renderStatsGrid();
  applyFilters();
}

/* ══════════════════════════════════════════════════════
   CATEGORY ASSIGNMENT
══════════════════════════════════════════════════════ */
function getCategory(birthYear, season) {
  const cats = config[season];
  if (!cats || !birthYear) return null;
  for (const cat of cats) {
    const from = cat.fromYear, to = cat.toYear;
    if (to === null || to === "") { if (birthYear >= from) return cat.name; }
    else { if (birthYear >= from && birthYear <= to) return cat.name; }
  }
  return null;
}

function getCatColor(catName, season) {
  const cats = config[season] || [];
  const idx = cats.findIndex(c => c.name === catName);
  return idx >= 0 ? CAT_COLORS[idx % CAT_COLORS.length] : "#666";
}

function formatYears(cat) {
  if (!cat.toYear) return cat.fromYear + "+";
  if (cat.fromYear === cat.toYear) return String(cat.fromYear);
  return cat.fromYear + "–" + cat.toYear;
}

/* ══════════════════════════════════════════════════════
   SEASON TABS
══════════════════════════════════════════════════════ */
function renderSeasonTabs() {
  const bar = document.getElementById("season-tabs");
  const sel = document.getElementById("season-select");
  const seasons = Object.keys(config).sort();

  bar.innerHTML = seasons.map(s =>
    `<div class="season-tab ${s === currentSeason ? "active" : ""}" onclick="selectSeason('${s}')">${s}</div>`
  ).join("");

  sel.innerHTML = seasons.map(s =>
    `<option value="${s}" ${s === currentSeason ? "selected" : ""}>${s}</option>`
  ).join("");

  document.getElementById("active-season-badge").textContent = "sezóna " + currentSeason;
}

function selectSeason(s) {
  currentSeason = s;
  renderSeasonTabs();
  renderStatsGrid();
  renderTable(getFiltered());
}

/* ══════════════════════════════════════════════════════
   STATS GRID
══════════════════════════════════════════════════════ */
function renderStatsGrid() {
  const grid = document.getElementById("stats-grid");
  const cats = config[currentSeason] || [];

  const counts = {};
  const inactiveCounts = {};
  const maleCounts = {};
  const femaleCounts = {};

  let uncatCount = 0;

  cats.forEach(c => {
    counts[c.name] = 0;
    inactiveCounts[c.name] = 0;
    maleCounts[c.name] = 0;
    femaleCounts[c.name] = 0;
  });

  players.forEach(p => {
    const cat = getCategory(p.birthYear, currentSeason);

    if (cat) {

      // active / total count
      if (p.clubActive !== false) {
        counts[cat] = (counts[cat] || 0) + 1;
      } else {
        inactiveCounts[cat] = (inactiveCounts[cat] || 0) + 1;
      }

      // gender counts
      if (p.gender === "male") {
        maleCounts[cat] = (maleCounts[cat] || 0) + 1;
      }

      if (p.gender === "female") {
        femaleCounts[cat] = (femaleCounts[cat] || 0) + 1;
      }

    } else {
      uncatCount++;
    }
  });

  const total = players.length;

  const activeCount = players.filter(p => p.clubActive !== false).length;
  const inactiveCount = players.filter(p => p.clubActive === false).length;

  const maleCount = players.filter(p => p.gender === "male").length;
  const femaleCount = players.filter(p => p.gender === "female").length;

  let html = cats.map((cat, i) => {

    const color = CAT_COLORS[i % CAT_COLORS.length];
    const selected = selectedCategories.includes(cat.name);

    return `
      <div class="stat-card ${selected ? "selected" : ""}"
          onclick="toggleCatFilter('${cat.name}')"
          style="${selected ? `border-color:${color};background:${color}22` : ""}">

        <div class="stat-cat-name" style="color:${color}">
          ${cat.name}
        </div>

        <div class="stat-main-row">
          <div class="stat-count">
            ${counts[cat.name] ?? 0}
          </div>

          <div class="stat-inactive">
            /${inactiveCounts[cat.name] ?? 0}
          </div>
        </div>

        <div class="stat-gender-row">
          <span class="male">${maleCounts[cat.name] ?? 0}</span>
          <span class="sep">|</span>
          <span class="female">${femaleCounts[cat.name] ?? 0}</span>
        </div>

        <div class="stat-years">
          ${formatYears(cat)}
        </div>
      </div>
    `;
  }).join("");

  const uncatPlayers = players.filter(  p => !getCategory(p.birthYear, currentSeason));
  const uncatActive = uncatPlayers.filter(  p => p.clubActive !== false).length;
  const uncatInactive = uncatPlayers.filter(  p => p.clubActive === false).length;
  const uncatMale = uncatPlayers.filter(  p => p.gender === "male").length;
  const uncatFemale = uncatPlayers.filter(  p => p.gender === "female").length;
  if (uncatPlayers.length > 0 || players.length === 0) {  
    html += `<div class="stat-card stat-card-uncat ${selectedCategories.includes("__uncat__") ? "selected" : ""}"         onclick="toggleCatFilter('__uncat__')">      
        <div class="stat-cat-name">—</div>
          <div class="stat-main-row">        
            <div class="stat-count">${uncatActive}</div>        
            <div class="stat-inactive">/${uncatInactive}</div>      
          </div>      
          <div class="stat-gender-row">        
            <span class="male">${uncatMale}</span>        
            <span class="sep">|</span>        
            <span class="female">${uncatFemale}</span>        
          </div>      
          <div class="stat-years">bez kategorie</div>    
        </div>  `;
  }
  html += `<div class="stat-card stat-total" style="cursor:default">
      <div class="stat-cat-name">CELKEM</div>
      <div class="stat-main-row">
        <div class="stat-count">${activeCount}</div>
        <div class="stat-count-inactive">/${inactiveCount}</div>
      </div>
      <div class="stat-gender-row">
        <span class="male">${maleCount}</span>
        <span class="sep">|</span>
        <span class="female">${femaleCount}</span>
      </div>
      <div class="stat-years">hráčů</div>
    </div>`;
  grid.innerHTML = html;
}

/* ══════════════════════════════════════════════════════
   FILTERING & SORTING
══════════════════════════════════════════════════════ */
function toggleCatFilter(name) {
  if (selectedCategories.includes(name)) selectedCategories = selectedCategories.filter(x => x !== name);
  else selectedCategories.push(name);
  renderStatsGrid();
  renderFilterTags();
  renderTable(getFiltered());
  updateFilterToggleBadge();
}

function toggleActiveFilter() {
  filterActiveOnly = !filterActiveOnly;
  const btn = document.getElementById("filter-active-btn");
  btn.classList.toggle("on", filterActiveOnly);
  renderTable(getFiltered());
  updateFilterToggleBadge();
}

function toggleGenderFilter(type) {
  if (type === 'male') {
    filterGenderMale = !filterGenderMale;
    document.getElementById("gf-male").classList.toggle("active", filterGenderMale);
  } else {
    filterGenderFemale = !filterGenderFemale;
    document.getElementById("gf-female").classList.toggle("active", filterGenderFemale);
  }
  renderTable(getFiltered());
  updateFilterToggleBadge();
}

function togglePhotoFilter() {
  filterPhotoExpiring = !filterPhotoExpiring;
  const btn = document.getElementById("filter-photo-btn");
  btn.classList.toggle("on", filterPhotoExpiring);
  renderTable(getFiltered());
  updateFilterToggleBadge();
}

function toggleHamburger() {
  hamburgerOpen = !hamburgerOpen;
  document.getElementById("hamburger-menu").classList.toggle("open", hamburgerOpen);
}
function closeHamburger() {
  hamburgerOpen = false;
  document.getElementById("hamburger-menu").classList.remove("open");
}
function toggleFiltersPanel() {
  filtersPanelOpen = !filtersPanelOpen;
  document.getElementById("filters-panel").classList.toggle("collapsed", !filtersPanelOpen);
  const btn = document.getElementById("filters-toggle-btn");
  btn.textContent = filtersPanelOpen ? "▲ filtry" : "▼ filtry";
  updateFilterToggleBadge();
}
function updateFilterToggleBadge() {
  const btn = document.getElementById("filters-toggle-btn");
  if (!btn) return;
  const hasActive = filterActiveOnly || filterGenderMale || filterGenderFemale || filterPhotoExpiring || selectedCategories.length > 0;
  btn.classList.toggle("has-active", hasActive);
}

function clearCategoryFilters() {
  selectedCategories = [];
  renderStatsGrid();
  renderFilterTags();
  renderTable(getFiltered());
  updateFilterToggleBadge();
}

function clearAllFilters() {
  selectedCategories = [];
  searchTerm = "";
  filterActiveOnly = false;
  filterGenderMale = false;
  filterGenderFemale = false;
  filterPhotoExpiring = false;
  document.getElementById("search-input").value = "";
  const btn = document.getElementById("filter-active-btn");
  if (btn) btn.classList.remove("on");
  const pbtn = document.getElementById("filter-photo-btn");
  if (pbtn) pbtn.classList.remove("on");
  renderStatsGrid();
  renderFilterTags();
  renderTable(getFiltered());
  updateFilterToggleBadge();
}

function applyFilters() {
  searchTerm = document.getElementById("search-input").value.toLowerCase();
  renderTable(getFiltered());
}

function getFiltered() {
  return players.filter(p => {

    if (searchTerm) {
      const full = (p.surname + " " + p.firstname + " " + p.id).toLowerCase();
      if (!full.includes(searchTerm)) return false;
    }
    if (selectedCategories.length > 0) {
      const cat = getCategory(p.birthYear, currentSeason);
      const effectiveCat = cat ?? "__uncat__";
      if (!selectedCategories.includes(effectiveCat)) return false;
    }
    if (filterActiveOnly && p.clubActive === false) return false;
    if (filterPhotoExpiring) {
      const st = getPhotoStatus(p.photoValidity);
      if (st !== 'expired' && st !== 'expiring') return false;
    }
    if (filterGenderMale || filterGenderFemale) {
      if (filterGenderMale && filterGenderFemale) {
        if (p.gender !== 'male' && p.gender !== 'female') return false;
      } else if (filterGenderMale) {
        if (p.gender !== 'male') return false;
      } else {
        if (p.gender !== 'female') return false;
      }
    }
    return true;
  });
}

function renderFilterTags() {
  const tagsEl = document.getElementById("filter-tags");
  if (selectedCategories.length === 0) { tagsEl.innerHTML = ""; return; }
  tagsEl.innerHTML = selectedCategories.map(c => {
    const label = c === "__uncat__" ? "bez kategorie" : c;
    const color = c !== "__uncat__" ? getCatColor(c, currentSeason) : "#888";
    return `<span class="filter-tag" style="background:${color}99;border:1px solid ${color}">
      ${label}<span class="filter-tag-remove" onclick="toggleCatFilter('${c}')">✕</span>
    </span>`;
  }).join("");
}

/* ══════════════════════════════════════════════════════
   TABLE
══════════════════════════════════════════════════════ */
const COLUMNS = [
  { field: "id",             label: "ID" },
  { field: "surname",        label: "Příjmení", stickyClass: "sc-surname" },
  { field: "firstname",      label: "Jméno",    stickyClass: "sc-fname"   },
  { field: "birthYear",      label: "Rok nar." },
  { field: "category",       label: "Kategorie" },
  { field: "guestClubName",  label: "Hostuje v" },
  { field: "active",         label: "FAČR" },
  { field: "clubActive",     label: "Aktivní" },
  { field: "gender",         label: "Pohlaví" },
  { field: "photoValidity",  label: "Platnost foto" },
  { field: "comment",        label: "Poznámka" }
];

function renderTableHead() {
  const tr = document.getElementById("table-head");
  tr.innerHTML = COLUMNS.map(col => {
    const sortCls = sortField === col.field ? (sortDir === "asc" ? "sort-asc" : "sort-desc") : "";
    const stickyCls = col.stickyClass ? " " + col.stickyClass : "";
    return `<th class="${sortCls}${stickyCls}" onclick="sortBy('${col.field}')">${col.label}</th>`;
  }).join("") + `<th style="width:110px"></th>`;
}

function sortBy(field) {
  if (sortField === field) sortDir = sortDir === "asc" ? "desc" : "asc";
  else { sortField = field; sortDir = "asc"; }
  renderTableHead();
  renderTable(getFiltered());
}

function renderTable(data) {
  const sorted = [...data].sort((a, b) => {
    let va = sortField === "category" ? (getCategory(a.birthYear, currentSeason) ?? "") : (a[sortField] ?? "");
    let vb = sortField === "category" ? (getCategory(b.birthYear, currentSeason) ?? "") : (b[sortField] ?? "");
    if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
    if (typeof va === "number") return sortDir === "asc" ? -1 : 1;
    if (typeof vb === "number") return sortDir === "asc" ?  1 : -1;
    va = String(va); vb = String(vb);
    return sortDir === "asc"
    ? va.localeCompare(vb, "cs", { sensitivity: "base" })
    : vb.localeCompare(va, "cs", { sensitivity: "base" });
  });

  const tbody = document.getElementById("table-body");
  const noRes = document.getElementById("no-results");

  if (players.length === 0) {
    tbody.innerHTML = `<tr><td colspan="14" class="no-data"><span>⚽</span>Nahrajte soubor xlsx se seznamem hráčů.</td></tr>`;
    noRes.style.display = "none";
    return;
  }
  if (sorted.length === 0) {
    tbody.innerHTML = "";
    noRes.style.display = "block";
    return;
  }
  noRes.style.display = "none";

  tbody.innerHTML = sorted.map(p => {
    const cat = getCategory(p.birthYear, currentSeason);
    const color = cat ? getCatColor(cat, currentSeason) : "#666";
    const catBadge = cat
      ? `<span class="cat-badge" style="background:${color}22;color:${color};border:1px solid ${color}55">${cat}</span>`
      : `<span class="cat-badge" style="background:#33333388;color:#888">—</span>`;

    const clubActiveBtn = `<button class="club-toggle ${p.clubActive !== false ? 'active' : 'inactive'}"
      onclick="toggleClubActive(${p._uid})">${p.clubActive !== false ? '● hraje' : '○ nehraje'}</button>`;

    const commentCell = `<input class="comment-input" type="text"
      value="${esc(p.comment || '')}" placeholder="poznámka…"
      onchange="setPlayerField(${p._uid},'comment',this.value)"
      onclick="event.stopPropagation()" />`;

    const actions = `<td class="row-actions">
      <button class="row-btn row-btn-edit" onclick="openEditModal(${p._uid})">✎ edit</button>
      <button class="row-btn row-btn-remove" onclick="removePlayer(${p._uid})">✕ smazat</button>
    </td>`;

    return `<tr>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--text-muted)">${esc(p.id)}</td>
      <td class="sc-surname"><strong>${esc(p.surname)}</strong></td>
      <td class="sc-fname">${esc(p.firstname)}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:.8rem">${p.birthYear || "—"}</td>
      <td>${catBadge}</td>
      <td style="color:var(--text-dim);font-size:.78rem">${esc(p.guestClubName)}</td>
      <td style="font-size:.78rem">
        ${
          p.active === true
            ? '<span style="color:#5bc05b">●</span> ano'
            : p.active === false
              ? '<span style="color:#d9534f">●</span> ne'
              : "—"
        }
      </td>
      <td>${clubActiveBtn}</td>
      <td>${p.gender ? `<span style="color:${p.gender === 'male' ? 'var(--blue)' : 'var(--red)'}">${p.gender === 'male' ? '♂' : '♀'}</span>` : "—"}</td>
      <td>${renderPhotoCell(p.photoValidity)}</td>
      <td class="comment-cell">${commentCell}</td>
      ${actions}
    </tr>`;
  }).join("");
}

function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function renderPhotoCell(val) {
  if (!val) return `<span style="color:var(--text-muted)">—</span>`;
  const display = tsToDisplay(parseDateToTs(val)) || String(val);
  const status = getPhotoStatus(val);
  if (status === 'expired')  return `<span class="photo-expired" title="Fotografie vypršela">${esc(display)}</span>`;
  if (status === 'expiring') return `<span class="photo-expiring" title="Fotografie brzy vyprší">${esc(display)}</span>`;
  return `<span class="photo-ok">${esc(display)}</span>`;
}

/* ══════════════════════════════════════════════════════
   PLAYER FIELD EDITING
══════════════════════════════════════════════════════ */
function setPlayerField(uid, field, value) {
  const p = players.find(p => p._uid === uid);
  if (!p) return;
  p[field] = value;
  persistPlayers();
}

function toggleClubActive(uid) {
  const p = players.find(p => p._uid === uid);
  if (!p) return;
  p.clubActive = p.clubActive === false ? true : false;
  persistPlayers();
  const btn = document.querySelector(`button.club-toggle[onclick="toggleClubActive(${uid})"]`);
  if (btn) {
    btn.className = `club-toggle ${p.clubActive !== false ? 'active' : 'inactive'}`;
    btn.textContent = p.clubActive !== false ? '● hraje' : '○ nehraje';
  }
  renderStatsGrid();
}

function removePlayer(uid) {
  const p = players.find(p => p._uid === uid);
  if (!p) return;
  const name = [p.surname, p.firstname].filter(Boolean).join(" ") || "tohoto hráče";
  if (!confirm(`Smazat ${name}? Tato akce je nevratná.`)) return;
  players = players.filter(p => p._uid !== uid);
  persistPlayers();
  renderStatsGrid();
  renderTable(getFiltered());
}

/* ══════════════════════════════════════════════════════
   EDIT PLAYER MODAL
══════════════════════════════════════════════════════ */
function openEditModal(uid) {
  const p = players.find(p => p._uid === uid);
  if (!p) return;
  editingUid = uid;

  document.getElementById("ef-surname").value         = p.surname    || "";
  document.getElementById("ef-firstname").value       = p.firstname  || "";
  document.getElementById("ef-birthYear").value       = p.birthYear  || "";
  document.getElementById("ef-id").value              = p.id         || "";
  document.getElementById("ef-parentClubName").value  = p.parentClubName || "";
  document.getElementById("ef-parentClubId").value    = p.parentClubId || "";
  document.getElementById("ef-guestClubName").value   = p.guestClubName  || "";
  document.getElementById("ef-guestClubId").value     = p.guestClubId  || "";
  document.getElementById("ef-active").checked        = p.active === true;
  document.getElementById("ef-since").value           = tsToInputVal(parseDateToTs(p.since));
  document.getElementById("ef-photoValidity").value   = tsToInputVal(parseDateToTs(p.photoValidity));
  document.getElementById("ef-comment").value         = p.comment    || "";

  // reset UI
  document.querySelectorAll(".gender-option").forEach(opt => opt.classList.remove("active"));

  if (p.gender === "male") {
    document.querySelector('.gender-option[data-value="male"]').classList.add("active");
  } else if (p.gender === "female") {
    document.querySelector('.gender-option[data-value="female"]').classList.add("active");
  }

  document.getElementById("ef-gender").value = p.gender || "";


  const cb = document.getElementById("ef-clubActive");
  cb.checked = p.clubActive !== false;
  document.getElementById("ef-clubActive-label").textContent = cb.checked ? "hraje" : "nehraje";
  cb.onchange = () => {
    document.getElementById("ef-clubActive-label").textContent = cb.checked ? "hraje" : "nehraje";
  };

  document.getElementById("edit-overlay").classList.add("open");
  document.getElementById("ef-surname").focus();
}

function toggleGender(el) {
  const value = el.dataset.value;
  const hidden = document.getElementById("ef-gender");

  if (el.classList.contains("active")) {
    el.classList.remove("active");
    hidden.value = "";
    return;
  }

  document.querySelectorAll(".gender-option").forEach(opt => opt.classList.remove("active"));
  el.classList.add("active");
  hidden.value = value;
}

function closeEditModal() {
  editingUid = null;
  document.getElementById("edit-overlay").classList.remove("open");
}

function saveEditModal() {
  const p = players.find(p => p._uid === editingUid);
  if (!p) return;

  p.surname         = document.getElementById("ef-surname").value.trim();
  p.firstname       = document.getElementById("ef-firstname").value.trim();
  p.birthYear       = parseInt(document.getElementById("ef-birthYear").value) || 0;
  p.parentClubName  = document.getElementById("ef-parentClubName").value.trim();
  p.parentClubId    = document.getElementById("ef-parentClubId").value.trim();
  p.guestClubName   = document.getElementById("ef-guestClubName").value.trim();
  p.guestClubId     = document.getElementById("ef-guestClubId").value.trim();
  p.active          = document.getElementById("ef-active").checked;
  p.since           = inputValToTs(document.getElementById("ef-since").value);
  p.photoValidity   = inputValToTs(document.getElementById("ef-photoValidity").value);
  p.comment         = document.getElementById("ef-comment").value;
  p.clubActive      = document.getElementById("ef-clubActive").checked;
  p.gender          = document.getElementById("ef-gender").value;


  persistPlayers();
  closeEditModal();
  renderStatsGrid();
  renderTable(getFiltered());
}

/* ══════════════════════════════════════════════════════
   EXPORT / IMPORT PLAYERS
══════════════════════════════════════════════════════ */
function exportPlayers() {
  if (players.length === 0) {
    alert("Nejsou načtena žádná data hráčů.");
    return;
  }

  const payload = {
    type: "rosterapp.players",
    version: "1.1",

    players: players.map(({ _uid, ...p }) => p)
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" }
  );

  const stamp = new Date().toISOString().slice(0,10);
  saveFile(blob, `roster_export_${stamp}.json`);
}

function importPlayers(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (players.length > 0) {
    if (!confirm(`V aplikaci je ${players.length} hráčů. Import JSON přepíše všechna stávající data. Pokračovat?`)) {
      event.target.value = "";
      return;
    }
  }

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);

      let importedPlayers = [];
      let fileVersion = null;

      // structured format
      if (
        imported &&
        typeof imported === "object" &&
        imported.type === "rosterapp.players" &&
        typeof imported.version === "string" &&
        Array.isArray(imported.players)
      ) {
        fileVersion = imported.version;
        importedPlayers = imported.players;

      }
      // legacy format (plain array, no version)
      else if (Array.isArray(imported)) {

        importedPlayers = imported;

      }
      else {
        throw new Error("invalid roster format");
      }

      // ── Migration: v1.0 and legacy → v1.1 ──
      // v1.0 stored `since` as a plain string and had no `photoValidity`.
      // v1.1 stores both as ms timestamps. Migrate any older data transparently.
      const needsMigration = fileVersion === null || fileVersion === "1.0";
      if (needsMigration) {
        importedPlayers = importedPlayers.map(p => ({
          ...p,
          since:         parseDateToTs(p.since ?? "") ?? null,
          photoValidity: parseDateToTs(p.photoValidity ?? "") ?? null,
        }));
      }

      players = importedPlayers.map((p, i) => ({
        clubActive: true,
        comment: "",
        ...p,
        _uid: i
      }));

      persistPlayers();
      localStorage.setItem("roster_filename", file.name);

      renderStatsGrid();
      applyFilters();

    } catch (e) {
      alert(
        "Chyba při načítání souboru. Použijte soubor exportovaný touto aplikací."
        + "\nChyba: " + e.message
      );
    }

    event.target.value = "";
  };

  reader.readAsText(file);
}

/* ══════════════════════════════════════════════════════
   MERGE MODAL
══════════════════════════════════════════════════════ */
const MERGE_FIELDS = ["surname","firstname","birthYear","parentClubId","parentClubName",
                      "guestClubId","guestClubName","active","since","photoValidity"];
const MERGE_COLS = [
  { field:"surname",        label:"Příjmení" },
  { field:"firstname",      label:"Jméno" },
  { field:"birthYear",      label:"Rok nar." },
  { field:"parentClubName", label:"Mateřský klub" },
  { field:"parentClubId",   label:"(ID)" },
  { field:"guestClubName",  label:"Hostuje v" },
  { field:"guestClubId",    label:"(ID)" },
  { field:"active",         label:"FAČR" },
  { field:"since",          label:"Člen od" },
  { field:"photoValidity",  label:"Platnost foto" },
];

function openMergeModalShell(incoming, filename, titleOverride, isInitialLoad) {
  mergeIncoming = incoming;
  mergeIncoming._filename = filename;
  document.querySelector("#merge-modal .modal-header h2").textContent =
    titleOverride || (isInitialLoad ? "↑ NAČTENÍ DAT – xlsx" : "⇄ SLOUČENÍ DAT – xlsx");

  // Hide/show the three filter toggles depending on context
  const filterIds = ["opt-remove","opt-nooverwrite","opt-onlychanges","merge-gender-sep"];
  filterIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isInitialLoad ? "none" : "";
  });

  mergeOptRemove = false; mergeOptNoOverwrite = false; mergeOptOnlyChanges = !isInitialLoad;
  document.getElementById("opt-remove").classList.remove("on");
  document.getElementById("opt-nooverwrite").classList.remove("on");
  const ocEl = document.getElementById("opt-onlychanges");
  ocEl.classList.toggle("on", mergeOptOnlyChanges);
  document.getElementById("opt-remove").querySelector(".chk").textContent = "☐";
  document.getElementById("opt-nooverwrite").querySelector(".chk").textContent = "☐";
  ocEl.querySelector(".chk").textContent = mergeOptOnlyChanges ? "☑" : "☐";

  // Reset gender global buttons
  _updateMergeGenderBtns(null);

  // Reset summary badges
  document.getElementById("ms-add").textContent = "+ …";
  document.getElementById("ms-upd").textContent = "~ …";
  document.getElementById("ms-rem").textContent = "− …";
  document.getElementById("merge-apply-count").textContent = "";
  document.getElementById("merge-table-head").innerHTML = "";
  document.getElementById("merge-table-body").innerHTML =
    `<tr><td colspan="12" style="text-align:center;padding:48px 20px">
      <div style="display:inline-block;width:28px;height:28px;border:3px solid rgba(91,192,91,.2);
        border-top-color:var(--accent);border-radius:50%;animation:spin .75s linear infinite"></div>
      <div style="margin-top:14px;font-family:'IBM Plex Mono',monospace;font-size:.72rem;
        color:var(--text-muted);letter-spacing:.08em">POROVNÁVÁM ZMĚNY…</div>
    </td></tr>`;
  document.getElementById("merge-overlay").classList.add("open");
}

function openMergeModal(incoming, filename) {
  mergeIncoming = incoming;
  mergeIncoming._filename = filename;
  ["opt-remove","opt-nooverwrite","opt-onlychanges","merge-gender-sep"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
  });
  mergeOptRemove = false; mergeOptNoOverwrite = false; mergeOptOnlyChanges = true;
  document.getElementById("opt-remove").classList.remove("on");
  document.getElementById("opt-nooverwrite").classList.remove("on");
  document.getElementById("opt-onlychanges").classList.add("on");
  document.getElementById("opt-remove").querySelector(".chk").textContent = "☐";
  document.getElementById("opt-nooverwrite").querySelector(".chk").textContent = "☐";
  document.getElementById("opt-onlychanges").querySelector(".chk").textContent = "☑";
  _updateMergeGenderBtns(null);
  buildMergeChanges();
  renderMergeTable();
  document.getElementById("merge-overlay").classList.add("open");
}

function closeMergeModal() {
  document.getElementById("merge-overlay").classList.remove("open");
  mergeIncoming = []; mergeChanges = [];
}

function toggleMergeOpt(opt) {
  if (opt === "remove") {
    mergeOptRemove = !mergeOptRemove;
    const el = document.getElementById("opt-remove");
    el.classList.toggle("on", mergeOptRemove);
    el.querySelector(".chk").textContent = mergeOptRemove ? "☑" : "☐";
  } else if (opt === "nooverwrite") {
    mergeOptNoOverwrite = !mergeOptNoOverwrite;
    const el = document.getElementById("opt-nooverwrite");
    el.classList.toggle("on", mergeOptNoOverwrite);
    el.querySelector(".chk").textContent = mergeOptNoOverwrite ? "☑" : "☐";
  } else if (opt === "onlychanges") {
    mergeOptOnlyChanges = !mergeOptOnlyChanges;
    const el = document.getElementById("opt-onlychanges");
    el.classList.toggle("on", mergeOptOnlyChanges);
    el.querySelector(".chk").textContent = mergeOptOnlyChanges ? "☑" : "☐";
  }
  renderMergeTable();
}

function buildMergeChanges() {
  const existingById = {};
  players.forEach(p => { if (p.id) existingById[String(p.id)] = p; });

  const incomingById = {};
  mergeIncoming.forEach(p => { if (p.id) incomingById[String(p.id)] = p; });

  // Pre-count IDs to detect duplicates within the incoming list
  const incomingIdCount = {};
  mergeIncoming.forEach(p => {
    const id = String(p.id || "").trim();
    if (id) incomingIdCount[id] = (incomingIdCount[id] || 0) + 1;
  });

  mergeChanges = [];

  // ADD / UPDATE / NOCHANGE
  mergeIncoming.forEach(inc => {
    const incId         = String(inc.id || "").trim();
    const isValidFormat = /^\d{8}$/.test(incId);
    const isDup         = incId ? (incomingIdCount[incId] || 0) > 1 : false;
    const ex            = (isValidFormat && !isDup) ? existingById[incId] : null;

    if (!incId) {
      mergeChanges.push({
        type: "ADD", id: "", existing: null, incoming: inc,
        fields: {}, enabled: false, missingId: true, invalidId: false, idEditable: true,
        gender: null
      });
      return;
    }

    if (!isValidFormat || isDup) {
      // Invalid format or duplicate within import – flag but keep editable
      mergeChanges.push({
        type: "ADD", id: incId, existing: null, incoming: inc,
        fields: {}, enabled: false, missingId: false, invalidId: true, idEditable: true,
        gender: null
      });
      return;
    }

    if (!ex) {
      mergeChanges.push({
        type: "ADD", id: incId, existing: null, incoming: inc,
        fields: {}, enabled: true, gender: null
      });
    } else {
      const changed = {};
      MERGE_FIELDS.forEach(f => {
        const ov = String(ex[f] ?? "");
        const nv = String(inc[f] ?? "");
        if (ov !== nv) changed[f] = { old: ex[f], new: inc[f] };
      });

      const hasChanges = Object.keys(changed).length > 0;

      if (hasChanges) {
        mergeChanges.push({
          type: "UPDATE", id: incId, existing: ex, incoming: inc,
          fields: changed, enabled: true, gender: ex.gender || null
        });
      } else {
        mergeChanges.push({
          type: "NOCHANGE", id: incId, existing: ex, incoming: inc,
          fields: {}, enabled: false, gender: ex.gender || null
        });
      }
    }
  });

  // Always add REMOVE candidates – visibility/apply controlled by mergeOptRemove
  players.forEach(ex => {
    if (ex.id && !incomingById[String(ex.id)]) {
      mergeChanges.push({
        type: "REMOVE", id: String(ex.id), existing: ex, incoming: null,
        fields: {}, enabled: true, gender: null
      });
    }
  });
}

function revalidateEditableIds() {
  // Count IDs across ALL mergeChanges rows (always complete now)
  const idCount = {};
  mergeChanges.forEach(c => {
    if (c.id) idCount[c.id] = (idCount[c.id] || 0) + 1;
  });

  mergeChanges.forEach(ch => {
    if (!ch.idEditable) return;

    const isValidFormat  = /^\d{8}$/.test(ch.id);
    const isDup          = ch.id ? (idCount[ch.id] || 0) > 1 : false;
    const existingPlayer = (ch.id && isValidFormat && !isDup) ? players.find(p => String(p.id) === ch.id) : null;

    if (!ch.id) {
      ch.missingId = true; ch.invalidId = false; ch.enabled = false;
      ch.type = "ADD"; ch.existing = null; ch.fields = {}; ch._wasManualId = false;
    } else if (!isValidFormat || isDup) {
      ch.missingId = false; ch.invalidId = true; ch.enabled = false;
      if (ch._wasManualId) { ch.type = "ADD"; ch.existing = null; ch.fields = {}; }
    } else if (existingPlayer) {
      ch.missingId = false; ch.invalidId = false; ch._wasManualId = true;
      const changed = {};
      MERGE_FIELDS.forEach(f => {
        const ov = String(existingPlayer[f] ?? "");
        const nv = String(ch.incoming[f] ?? "");
        if (ov !== nv) changed[f] = { old: existingPlayer[f], new: ch.incoming[f] };
      });
      if (Object.keys(changed).length > 0) {
        ch.type = "UPDATE"; ch.existing = existingPlayer; ch.fields = changed; ch.enabled = true;
        if (!ch.gender && existingPlayer.gender) ch.gender = existingPlayer.gender;
      } else {
        ch.type = "NOCHANGE"; ch.existing = existingPlayer; ch.fields = {}; ch.enabled = false;
      }
    } else {
      ch.missingId = false; ch.invalidId = false; ch.enabled = true;
      if (ch._wasManualId) { ch.type = "ADD"; ch.existing = null; ch.fields = {}; ch._wasManualId = false; }
    }
  });
}

function editMergeId(ci, value) {
  const ch = mergeChanges[ci];
  ch.id = value.trim();
  ch.incoming.id = ch.id;   // keep mergeIncoming in sync for rebuild correctness

  revalidateEditableIds();

  // Auto-render when the field is complete so badges update without needing to blur
  if (ch.id.length === 8) renderMergeTable();
}

function renderMergeTable() {
  const counts = { ADD:0, UPDATE:0, REMOVE:0 };
  mergeChanges.forEach(c => {
    if (!c.enabled) return;
    if (c.type === "UPDATE" && mergeOptNoOverwrite) return;
    if (c.type === "REMOVE" && !mergeOptRemove) return;
    if (counts[c.type] !== undefined) counts[c.type]++;
  });
  document.getElementById("ms-add").textContent = `+ ${counts.ADD} nových`;
  document.getElementById("ms-upd").textContent = `~ ${counts.UPDATE} změn`;
  document.getElementById("ms-rem").textContent = `− ${counts.REMOVE} odebrat`;
  const total = counts.ADD + counts.UPDATE + counts.REMOVE;
  document.getElementById("merge-apply-count").textContent = `${total} změn bude aplikováno`;

  document.getElementById("merge-table-head").innerHTML =
    `<th>Typ</th><th>ID</th>` + MERGE_COLS.map(c => `<th>${c.label}</th>`).join("") + `<th>Pohlaví</th><th style="width:30px"></th>`;

  const tbody = document.getElementById("merge-table-body");
  const visible = mergeChanges
    .map((ch, i) => ({ ch, i }))
    .filter(({ ch }) => {
      if (ch.type === "REMOVE"  && !mergeOptRemove)                      return false;
      if (ch.type === "NOCHANGE" && mergeOptOnlyChanges && !ch.idEditable) return false;
      return true;
    });
 
  if (visible.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${MERGE_COLS.length+3}" style="text-align:center;padding:30px;color:var(--text-muted)">Žádné změny</td></tr>`;
    return;
  }
 
  tbody.innerHTML = visible.map(({ ch, i: ci }) => {
    // Option-based lock (independent of user toggle state)
    const optLocked = (ch.type === "UPDATE" && mergeOptNoOverwrite)
                   || (ch.type === "REMOVE" && !mergeOptRemove);
    const locked = ch.missingId || ch.invalidId || ch.type === "NOCHANGE" || optLocked;
 
    let badge = { ADD:"badge-add", UPDATE:"badge-upd", REMOVE:"badge-rem", NOCHANGE:"badge-nochange" }[ch.type] || "badge-add";
    let label = { ADD:"PŘIDAT", UPDATE:"ZMĚNIT", REMOVE:"ODEBRAT", NOCHANGE:"BEZ ZMĚNY" }[ch.type] || "PŘIDAT";
    if (ch.missingId) { badge = "badge-missing"; label = "CHYBÍ ID"; }
    if (ch.invalidId) { badge = "badge-invalid"; label = "NEPLATNÉ ID"; }
 
    const baseClass = ch.type.toLowerCase() + "-row" + (locked || !ch.enabled ? " disabled" : "");
    const rowClass  = baseClass + (locked ? (ch.missingId || ch.invalidId ? " no-id-row" : " nochange-row") : "");
    const src = ch.type === "REMOVE" ? ch.existing : ch.incoming;
    const fmtVal = (v, field) => {
      if (field === "active") return v === true || v === "true" ? "Ano" : v === false || v === "false" ? "Ne" : String(v ?? "");
      if (field === "since" || field === "photoValidity") {
        const ts = parseDateToTs(v);
        return ts ? tsToDisplay(ts) : (v ? String(v) : "");
      }
      return String(v ?? "");
    };
    const cells = MERGE_COLS.map(col => {
      let content = esc(fmtVal(src ? (src[col.field] ?? "") : "", col.field));
      if (ch.type === "UPDATE" && ch.fields[col.field]) {
        const diff = ch.fields[col.field];
        content = `<span class="cell-old">${esc(fmtVal(diff.old, col.field))}</span>`+
                  `<span class="cell-changed">${esc(fmtVal(diff.new, col.field))}</span>`;
      }
      return `<td onclick="toggleMergeCell(event,${ci})">${content}</td>`;
    }).join("");
    const idReadonly = !ch.idEditable && (ch.type === "NOCHANGE" || (!ch.missingId && !ch.invalidId && ch.type !== "ADD"));
    const indicator = locked ? `<span style="color:#444">—</span>` : ch.enabled ? "✓" : "○";

    const canEditGender = ch.type !== "REMOVE" && !ch.missingId && !ch.invalidId;
    const genderCell = canEditGender
      ? `<td onclick="event.stopPropagation()" style="white-space:nowrap;text-align:center;padding:6px 8px">
          <span class="mg-btn ${ch.gender === 'male'   ? 'mg-male-on'   : 'mg-male-off'}"
                onclick="toggleMergeRowGender(${ci},'male')">♂</span>
          <span class="mg-btn ${ch.gender === 'female' ? 'mg-female-on' : 'mg-female-off'}"
                onclick="toggleMergeRowGender(${ci},'female')">♀</span>
        </td>`
      : `<td></td>`;
    return `<tr class="${rowClass}" onclick="toggleMergeRow(${ci})">
      <td><span class="type-badge ${badge}">${label}</span></td>
      <td onclick="event.stopPropagation()">
      <input class="merge-id-input"
              type="text"
              inputmode="numeric"
              maxlength="8"
              pattern="\\d*"
              value="${esc(ch.id)}"
              placeholder="8 číslic"
              ${idReadonly ? 'readonly style="opacity:.45;cursor:default"' : ''}
              oninput="editMergeId(${ci}, this.value)"
              onblur="renderMergeTable()" />
      </td>
      ${cells}
      ${genderCell}
      <td style="text-align:center;color:var(--text-muted)">${indicator}</td>
    </tr>`;
  }).join("");
}

function toggleMergeRow(ci) {
  const ch = mergeChanges[ci];
  const optLocked = (ch.type === "UPDATE" && mergeOptNoOverwrite)
                 || (ch.type === "REMOVE" && !mergeOptRemove);
  if (ch.missingId || ch.invalidId || ch.type === "NOCHANGE" || optLocked) return;
  ch.enabled = !ch.enabled;
  renderMergeTable();
}
function toggleMergeCell(event, ci) { event.stopPropagation(); toggleMergeRow(ci); }

function toggleMergeRowGender(ci, gender) {
  const ch = mergeChanges[ci];
  if (!ch) return;
  ch.gender = ch.gender === gender ? null : gender;
  _updateMergeGenderBtns(_inferGlobalGender());
  renderMergeTable();
}

function setAllMergeGender(gender) {
  mergeChanges.forEach(ch => {
    if (ch.type !== "REMOVE") ch.gender = gender;
  });
  _updateMergeGenderBtns(gender);
  renderMergeTable();
}

function _inferGlobalGender() {
  const actionable = mergeChanges.filter(ch => ch.type !== "REMOVE");
  if (!actionable.length) return null;
  const allMale   = actionable.every(ch => ch.gender === 'male');
  const allFemale = actionable.every(ch => ch.gender === 'female');
  const allNull   = actionable.every(ch => !ch.gender);
  if (allMale)   return 'male';
  if (allFemale) return 'female';
  if (allNull)   return null;
  return 'mixed';
}

function _updateMergeGenderBtns(activeGender) {
  const btnM = document.getElementById("mga-male");
  const btnF = document.getElementById("mga-female");
  const btnN = document.getElementById("mga-none");
  if (!btnM) return;
  btnM.classList.toggle("mga-male-on",   activeGender === 'male');
  btnM.classList.remove("mga-female-on");
  btnF.classList.toggle("mga-female-on", activeGender === 'female');
  btnF.classList.remove("mga-male-on");
  btnN.classList.toggle("mga-none-on",   !activeGender || activeGender === 'mixed' || activeGender === null);
}

function applyMerge() {
  const filename = mergeIncoming._filename || "";
  const maxUid = players.reduce((m, p) => Math.max(m, p._uid ?? 0), 0);
  let uidCounter = maxUid + 1;
  mergeChanges.filter(c => {
    if (!c.enabled) return false;
    if (c.type === "UPDATE" && mergeOptNoOverwrite) return false;
    if (c.type === "REMOVE" && !mergeOptRemove) return false;
    return true;
  }).forEach(ch => {
    if (ch.type === "ADD") {
      players.push({ ...ch.incoming, gender: ch.gender ?? null, _uid: uidCounter++, clubActive: true, comment: "" });
    } else if (ch.type === "UPDATE") {
      const idx = players.findIndex(p => p.id === ch.id);
      if (idx >= 0) {
        MERGE_FIELDS.forEach(f => { players[idx][f] = ch.incoming[f]; });
        players[idx].gender = ch.gender ?? players[idx].gender ?? null;
      }
    } else if (ch.type === "REMOVE") {
      players = players.filter(p => p.id !== ch.id);
    }
  });
  players.forEach((p, i) => { p._uid = i; });
  closeMergeModal();
  finishLoad(filename);
}

/* ══════════════════════════════════════════════════════
   IMPORT / EXPORT CONFIG
══════════════════════════════════════════════════════ */
function exportConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  saveFile(blob, "categories_config.json");
}

function importConfig(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      config = JSON.parse(e.target.result);
      localStorage.setItem("categories_config", JSON.stringify(config));
      currentSeason = Object.keys(config).sort()[0];
      selectedCategories = [];
      renderSeasonTabs();
      renderStatsGrid();
      renderFilterTags();
      renderTable(getFiltered());
    } catch { alert("Chyba při načítání JSON souboru."); }
    event.target.value = "";
  };
  reader.readAsText(file);
}

/* ══════════════════════════════════════════════════════
   CATEGORY EDITOR
══════════════════════════════════════════════════════ */
function openEditor() {
  editorSeason = currentSeason;
  if (!config[editorSeason]) editorSeason = Object.keys(config).sort()[0];
  renderEditorSeasons();
  renderEditorCats();
  document.getElementById("editor-overlay").classList.add("open");
}
function closeEditor() { document.getElementById("editor-overlay").classList.remove("open"); }

function saveEditor() {
  saveConfig();
  selectedCategories = selectedCategories.filter(c =>
    c === "__uncat__" || (config[currentSeason] || []).some(cat => cat.name === c)
  );
  renderSeasonTabs();
  renderStatsGrid();
  renderFilterTags();
  renderTable(getFiltered());
  closeEditor();
}

function renderEditorSeasons() {
  const bar = document.getElementById("editor-seasons-bar");
  const seasons = Object.keys(config).sort();
  const tabs = seasons.map(s => `
    <div class="editor-season-tab ${s === editorSeason ? "active" : ""}" onclick="switchEditorSeason('${s}')">
      ${s}<span class="editor-season-tab-remove" onclick="event.stopPropagation();removeSeason('${s}')">✕</span>
    </div>`).join("");
  bar.innerHTML = tabs + `<div id="add-season-form">
    <input id="new-season-input" type="number" placeholder="rok" min="2020" max="2040" />
    <button class="btn btn-secondary" onclick="addSeason()">+ přidat</button>
  </div>`;
}

function switchEditorSeason(s) {
  editorSeason = s;
  renderEditorSeasons();
  renderEditorCats();
}

function addSeason() {
  const val = document.getElementById("new-season-input").value.trim();
  if (!val || isNaN(val)) return;
  const yr = parseInt(val);
  if (config[yr]) { alert("Tato sezóna již existuje."); return; }
  const existingSeasons = Object.keys(config).map(Number).sort();
  const nearest = existingSeasons[existingSeasons.length - 1];
  const diff = yr - nearest;
  config[yr] = JSON.parse(JSON.stringify(config[nearest])).map(c => ({
    name: c.name, fromYear: c.fromYear + diff, toYear: c.toYear === null ? null : c.toYear + diff
  }));
  editorSeason = String(yr);
  renderEditorSeasons();
  renderEditorCats();
}

function removeSeason(s) {
  if (Object.keys(config).length <= 1) { alert("Musí existovat alespoň jedna sezóna."); return; }
  if (!confirm(`Smazat sezónu ${s}?`)) return;
  delete config[s];
  if (editorSeason === s) editorSeason = Object.keys(config).sort()[0];
  if (currentSeason === s) currentSeason = Object.keys(config).sort()[0];
  renderEditorSeasons();
  renderEditorCats();
}

function renderEditorCats() {
  const tbody = document.getElementById("editor-cats-body");
  const cats = config[editorSeason] || [];
  tbody.innerHTML = cats.map((cat, i) => `
    <tr id="cat-row-${i}">
      <td><input class="cat-name-input" value="${esc(cat.name)}" oninput="updateCatField(${i},'name',this.value)" /></td>
      <td><input class="year-input" type="number" value="${cat.fromYear}" oninput="updateCatField(${i},'fromYear',this.value)" /></td>
      <td><input class="year-input open-end" type="number" value="${cat.toYear ?? ""}" placeholder="∞" oninput="updateCatField(${i},'toYear',this.value)" /></td>
      <td><button class="del-btn" onclick="removeCat(${i})">✕</button></td>
    </tr>`).join("");
}

function updateCatField(i, field, value) {
  if (!config[editorSeason]) return;
  if (field === "name") config[editorSeason][i].name = value;
  else if (field === "fromYear") config[editorSeason][i].fromYear = parseInt(value) || 0;
  else if (field === "toYear") config[editorSeason][i].toYear = value === "" ? null : (parseInt(value) || null);
}

function commitEditorCats() {}

function addCategory() {
  if (!config[editorSeason]) config[editorSeason] = [];
  config[editorSeason].push({ name: "U?", fromYear: 2000, toYear: 2005 });
  renderEditorCats();
}

function removeCat(i) {
  config[editorSeason].splice(i, 1);
  renderEditorCats();
}

function clearAllData() {
  if (!confirm("Opravdu chcete vymazat všechna data včetně uložených v prohlížeči?")) return;
  localStorage.removeItem("roster_data");
  localStorage.removeItem("roster_filename");
  localStorage.removeItem("categories_config");
  players = [];
  searchTerm = "";
  selectedCategories = [];
  document.getElementById("search-input").value = "";
  renderStatsGrid();
  renderFilterTags();
  renderTable(players);
}

/* ══════════════════════════════════════════════════════
   CLICK OUTSIDE MODAL TO CLOSE
══════════════════════════════════════════════════════ */
document.getElementById("editor-overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("editor-overlay")) closeEditor();
});
document.getElementById("edit-overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("edit-overlay")) closeEditModal();
});
document.getElementById("merge-overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("merge-overlay")) closeMergeModal();
});
document.getElementById("info-overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("info-overlay")) closeInfoModal();
});

document.addEventListener("click", e => {
  if (hamburgerOpen &&
      !e.target.closest("#hamburger-menu") &&
      !e.target.closest("#hamburger-btn")) {
    closeHamburger();
  }
});
/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
init();