"use strict";

/* ============================================================
   Workshop QR-Code Generator
   - Reine Browser-App, Daten im localStorage
   - QR-Codes werden lokal (offline) erzeugt
   ============================================================ */

const STORAGE_KEY = "wqg.state.v1";
const SESSION_KEY = "wqg.session.v1";

const DEFAULTS = {
  workshops: [
    "Info – WS- Janusch VS",
    "Info – WS - MS",
    "Gefühle BiB",
    "Tonnenseite BiB",
  ],
  areas: [
    "Bruck-Mürzzuschlag",
    "Deutschlandsberg",
    "Graz-Umgebung",
    "Graz",
    "Hartberg-Fürstenfeld",
    "Leibnitz",
    "Liezen",
    "Murtal",
    "Murau",
    "Weiz",
    "Voitsberg",
    "Südoststeiermark",
  ],
  baseUrl: "https://www.umbuzoo.de/d/6a452bafc15cac0dea94c72e/",
  paramWorkshop: "workshop",
  paramArea: "area",
};

/* ---------------- State ---------------- */

let state = loadState();
const selected = { workshops: new Set(), areas: new Set() };
let lastCombos = []; // [{workshop, area, url}]

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        workshops: Array.isArray(parsed.workshops) ? parsed.workshops : DEFAULTS.workshops.slice(),
        areas: Array.isArray(parsed.areas) ? parsed.areas : DEFAULTS.areas.slice(),
        baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : DEFAULTS.baseUrl,
        paramWorkshop: parsed.paramWorkshop || DEFAULTS.paramWorkshop,
        paramArea: parsed.paramArea || DEFAULTS.paramArea,
      };
    }
  } catch (e) {
    console.warn("State konnte nicht geladen werden:", e);
  }
  return structuredCloneSafe(DEFAULTS);
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("State konnte nicht gespeichert werden:", e);
  }
}

/* ---------------- QR helpers (qrcode-generator) ---------------- */

function makeQr(text) {
  // typeNumber 0 = automatische Größe, Fehlerkorrektur 'M'
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr;
}

const QR_MARGIN = 4; // Ruhezone in Modulen

function qrToSvg(qr) {
  const count = qr.getModuleCount();
  const size = count + QR_MARGIN * 2;
  let path = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        path += `M${c + QR_MARGIN},${r + QR_MARGIN}h1v1h-1z`;
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `shape-rendering="crispEdges" role="img">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/></svg>`
  );
}

function qrToCanvas(qr, targetPx) {
  const count = qr.getModuleCount();
  const total = count + QR_MARGIN * 2;
  const cell = Math.max(1, Math.floor(targetPx / total));
  const px = total * cell;
  const cv = document.createElement("canvas");
  cv.width = px;
  cv.height = px;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = "#000000";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect((c + QR_MARGIN) * cell, (r + QR_MARGIN) * cell, cell, cell);
      }
    }
  }
  return cv;
}

/* ---------------- URL building ---------------- */

function buildUrl(workshop, area) {
  const base = (state.baseUrl || "").trim();
  const sep = base.includes("?") ? "&" : "?";
  const q =
    encodeURIComponent(state.paramWorkshop) +
    "=" +
    encodeURIComponent(workshop) +
    "&" +
    encodeURIComponent(state.paramArea) +
    "=" +
    encodeURIComponent(area);
  return base + sep + q;
}

/* ---------------- DOM refs ---------------- */

const el = {
  workshopList: document.getElementById("workshop-list"),
  areaList: document.getElementById("area-list"),
  manageWorkshops: document.getElementById("manage-workshops"),
  manageAreas: document.getElementById("manage-areas"),
  countInfo: document.getElementById("count-info"),
  btnGenerate: document.getElementById("btn-generate"),
  btnPrint: document.getElementById("btn-print"),
  btnPdf: document.getElementById("btn-pdf"),
  btnCsv: document.getElementById("btn-csv"),
  baseUrl: document.getElementById("base-url"),
  paramWorkshop: document.getElementById("param-workshop"),
  paramArea: document.getElementById("param-area"),
  btnReset: document.getElementById("btn-reset-data"),
  printArea: document.getElementById("print-area"),
  previewCard: document.getElementById("preview-card"),
  colsSelect: document.getElementById("cols-select"),
  showUrlToggle: document.getElementById("show-url-toggle"),
};

/* ---------------- Rendering: selection lists ---------------- */

