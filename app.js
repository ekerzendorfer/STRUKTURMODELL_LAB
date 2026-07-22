/* KI-Strukturmodell-Labor v0.3.1
   Schlanke GitHub-Pages-Webapp mit 3Dmol.js und datengetriebener Struktur.
   v0.3.1: bereitet lokale PDB-Dateien für Standardvergleiche und externe ColabFold-Erzeugung vor. */

const APP_VERSION = "0.3.1";
let examplesData = null;
let currentExample = null;
let currentView = "overlay";
let viewer = null;
let loadedModels = {};
let uploadedPdb = null;
let lastDiffResidues = [];
let lastAlignmentStats = null;
let viewerBackgroundMode = "dark";
let representationMode = "cartoon";
const afdbCache = new Map();

const els = {
  cards: document.getElementById("exampleCards"),
  info: document.getElementById("exampleInfo"),
  viewerShell: document.getElementById("viewerShell"),
  viewer: document.getElementById("viewer"),
  status: document.getElementById("status"),
  viewerHint: document.getElementById("viewerHint"),
  reloadBtn: document.getElementById("reloadBtn"),
  questions: document.getElementById("questions"),
  takeaway: document.getElementById("takeaway"),
  showPrediction: document.getElementById("showPrediction"),
  showExperiment: document.getElementById("showExperiment"),
  showDifferenceResidues: document.getElementById("showDifferenceResidues"),
  showHetero: document.getElementById("showHetero"),
  viewerBackground: document.getElementById("viewerBackground"),
  representationMode: document.getElementById("representationMode"),
  pdbUpload: document.getElementById("pdbUpload"),
  clearUploadBtn: document.getElementById("clearUploadBtn"),
  observationPrompts: document.getElementById("observationPrompts"),
  modelLimit: document.getElementById("modelLimit"),
  generateProtocolBtn: document.getElementById("generateProtocolBtn"),
  copyProtocolBtn: document.getElementById("copyProtocolBtn"),
  protocolOutput: document.getElementById("protocolOutput")
};

init();

