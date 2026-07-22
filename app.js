/* KI-Strukturmodell-Labor v0.1.0
   Schlanke GitHub-Pages-Webapp mit 3Dmol.js und datengetriebener Struktur.
   Wichtig: Für v0.1 werden remote PDB-Quellen geladen; spätere Versionen sollen kuratierte lokale PDBs nutzen. */

let examplesData = null;
let currentExample = null;
let currentView = "overlay";
let viewer = null;
let loadedModels = {};
let uploadedPdb = null;
let lastDiffResidues = [];

const els = {
  cards: document.getElementById("exampleCards"),
  info: document.getElementById("exampleInfo"),
  viewer: document.getElementById("viewer"),
  status: document.getElementById("status"),
  viewerHint: document.getElementById("viewerHint"),
  reloadBtn: document.getElementById("reloadBtn"),
  questions: document.getElementById("questions"),
  takeaway: document.getElementById("takeaway"),
  showPrediction: document.getElementById("showPrediction"),
  showExperiment: document.getElementById("showExperiment"),
  showDifferenceResidues: document.getElementById("showDifferenceResidues"),
  pdbUpload: document.getElementById("pdbUpload"),
  clearUploadBtn: document.getElementById("clearUploadBtn")
};

init();

async function init() {
  try {
    setStatus("Lade Beispiele …");
    const response = await fetch("data/examples.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`examples.json konnte nicht geladen werden (${response.status})`);
    examplesData = await response.json();
    renderCards(examplesData.examples);
    wireEvents();
    if (examplesData.examples.length) selectExample(examplesData.examples[0].id);
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
  [els.showPrediction, els.showExperiment, els.showDifferenceResidues].forEach(el => {
    el.addEventListener("change", () => loadCurrentExample());
  });
  els.reloadBtn.addEventListener("click", () => loadCurrentExample(true));
  els.pdbUpload.addEventListener("change", handleUpload);
  els.clearUploadBtn.addEventListener("click", () => {
    uploadedPdb = null;
    els.pdbUpload.value = "";
    loadCurrentExample();
  });
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
  document.querySelectorAll(".card").forEach(c => c.classList.toggle("active", c.dataset.id === id));
  renderExampleInfo(currentExample);
  renderQuestions(currentExample);
  currentView = currentExample.views?.overlay ? "overlay" : "experiment";
  document.querySelectorAll(".viewBtn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === currentView));
  updateCheckboxesForView();
  loadCurrentExample(true);
}

function renderExampleInfo(ex) {
  const sources = (ex.sources || []).map(s => `<li><a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a></li>`).join("");
  els.info.innerHTML = `
    <h2>2. Leitfrage: ${escapeHtml(ex.title)}</h2>
    <p>${escapeHtml(ex.intro || "")}</p>
    <p class="core">${escapeHtml(ex.core_message || "")}</p>
    ${ex.sequence ? `<p><strong>Sequenz:</strong> <code>${escapeHtml(ex.sequence)}</code></p>` : ""}
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
  ensureViewer();
  viewer.clear();
  loadedModels = {};
  lastDiffResidues = [];

  const statusLines = [];
  const structures = currentExample.structures || [];
  const expStruct = structures.find(s => s.role === "experiment" && !s.disabled);
  const predStruct = structures.find(s => s.role === "prediction" && !s.disabled);

  try {
    let expPdb = null;
    let predPdb = null;

    if (els.showExperiment.checked && expStruct) {
      expPdb = await loadStructureText(expStruct);
      expPdb = preprocessPdb(expPdb, expStruct);
      const expModel = viewer.addModel(expPdb, "pdb");
      applyModelStyle(expModel, expStruct, "experiment");
      loadedModels.experiment = { model: expModel, pdb: expPdb, struct: expStruct };
      statusLines.push(`Experiment geladen: ${expStruct.label}`);
    }

    if (els.showPrediction.checked && predStruct) {
      predPdb = await loadStructureText(predStruct);
      predPdb = preprocessPdb(predPdb, predStruct);
      if (expPdb && predStruct.alignTo) {
        const alignment = alignMobileToReference(predPdb, expPdb);
        predPdb = alignment.pdb;
        lastDiffResidues = alignment.diffResidues;
        statusLines.push(`KI-Modell überlagert: ${alignment.pairCount} Cα-Paare; auffällige Bereiche: ${lastDiffResidues.length ? lastDiffResidues.join(", ") : "keine > 2 Å"}`);
      }
      const predModel = viewer.addModel(predPdb, "pdb");
      applyModelStyle(predModel, predStruct, "prediction");
      loadedModels.prediction = { model: predModel, pdb: predPdb, struct: predStruct };
      statusLines.push(`KI-Modell geladen: ${predStruct.label}`);
    }

    if (els.showPrediction.checked && uploadedPdb) {
      let own = uploadedPdb;
      if (expPdb) {
        try {
          const alignment = alignMobileToReference(own, expPdb);
          own = alignment.pdb;
          statusLines.push(`Eigenes PDB überlagert: ${alignment.pairCount} Cα-Paare.`);
        } catch (e) {
          statusLines.push(`Eigenes PDB geladen, aber nicht überlagert: ${e.message}`);
        }
      }
      const ownModel = viewer.addModel(own, "pdb");
      ownModel.setStyle({}, { cartoon: { color: "#7B1FA2", opacity: 0.82 } });
      loadedModels.upload = { model: ownModel, pdb: own, struct: { label: "Eigenes PDB" } };
    }

    if (currentView === "differences" && els.showDifferenceResidues.checked) {
      highlightDifferences();
    }

    if (!Object.keys(loadedModels).length) {
      showEmptyViewerNotice();
      const disabledPred = structures.find(s => s.role === "prediction" && s.disabled);
      if (disabledPred) statusLines.push(disabledPred.note);
    } else {
      viewer.zoomTo();
      viewer.render();
    }

    els.viewerHint.textContent = `${currentExample.title}: ${currentExample.core_message}`;
    setStatus(statusLines.join("\n") || "Bereit.", statusLines.length ? "ok" : "warn");
  } catch (err) {
    showEmptyViewerNotice();
    setStatus(`Fehler beim Laden der Struktur: ${err.message}\n\nMögliche Ursache: Remote-Datei nicht erreichbar oder Browser blockiert den Abruf. Für die spätere Unterrichtsversion sollten die PDB-Dateien lokal im Repo liegen.`, "warn");
  }
}

function ensureViewer() {
  if (!viewer) {
    viewer = $3Dmol.createViewer(els.viewer, { backgroundColor: "#111827" });
  }
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
  viewer.zoomTo();
  viewer.render();
}

async function loadStructureText(struct) {
  if (struct.source === "placeholder") throw new Error(struct.note || "Struktur noch nicht hinterlegt.");
  const urls = [struct.url, struct.fallbackUrl].filter(Boolean);
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} (${res.status})`);
      return await res.text();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Keine URL angegeben.");
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
  return lines.join("\n") + "\n";
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
  model.setStyle({}, { cartoon: { color, opacity: role === "experiment" ? 0.78 : 0.88 } });
  if (role === "prediction") model.setStyle({ hetflag: true }, { stick: { color, radius: 0.15 } });
}

function highlightDifferences() {
  if (!lastDiffResidues.length || !loadedModels.prediction) return;
  loadedModels.prediction.model.setStyle({ resi: lastDiffResidues }, {
    cartoon: { color: "#D32F2F", opacity: 1.0 },
    stick: { color: "#D32F2F", radius: 0.18 }
  });
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
      // residue number is enough for the curated comparisons in v0.1
      map.set(a.resi, [a.x, a.y, a.z]);
    }
  }
  return map;
}

function alignMobileToReference(mobilePdb, refPdb) {
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
  for (const p of pairs) {
    const tm = add(matVec(R, sub(p.mobile, cm)), cr);
    const d = dist(tm, p.ref);
    if (d > 2.0) diffResidues.push(p.resi);
  }

  return { pdb: transformed, pairCount: pairs.length, diffResidues };
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