function renderSelectionLists() {
  renderCheckboxList(el.workshopList, state.workshops, selected.workshops);
  renderCheckboxList(el.areaList, state.areas, selected.areas);
  updateCount();
}

function renderCheckboxList(container, items, selectedSet) {
  container.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "check-item";
    empty.style.color = "var(--ink-soft)";
    empty.textContent = "Noch keine Einträge – unten unter „verwalten“ hinzufügen.";
    container.appendChild(empty);
    return;
  }
  items.forEach((name) => {
    const label = document.createElement("label");
    label.className = "check-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selectedSet.has(name);
    cb.addEventListener("change", () => {
      if (cb.checked) selectedSet.add(name);
      else selectedSet.delete(name);
      updateCount();
    });

    const span = document.createElement("span");
    span.textContent = name;

    label.appendChild(cb);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function updateCount() {
  const w = selected.workshops.size;
  const a = selected.areas.size;
  const combos = w * a;
  if (combos === 0) {
    el.countInfo.textContent = "Keine Auswahl – bitte mindestens einen Workshop und einen Bezirk wählen.";
  } else {
    el.countInfo.textContent =
      `${w} Workshop(s) × ${a} Bezirk(e) = ${combos} QR-Code${combos === 1 ? "" : "s"}`;
  }
  el.btnGenerate.disabled = combos === 0;
  saveSession();
}

/* ---------------- Rendering: management lists ---------------- */

function renderManageLists() {
  renderManageList(el.manageWorkshops, "workshops");
  renderManageList(el.manageAreas, "areas");
}

function renderManageList(ul, key) {
  ul.innerHTML = "";
  state[key].forEach((name, idx) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = name;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "del-btn";
    del.title = "Löschen";
    del.setAttribute("aria-label", `„${name}“ löschen`);
    del.textContent = "×";
    del.addEventListener("click", () => {
      state[key].splice(idx, 1);
      selected[key].delete(name);
      saveState();
      renderManageLists();
      renderSelectionLists();
    });
    li.appendChild(span);
    li.appendChild(del);
    ul.appendChild(li);
  });
}

function addItem(key, value) {
  const name = (value || "").trim();
  if (!name) return false;
  if (state[key].some((x) => x.toLowerCase() === name.toLowerCase())) {
    return false; // Duplikat
  }
  state[key].push(name);
  saveState();
  renderManageLists();
  renderSelectionLists();
  return true;
}

/* ---------------- Settings ---------------- */

function initSettings() {
  el.baseUrl.value = state.baseUrl;
  el.paramWorkshop.value = state.paramWorkshop;
  el.paramArea.value = state.paramArea;

  el.baseUrl.addEventListener("input", () => {
    state.baseUrl = el.baseUrl.value;
    saveState();
  });
  el.paramWorkshop.addEventListener("input", () => {
    state.paramWorkshop = el.paramWorkshop.value || "workshop";
    saveState();
  });
  el.paramArea.addEventListener("input", () => {
    state.paramArea = el.paramArea.value || "area";
    saveState();
  });
}

/* ---------------- Generate & render QR cards ---------------- */

function getCombos() {
  const combos = [];
  const workshops = state.workshops.filter((w) => selected.workshops.has(w));
  const areas = state.areas.filter((a) => selected.areas.has(a));
  workshops.forEach((w) => {
    areas.forEach((a) => {
      combos.push({ workshop: w, area: a, url: buildUrl(w, a) });
    });
  });
  return combos;
}

function generate() {
  const combos = getCombos();
  if (combos.length === 0) return;
  lastCombos = combos;

  renderCards(lastCombos, el.showUrlToggle.checked);
  showResultUI();
  saveSession();

  el.previewCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCards(combos, showUrl) {
  el.printArea.innerHTML = "";

  combos.forEach(({ workshop, area, url }) => {
    const qr = makeQr(url);

    const card = document.createElement("div");
    card.className = "qr-card";

    ["tl", "tr", "bl", "br"].forEach((pos) => {
      const cm = document.createElement("span");
      cm.className = "cm cm-" + pos;
      card.appendChild(cm);
    });

    const holder = document.createElement("div");
    holder.className = "qr-holder";
    holder.innerHTML = qrToSvg(qr);

    const labels = document.createElement("div");
    labels.className = "labels";
    const lw = document.createElement("div");
    lw.className = "lbl-workshop";
    lw.textContent = workshop;
    const la = document.createElement("div");
    la.className = "lbl-area";
    la.textContent = area;
    labels.appendChild(lw);
    labels.appendChild(la);
    if (showUrl) {
      const urlRow = document.createElement("div");
      urlRow.className = "url-row";

      const link = document.createElement("a");
      link.className = "lbl-url";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = url;
      link.title = "Link in neuem Tab öffnen";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-btn no-print";
      copyBtn.textContent = "Kopieren";
      copyBtn.title = "URL in die Zwischenablage kopieren";
      copyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        copyToClipboard(url, copyBtn);
      });

      urlRow.appendChild(link);
      urlRow.appendChild(copyBtn);
      labels.appendChild(urlRow);
    }

    card.appendChild(holder);
    card.appendChild(labels);
    el.printArea.appendChild(card);
  });
}