async function init() {
  try {
    setStatus("Lade Beispiele …");
    const response = await fetch(`data/examples.json?v=${APP_VERSION}&t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`examples.json konnte nicht geladen werden (${response.status})`);
    examplesData = await response.json();
    renderCards(examplesData.examples || []);
    wireEvents();
    if (examplesData.examples?.length) selectExample(examplesData.examples[0].id);
  } catch (err) {
    setStatus(`Fehler beim Start: ${err.message}\n\nTipp: lokal bitte über einen kleinen Webserver starten, z. B. python -m http.server 8000`, "warn");
  }
}

function wireEvents() {
  document.querySelectorAll(".viewBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view;
      document.querySelectorAll(".viewBtn").forEach(b => b.classList.toggle("active", b === btn));
      updateCheckboxesForView();
      loadCurrentExample();
    });
  });
  [els.showPrediction, els.showExperiment, els.showDifferenceResidues, els.showHetero].filter(Boolean).forEach(el => {
    el.addEventListener("change", () => loadCurrentExample());
  });
  els.viewerBackground.addEventListener("change", () => {
    viewerBackgroundMode = els.viewerBackground.value;
    applyViewerBackground();
    loadCurrentExample(true);
  });
  els.representationMode.addEventListener("change", () => {
    representationMode = els.representationMode.value;
    loadCurrentExample();
  });
  els.reloadBtn.addEventListener("click", () => loadCurrentExample(true));
  els.pdbUpload.addEventListener("change", handleUpload);
  els.clearUploadBtn.addEventListener("click", () => {
    uploadedPdb = null;
    els.pdbUpload.value = "";
    loadCurrentExample();
  });
  els.generateProtocolBtn?.addEventListener("click", generateProtocolText);
  els.copyProtocolBtn?.addEventListener("click", copyProtocolText);
}

function renderCards(examples) {
  els.cards.innerHTML = "";
  for (const ex of examples) {
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    card.dataset.id = ex.id;
    card.innerHTML = `
      <h3>${escapeHtml(ex.title)}</h3>
      <p class="subtitle">${escapeHtml(ex.subtitle || "")}</p>
      <span class="badge">${escapeHtml(ex.level || "")}</span>
      <span class="badge status-badge">${escapeHtml(ex.status || "")}</span>
    `;
    card.addEventListener("click", () => selectExample(ex.id));
    els.cards.appendChild(card);
  }
}

function selectExample(id) {
  currentExample = examplesData.examples.find(e => e.id === id);
  uploadedPdb = null;
  els.pdbUpload.value = "";
  document.querySelectorAll(".card").forEach(c => c.classList.toggle("active", c.dataset.id === id));
  renderExampleInfo(currentExample);
  renderQuestions(currentExample);
  renderGuidance(currentExample);
  if (els.protocolOutput) els.protocolOutput.value = "";
  currentView = currentExample.views?.overlay ? "overlay" : "experiment";
  document.querySelectorAll(".viewBtn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === currentView));
  updateCheckboxesForView();
  loadCurrentExample(true);
}

function renderExampleInfo(ex) {
  const sources = (ex.sources || []).map(s => `<li><a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a></li>`).join("");
  const localNote = ex.local_note ? `<p class="soft-note">${escapeHtml(ex.local_note)}</p>` : "";
  const colabLink = ex.colab_url ? `<p class="tool-link-row"><a class="tool-link" href="${escapeAttr(ex.colab_url)}" target="_blank" rel="noopener">ColabFold-Notebook öffnen</a><span class="tool-link-note">optional: KI-Modell selbst erzeugen und als PDB importieren</span></p>` : "";
  els.info.innerHTML = `
    <h2>2. Leitfrage: ${escapeHtml(ex.title)}</h2>
    <p>${escapeHtml(ex.intro || "")}</p>
    <p class="core">${escapeHtml(ex.core_message || "")}</p>
    ${ex.sequence ? `<p><strong>Sequenz:</strong> <code>${escapeHtml(ex.sequence)}</code></p>` : ""}
    ${colabLink}
    ${localNote}
    ${sources ? `<details><summary>Quellen / Struktur-IDs</summary><ul>${sources}</ul></details>` : ""}
  `;
}

function renderQuestions(ex) {
  els.questions.innerHTML = "";
  (ex.questions || []).forEach(q => {
    const li = document.createElement("li");
    li.textContent = q;
    els.questions.appendChild(li);
  });
  els.takeaway.textContent = ex.takeaway || "";
}

function renderGuidance(ex) {
  if (!els.observationPrompts || !els.modelLimit) return;
  els.observationPrompts.innerHTML = "";
  const prompts = ex.observation_prompts || [
    "Betrachte zuerst die Gesamtform der Struktur.",
    "Wechsle zwischen Bänder- und Detaildarstellung und beschreibe, welche Information zusätzlich sichtbar wird.",
    "Formuliere eine Modellgrenze: Was zeigt diese Struktur gut, was nicht?"
  ];
  prompts.forEach(prompt => {
    const li = document.createElement("li");
    li.textContent = prompt;
    els.observationPrompts.appendChild(li);
  });
  els.modelLimit.textContent = ex.model_limit || "Für dieses Beispiel ist noch keine eigene Modellgrenze hinterlegt.";
}

function generateProtocolText() {
  if (!currentExample || !els.protocolOutput) return;
  const activeStructures = Object.values(loadedModels).map(entry => entry.struct?.label || "geladene Struktur");
  const viewLabel = {
    prediction: "KI-Modell",
    experiment: "Experiment",
    overlay: "Overlay",
    differences: "Unterschiede"
  }[currentView] || currentView;
  const prompts = (currentExample.observation_prompts || []).map((p, i) => `${i + 1}. ${p}`).join("\n");
  const questions = (currentExample.questions || []).map((q, i) => `${i + 1}. ${q}`).join("\n");
  const alignment = lastAlignmentStats
    ? `\nÜberlagerung: ${lastAlignmentStats.pairCount} gemeinsame Cα-Paare; RMSD ca. ${lastAlignmentStats.rmsd.toFixed(2)} Å.\nAuffällige Bereiche: ${lastDiffResidues.length ? lastDiffResidues.join(", ") : "keine oberhalb der eingestellten Schwelle"}.`
    : "";

  els.protocolOutput.value = `KI-Strukturmodell-Labor – Protokollhilfe\n\nBeispiel: ${currentExample.title}\nNiveau: ${currentExample.level || ""}\nKernaussage: ${currentExample.core_message || ""}\n\nSequenz:\n${currentExample.sequence || "nicht hinterlegt"}\n\nAktuelle Ansicht: ${viewLabel}\nGeladene Struktur(en): ${activeStructures.length ? activeStructures.join(" | ") : "keine"}${alignment}\n\nBeobachtungsauftrag:\n${prompts || "keine Beobachtungsaufträge hinterlegt"}\n\nLeitfragen:\n${questions || "keine Leitfragen hinterlegt"}\n\nModellgrenze:\n${currentExample.model_limit || "noch nicht hinterlegt"}\n\nEigene Beobachtung:\n- \n\nBegründete Aussage:\nDieses Beispiel zeigt, dass ...\n\nMerksatz / Takeaway:\n${currentExample.takeaway || currentExample.protocol_focus || ""}\n`;
}

async function copyProtocolText() {
  if (!els.protocolOutput) return;
  if (!els.protocolOutput.value.trim()) generateProtocolText();
  try {
    await navigator.clipboard.writeText(els.protocolOutput.value);
    setStatus("Protokolltext in die Zwischenablage kopiert.", "ok");
  } catch (err) {
    els.protocolOutput.focus();
    els.protocolOutput.select();
    setStatus("Kopieren per Browser nicht erlaubt. Der Protokolltext ist markiert und kann mit Strg+C kopiert werden.", "warn");
  }
}

function updateCheckboxesForView() {
  const supportsPrediction = currentExample?.views?.prediction;
  const supportsExperiment = currentExample?.views?.experiment;
  els.showPrediction.disabled = !supportsPrediction && !uploadedPdb;
  els.showExperiment.disabled = !supportsExperiment;

  if (currentView === "prediction") {
    els.showPrediction.checked = true;
    els.showExperiment.checked = false;
  } else if (currentView === "experiment") {
    els.showPrediction.checked = false;
    els.showExperiment.checked = true;
  } else if (currentView === "overlay" || currentView === "differences") {
    els.showPrediction.checked = supportsPrediction || !!uploadedPdb;
    els.showExperiment.checked = supportsExperiment;
  }
}

async function loadCurrentExample(force = false) {
  if (!currentExample) return;
  if (force && viewer) {
    viewer = null;
    resetViewerDom();
  }
  ensureViewer();
  viewer.clear();
  loadedModels = {};
  lastDiffResidues = [];
  lastAlignmentStats = null;

  const statusLines = [];
  const warnLines = [];
  const structures = currentExample.structures || [];
  const expStruct = structures.find(s => s.role === "experiment" && !s.disabled);
  const predStruct = structures.find(s => s.role === "prediction" && !s.disabled);

  let expPdb = null;
  let predPdb = null;

  if (els.showExperiment.checked && expStruct) {
    try {
      expPdb = await loadStructureText(expStruct);
      expPdb = preprocessPdb(expPdb, expStruct);
      const expModel = viewer.addModel(expPdb, "pdb");
      applyModelStyle(expModel, expStruct, "experiment");
      loadedModels.experiment = { model: expModel, pdb: expPdb, struct: expStruct };
      statusLines.push(`Experiment geladen: ${expStruct.label}`);
    } catch (err) {
      warnLines.push(`Experiment nicht geladen: ${err.message}`);
    }
  }

  if (els.showPrediction.checked && predStruct) {
    try {
      predPdb = await loadStructureText(predStruct);
      predPdb = preprocessPdb(predPdb, predStruct);
      if (expPdb && predStruct.alignTo) {
        const alignment = alignMobileToReference(predPdb, expPdb, currentExample.differenceThreshold || 2.0);
        predPdb = alignment.pdb;
        lastDiffResidues = alignment.diffResidues;
        lastAlignmentStats = alignment;
        statusLines.push(`KI-Modell überlagert: ${alignment.pairCount} Cα-Paare; RMSD ≈ ${alignment.rmsd.toFixed(2)} Å; auffällige Bereiche: ${lastDiffResidues.length ? lastDiffResidues.join(", ") : "keine > " + (currentExample.differenceThreshold || 2.0) + " Å"}`);
      }
      const predModel = viewer.addModel(predPdb, "pdb");
      applyModelStyle(predModel, predStruct, "prediction");
      loadedModels.prediction = { model: predModel, pdb: predPdb, struct: predStruct };
      statusLines.push(`KI-Modell geladen: ${predStruct.label}`);
    } catch (err) {
      warnLines.push(`KI-Modell nicht geladen: ${err.message}`);
      if (predStruct.note) warnLines.push(predStruct.note);
    }
  }

  if (els.showPrediction.checked && uploadedPdb) {
    try {
      let own = uploadedPdb;
      if (expPdb) {
        const alignment = alignMobileToReference(own, expPdb, currentExample.differenceThreshold || 2.0);
        own = alignment.pdb;
        statusLines.push(`Eigenes PDB überlagert: ${alignment.pairCount} Cα-Paare; RMSD ≈ ${alignment.rmsd.toFixed(2)} Å.`);
      }
      const ownModel = viewer.addModel(own, "pdb");
      ownModel.setStyle({}, buildRepresentationStyle("#7B1FA2", 0.82));
      loadedModels.upload = { model: ownModel, pdb: own, struct: { label: "Eigenes PDB" } };
    } catch (err) {
      warnLines.push(`Eigenes PDB konnte nicht geladen/überlagert werden: ${err.message}`);
    }
  }

  if (currentView === "differences" && els.showDifferenceResidues.checked) {
    highlightDifferences();
  }

  if (!Object.keys(loadedModels).length) {
    showEmptyViewerNotice();
    const disabledPred = structures.find(s => s.role === "prediction" && s.disabled);
    if (disabledPred) warnLines.push(disabledPred.note);
  } else {
    if (typeof viewer.resize === "function") viewer.resize();
    viewer.zoomTo();
    viewer.render();
  }

  els.viewerHint.textContent = `${currentExample.title}: ${currentExample.core_message}`;
  const msg = [...statusLines, ...warnLines].join("\n") || "Bereit.";
  setStatus(msg, warnLines.length ? "warn" : "ok");
}

function resetViewerDom() {
  cleanupStray3DmolNodes();
  els.viewerShell.innerHTML = '<div id="viewer" class="mol-viewer-target"></div>';
  els.viewer = document.getElementById("viewer");
}

function ensureViewer() {
  if (!els.viewer || !els.viewerShell.contains(els.viewer)) resetViewerDom();
  normalizeViewerDom();
  if (!viewer) {
    cleanupStray3DmolNodes();
    els.viewer.innerHTML = "";
    const target = window.jQuery ? window.jQuery(els.viewer) : els.viewer;
    viewer = $3Dmol.createViewer(target, { backgroundColor: getViewerBackgroundColor() });
    normalizeViewerDom();
  }
  normalizeViewerDom();
  applyViewerBackground();
  if (viewer && typeof viewer.resize === "function") viewer.resize();
}

function getViewerBackgroundColor() {
  return viewerBackgroundMode === "light" ? "#e5e7eb" : "#111827";
}

function applyViewerBackground() {
  const color = getViewerBackgroundColor();
  if (els.viewerShell) {
    els.viewerShell.style.backgroundColor = color;
    els.viewerShell.classList.toggle("viewer-light", viewerBackgroundMode === "light");
  }
  if (els.viewer) els.viewer.style.backgroundColor = color;
  if (viewer && typeof viewer.setBackgroundColor === "function") {
    viewer.setBackgroundColor(color);
  }
}

function normalizeViewerDom() {
  if (!els.viewerShell || !els.viewer) return;
  Object.assign(els.viewerShell.style, {
    position: "relative",
    overflow: "hidden",
    isolation: "isolate"
  });
  Object.assign(els.viewer.style, {
    position: "absolute",
    left: "0px",
    top: "0px",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: getViewerBackgroundColor()
  });
  els.viewer.querySelectorAll("div, canvas").forEach(node => {
    Object.assign(node.style, {
      position: "absolute",
      left: "0px",
      top: "0px",
      width: "100%",
      height: "100%",
      maxWidth: "none",
      maxHeight: "none"
    });
  });
}

function cleanupStray3DmolNodes() {
  const shell = document.getElementById("viewerShell");
  if (!shell) return;
  document.querySelectorAll("body > div, body > canvas").forEach(node => {
    if (shell.contains(node)) return;
    const hasCanvas = node.tagName === "CANVAS" || node.querySelector?.("canvas");
    if (!hasCanvas) return;
    const style = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const looksLikeFloatingViewer =
      (style.position === "absolute" || style.position === "fixed") &&
      rect.width > 250 && rect.height > 180;
    if (looksLikeFloatingViewer) node.remove();
  });
}

function showEmptyViewerNotice() {
  ensureViewer();
  viewer.clear();
  viewer.addLabel("Keine Struktur für diese Ansicht geladen", {
    position: { x: 0, y: 0, z: 0 },
    backgroundColor: "white",
    fontColor: "black",
    fontSize: 18,
    borderThickness: 1
  });
  if (typeof viewer.resize === "function") viewer.resize();
  viewer.zoomTo();
  viewer.render();
}

async function loadStructureText(struct) {
  if (struct.source === "placeholder") throw new Error(struct.note || "Struktur noch nicht hinterlegt.");

  if (struct.source === "local_optional") {
    try {
      return await fetchTextWithFallback([struct.file].filter(Boolean));
    } catch (err) {
      throw new Error(struct.missingFileHint || `${struct.file || "Lokale Datei"} nicht gefunden. Erzeuge die PDB-Datei extern und lege sie im Repo ab.`);
    }
  }

  if (struct.source === "local") {
    return await fetchTextWithFallback([struct.file, struct.url, struct.fallbackUrl].filter(Boolean));
  }

  if (struct.source === "alphafold_api") {
    const url = await resolveAlphaFoldPdbUrl(struct.uniprot, struct.entryId);
    return await fetchTextWithFallback([url, struct.url, struct.fallbackUrl].filter(Boolean));
  }

  return await fetchTextWithFallback([struct.url, struct.fallbackUrl].filter(Boolean));
}

async function fetchTextWithFallback(urls) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error(`${url} (${res.status})`);
      return await res.text();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Keine Struktur-URL angegeben.");
}

async function resolveAlphaFoldPdbUrl(uniprot, preferredEntryId = null) {
  if (!uniprot) throw new Error("AlphaFold-DB-Zugriff ohne UniProt-ID.");
  const cacheKey = `${uniprot}|${preferredEntryId || ""}`;
  if (afdbCache.has(cacheKey)) return afdbCache.get(cacheKey);

  const endpoints = [
    `https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(uniprot)}`,
    `https://www.alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(uniprot)}`
  ];

  let data = null;
  let lastErr = null;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(`${endpoint} (${res.status})`);
      data = await res.json();
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!data) throw lastErr || new Error(`AlphaFold-DB-API für ${uniprot} nicht erreichbar.`);

  const records = Array.isArray(data) ? data : (data.results || data.predictions || [data]);
  if (!records.length) throw new Error(`AlphaFold-DB-API liefert keinen Eintrag für ${uniprot}.`);

  let rec = records[0];
  if (preferredEntryId) {
    rec = records.find(r => r.entryId === preferredEntryId || r.modelId === preferredEntryId || r.alphafoldAccession === preferredEntryId) || rec;
  }

  const url = rec.pdbUrl || rec.pdb_url || rec.pdb || rec.structureUrl || rec.structure_url;
  if (!url) {
    throw new Error(`AlphaFold-DB-API liefert für ${uniprot} keinen direkt nutzbaren PDB-Link. Später lokales PDB verwenden.`);
  }
  afdbCache.set(cacheKey, url);
  return url;
}

function preprocessPdb(pdb, struct) {
  let lines = pdb.split(/\r?\n/);

  if (struct.modelNumber) {
    lines = extractModel(lines, struct.modelNumber);
  }
  if (struct.chain) {
    lines = filterChain(lines, struct.chain);
  }
  if (struct.residueRange) {
    lines = filterResidueRange(lines, struct.residueRange[0], struct.residueRange[1]);
  }

  // Kristallwasser stört in diesem didaktischen Viewer meist mehr, als es hilft.
  // Es erscheint sonst als viele einzelne Kugeln im Bändermodell.
  if (struct.stripWater !== false) {
    lines = filterWater(lines);
  }
  return lines.join("\n") + "\n";
}

function filterWater(lines) {
  const waterNames = new Set(["HOH", "WAT", "H2O", "DOD", "SOL"]);
  return lines.filter(line => {
    if (!line.startsWith("HETATM")) return true;
    const resn = line.slice(17, 20).trim().toUpperCase();
    return !waterNames.has(resn);
  });
}

function extractModel(lines, modelNumber) {
  let active = false;
  let inModels = false;
  const out = [];
  for (const line of lines) {
    if (line.startsWith("MODEL")) {
      inModels = true;
      const n = parseInt(line.slice(10).trim(), 10);
      active = n === modelNumber;
      if (active) out.push(line);
      continue;
    }
    if (line.startsWith("ENDMDL")) {
      if (active) out.push(line);
      active = false;
      continue;
    }
    if (!inModels || active || line.startsWith("HEADER") || line.startsWith("TITLE") || line.startsWith("REMARK")) out.push(line);
  }
  return out;
}