function showResultUI() {
  el.previewCard.hidden = false;
  el.btnPrint.disabled = false;
  el.btnPdf.disabled = false;
  el.btnCsv.disabled = false;
}

/* ---------------- Session (gespeichertes Ergebnis) ---------------- */

function saveSession() {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        workshops: [...selected.workshops],
        areas: [...selected.areas],
        cols: el.colsSelect.value,
        showUrl: el.showUrlToggle.checked,
        combos: lastCombos,
      })
    );
  } catch (e) {
    console.warn("Session konnte nicht gespeichert werden:", e);
  }
}

function restoreSession() {
  let s = null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) s = JSON.parse(raw);
  } catch (e) {
    console.warn("Session konnte nicht geladen werden:", e);
  }
  if (!s) return;

  (s.workshops || []).forEach((n) => {
    if (state.workshops.includes(n)) selected.workshops.add(n);
  });
  (s.areas || []).forEach((n) => {
    if (state.areas.includes(n)) selected.areas.add(n);
  });
  if (s.cols) el.colsSelect.value = String(s.cols);
  if (typeof s.showUrl === "boolean") el.showUrlToggle.checked = s.showUrl;
  if (Array.isArray(s.combos)) lastCombos = s.combos;
}

function clearSession() {
  lastCombos = [];
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    /* ignore */
  }
}

function setCols(n) {
  el.printArea.classList.remove("cols-2", "cols-3", "cols-4");
  el.printArea.classList.add("cols-" + n);
}

/* ---------------- PDF export (jsPDF) ---------------- */

function exportPdf() {
  if (lastCombos.length === 0) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 34; // ~12mm
  const usableW = pageW - 2 * margin;
  const usableH = pageH - 2 * margin;

  const cols = parseInt(el.colsSelect.value, 10) || 3;
  const cellW = usableW / cols;
  const cellH = cellW * 1.4;
  const rows = Math.max(1, Math.floor(usableH / cellH));
  const perPage = cols * rows;

  const showUrl = el.showUrlToggle.checked;
  const gutter = 10;

  lastCombos.forEach((combo, idx) => {
    const posOnPage = idx % perPage;
    if (idx > 0 && posOnPage === 0) doc.addPage();

    const row = Math.floor(posOnPage / cols);
    const col = posOnPage % cols;

    const x0 = margin + col * cellW;
    const y0 = margin + row * cellH;

    // Innenbox (mit Rinne), Schnittmarken an deren Ecken
    const bx = x0 + gutter / 2;
    const by = y0 + gutter / 2;
    const bw = cellW - gutter;
    const bh = cellH - gutter;

    drawCropMarks(doc, bx, by, bw, bh);

    // QR-Code
    const qr = makeQr(combo.url);
    const qrSize = Math.min(bw - 12, bh * 0.6);
    const qx = bx + (bw - qrSize) / 2;
    const qy = by + 6;
    const canvas = qrToCanvas(qr, Math.round(qrSize * 3));
    doc.addImage(canvas.toDataURL("image/png"), "PNG", qx, qy, qrSize, qrSize);

    // Text
    const cx = bx + bw / 2;
    let ty = qy + qrSize + 14;
    const maxTextW = bw - 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 30, 45);
    doc.splitTextToSize(combo.workshop, maxTextW).forEach((line) => {
      doc.text(line, cx, ty, { align: "center" });
      ty += 11;
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 90, 105);
    doc.splitTextToSize(combo.area, maxTextW).forEach((line) => {
      doc.text(line, cx, ty, { align: "center" });
      ty += 10;
    });

    if (showUrl) {
      doc.setFontSize(5.2);
      doc.setTextColor(120, 130, 145);
      doc.splitTextToSize(combo.url, maxTextW).forEach((line) => {
        doc.text(line, cx, ty, { align: "center" });
        ty += 6.5;
      });
    }
  });

  doc.save("workshop-qr-codes.pdf");
}