function filterChain(lines, chain) {
  return lines.filter(line => {
    if (!isAtomLine(line)) return true;
    return line[21] === chain;
  });
}

function filterResidueRange(lines, start, end) {
  return lines.filter(line => {
    if (!isAtomLine(line)) return true;
    const resi = parseInt(line.slice(22, 26).trim(), 10);
    return resi >= start && resi <= end;
  });
}

function isAtomLine(line) { return line.startsWith("ATOM") || line.startsWith("HETATM"); }

function applyModelStyle(model, struct, role) {
  const color = struct.color || (role === "experiment" ? "#2E7D32" : "#EF6C00");
  const opacity = role === "experiment" ? 0.82 : 0.9;

  // Standardmäßig wird nur das Protein selbst dargestellt. HETATM-Datensätze
  // enthalten in Kristallstrukturen oft viele Wassermoleküle; diese würden im
  // Bändermodell als verstreute Kugeln erscheinen und didaktisch verwirren.
  if (representationMode === "backbone_stick") {
    model.setStyle({ hetflag: false, atom: ["N", "CA", "C", "O"] }, buildRepresentationStyle(color, opacity));
  } else {
    model.setStyle({ hetflag: false }, buildRepresentationStyle(color, opacity));
  }

  if (els.showHetero?.checked) {
    model.setStyle({ hetflag: true }, buildHeteroStyle(color));
  }
}

function buildRepresentationStyle(color, opacity) {
  // Für Gesamtvergleiche bleiben Cartoon/Bänder in Modellfarben
  // (Experiment/KI-Modell) gut unterscheidbar. Atomnahe Darstellungen
  // verwenden dagegen gebräuchliche Elementfarben nach Jmol/CPK-Schema:
  // C grau, O rot, N blau, S gelb/orange usw.
  const atomStick = { colorscheme: "Jmol", radius: 0.14, opacity };
  const atomLine = { colorscheme: "Jmol", opacity };
  const atomSphere = { colorscheme: "Jmol", scale: 0.92, opacity };

  switch (representationMode) {
    case "cartoon_stick":
      return {
        cartoon: { color, opacity },
        stick: { colorscheme: "Jmol", radius: 0.10, opacity: Math.min(1, opacity + 0.08) }
      };
    case "backbone_stick":
      return { stick: { colorscheme: "Jmol", radius: 0.16, opacity } };
    case "stick":
      return { stick: atomStick };
    case "line":
      return { line: atomLine };
    case "sphere":
      return { sphere: atomSphere };
    case "cartoon":
    default:
      return { cartoon: { color, opacity } };
  }
}

function buildHeteroStyle(color) {
  return {
    stick: { colorscheme: "Jmol", radius: 0.18, opacity: 0.9 },
    sphere: { colorscheme: "Jmol", scale: 0.35, opacity: 0.9 }
  };
}