function drawCropMarks(doc, x0, y0, w, h) {
  const off = 3;
  const len = 8;
  const l = x0;
  const r = x0 + w;
  const t = y0;
  const b = y0 + h;
  doc.setLineWidth(0.4);
  doc.setDrawColor(0, 0, 0);

  // oben links
  doc.line(l - off, t, l - off - len, t);
  doc.line(l, t - off, l, t - off - len);
  // oben rechts
  doc.line(r + off, t, r + off + len, t);
  doc.line(r, t - off, r, t - off - len);
  // unten links
  doc.line(l - off, b, l - off - len, b);
  doc.line(l, b + off, l, b + off + len);
  // unten rechts
  doc.line(r + off, b, r + off + len, b);
  doc.line(r, b + off, r, b + off + len);
}

/* ---------------- CSV export ---------------- */

function exportCsv() {
  if (lastCombos.length === 0) return;
  const rows = [["workshop", "area", "url"]];
  lastCombos.forEach((c) => rows.push([c.workshop, c.area, c.url]));
  const csv = rows
    .map((r) => r.map(csvCell).join(";"))
    .join("\r\n");
  // BOM, damit Excel Umlaute korrekt erkennt
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "workshop-urls.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/* ---------------- Clipboard ---------------- */

function copyToClipboard(text, btn) {
  const done = () => flashCopied(btn);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    done();
  } catch (e) {
    console.warn("Kopieren fehlgeschlagen:", e);
  }
  document.body.removeChild(ta);
}

function flashCopied(btn) {
  if (!btn) return;
  const prev = btn.dataset.label || btn.textContent;
  btn.dataset.label = prev;
  btn.textContent = "Kopiert!";
  btn.classList.add("copied");
  clearTimeout(btn._copyTimer);
  btn._copyTimer = setTimeout(() => {
    btn.textContent = btn.dataset.label;
    btn.classList.remove("copied");
  }, 1400);
}

function csvCell(v) {
  const s = String(v);
  if (/[";\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/* ---------------- Wiring ---------------- */

function initEvents() {
  el.btnGenerate.addEventListener("click", generate);
  el.btnPrint.addEventListener("click", () => window.print());
  el.btnPdf.addEventListener("click", exportPdf);
  el.btnCsv.addEventListener("click", exportCsv);

  document.querySelectorAll("[data-select-all]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-select-all");
      state[key].forEach((n) => selected[key].add(n));
      renderSelectionLists();
    });
  });
  document.querySelectorAll("[data-select-none]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-select-none");
      selected[key].clear();
      renderSelectionLists();
    });
  });

  document.querySelectorAll(".add-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const key = form.getAttribute("data-add");
      const input = form.querySelector("input");
      const ok = addItem(key, input.value);
      if (ok) {
        input.value = "";
        input.focus();
      } else {
        input.select();
      }
    });
  });

  el.colsSelect.addEventListener("change", () => {
    setCols(el.colsSelect.value);
    saveSession();
  });
  el.showUrlToggle.addEventListener("change", () => {
    if (lastCombos.length) renderCards(lastCombos, el.showUrlToggle.checked);
    saveSession();
  });

  el.btnReset.addEventListener("click", () => {
    if (!confirm("Wirklich alle Workshops, Bezirke und Einstellungen auf den Standard zurücksetzen?")) return;
    state = structuredCloneSafe(DEFAULTS);
    selected.workshops.clear();
    selected.areas.clear();
    clearSession();
    saveState();
    initSettings();
    renderSelectionLists();
    renderManageLists();
    el.printArea.innerHTML = "";
    el.previewCard.hidden = true;
    el.btnPrint.disabled = true;
    el.btnPdf.disabled = true;
    el.btnCsv.disabled = true;
  });
}

/* ---------------- Boot ---------------- */

function init() {
  initSettings();
  restoreSession();
  renderSelectionLists();
  renderManageLists();
  initEvents();
  setCols(el.colsSelect.value);

  if (lastCombos.length) {
    renderCards(lastCombos, el.showUrlToggle.checked);
    showResultUI();
  }
}

document.addEventListener("DOMContentLoaded", init);