function highlightDifferences() {
  if (!lastDiffResidues.length || !loadedModels.prediction) return;
  const style = buildRepresentationStyle("#D32F2F", 1.0);
  loadedModels.prediction.model.setStyle({ hetflag: false, resi: lastDiffResidues }, style);
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    uploadedPdb = String(reader.result || "");
    currentView = "overlay";
    document.querySelectorAll(".viewBtn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === currentView));
    updateCheckboxesForView();
    loadCurrentExample();
  };
  reader.readAsText(file);
}

function parseAtoms(pdb) {
  const atoms = [];
  const lines = pdb.split(/\r?\n/);
  for (const line of lines) {
    if (!isAtomLine(line)) continue;
    atoms.push({
      line,
      atom: line.slice(12, 16).trim(),
      resn: line.slice(17, 20).trim(),
      chain: line[21],
      resi: parseInt(line.slice(22, 26).trim(), 10),
      x: parseFloat(line.slice(30, 38)),
      y: parseFloat(line.slice(38, 46)),
      z: parseFloat(line.slice(46, 54))
    });
  }
  return atoms;
}

function caMap(pdb) {
  const map = new Map();
  for (const a of parseAtoms(pdb)) {
    if (a.atom === "CA" && Number.isFinite(a.x)) {
      map.set(a.resi, [a.x, a.y, a.z]);
    }
  }
  return map;
}

function alignMobileToReference(mobilePdb, refPdb, threshold = 2.0) {
  const mobileMap = caMap(mobilePdb);
  const refMap = caMap(refPdb);
  const pairs = [];
  for (const [resi, m] of mobileMap.entries()) {
    if (refMap.has(resi)) pairs.push({ resi, mobile: m, ref: refMap.get(resi) });
  }
  if (pairs.length < 4) throw new Error("Zu wenige gemeinsame Cα-Atome für eine Überlagerung.");

  const cm = centroid(pairs.map(p => p.mobile));
  const cr = centroid(pairs.map(p => p.ref));
  const H = [[0,0,0],[0,0,0],[0,0,0]];
  for (const p of pairs) {
    const a = sub(p.mobile, cm);
    const b = sub(p.ref, cr);
    for (let i=0;i<3;i++) for (let j=0;j<3;j++) H[i][j] += a[i] * b[j];
  }
  const q = largestQuaternion(H);
  const R = quatToRot(q);

  const transformed = transformPdb(mobilePdb, R, cm, cr);

  const diffResidues = [];
  let sumSq = 0;
  for (const p of pairs) {
    const tm = add(matVec(R, sub(p.mobile, cm)), cr);
    const d = dist(tm, p.ref);
    sumSq += d * d;
    if (d > threshold) diffResidues.push(p.resi);
  }
  const rmsd = Math.sqrt(sumSq / pairs.length);

  return { pdb: transformed, pairCount: pairs.length, diffResidues, rmsd };
}

function centroid(points) {
  const c = [0,0,0];
  for (const p of points) { c[0]+=p[0]; c[1]+=p[1]; c[2]+=p[2]; }
  return c.map(x => x / points.length);
}
function sub(a,b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function add(a,b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function dist(a,b) { const d=sub(a,b); return Math.hypot(d[0], d[1], d[2]); }
function matVec(M, v) { return [M[0][0]*v[0]+M[0][1]*v[1]+M[0][2]*v[2], M[1][0]*v[0]+M[1][1]*v[1]+M[1][2]*v[2], M[2][0]*v[0]+M[2][1]*v[1]+M[2][2]*v[2]]; }

function largestQuaternion(S) {
  const [Sxx,Sxy,Sxz] = S[0];
  const [Syx,Syy,Syz] = S[1];
  const [Szx,Szy,Szz] = S[2];
  const K = [
    [Sxx+Syy+Szz, Syz-Szy,       Szx-Sxz,       Sxy-Syx],
    [Syz-Szy,       Sxx-Syy-Szz, Sxy+Syx,       Szx+Sxz],
    [Szx-Sxz,       Sxy+Syx,      -Sxx+Syy-Szz, Syz+Szy],
    [Sxy-Syx,       Szx+Sxz,       Syz+Szy,     -Sxx-Syy+Szz]
  ];
  let q = [1,0,0,0];
  for (let iter=0; iter<80; iter++) {
    const nq = [0,0,0,0];
    for (let i=0;i<4;i++) for (let j=0;j<4;j++) nq[i] += K[i][j]*q[j];
    const norm = Math.hypot(nq[0],nq[1],nq[2],nq[3]) || 1;
    q = nq.map(x => x / norm);
  }
  return q;
}

function quatToRot(q) {
  let [w,x,y,z] = q;
  const n = Math.hypot(w,x,y,z) || 1;
  w/=n; x/=n; y/=n; z/=n;
  return [
    [1-2*y*y-2*z*z, 2*x*y-2*z*w,   2*x*z+2*y*w],
    [2*x*y+2*z*w,   1-2*x*x-2*z*z, 2*y*z-2*x*w],
    [2*x*z-2*y*w,   2*y*z+2*x*w,   1-2*x*x-2*y*y]
  ];
}

function transformPdb(pdb, R, cMobile, cRef) {
  return pdb.split(/\r?\n/).map(line => {
    if (!isAtomLine(line)) return line;
    const x = parseFloat(line.slice(30, 38));
    const y = parseFloat(line.slice(38, 46));
    const z = parseFloat(line.slice(46, 54));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return line;
    const p = add(matVec(R, sub([x,y,z], cMobile)), cRef);
    return line.slice(0,30) + fmtCoord(p[0]) + fmtCoord(p[1]) + fmtCoord(p[2]) + line.slice(54);
  }).join("\n");
}

function fmtCoord(x) {
  return x.toFixed(3).toString().padStart(8, " ");
}

function setStatus(msg, kind = "") {
  els.status.textContent = msg;
  els.status.className = `status ${kind}`.trim();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, "&#96;"); }
