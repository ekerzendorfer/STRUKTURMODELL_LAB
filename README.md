# KI-Strukturmodell-Labor v0.3.4

Mini-Tool zum Vergleich von KI-Strukturmodellen und experimentellen Proteinstrukturen.

## Didaktischer Kern

> Sequenz → KI-Strukturmodell → experimentelle Struktur → Overlay → Modellgrenzen verstehen

Die Website bleibt die stabile Vergleichsumgebung.  
ColabFold wird bewusst als externer Vertiefungsweg genutzt.

## Neu in v0.3.4

- JavaScript-Syntaxfehler aus v0.3.3 behoben
- lokale PDB-Dateien werden mit Cache-Busting geladen, damit nachträglich hochgeladene Strukturen nicht durch alte 404-Caches blockiert werden
- bessere Diagnose, falls eine Datei zwar geladen wird, aber keine erkennbaren PDB-Zeilen enthält
- lokale Strukturpfade für den Standardmodus vorbereitet
- experimentelle Strukturen können lokal liegen und fallen sonst auf RCSB zurück
- KI-Modelle werden als lokale, kuratierte ColabFold-PDB-Dateien erwartet
- Beispielseiten enthalten einen Link zum ColabFold-Template
- `structures/`-Ordner mit Zielpfaden angelegt
- ColabFold-Template erklärt den Workflow: Faltung extern erzeugen, PDB importieren oder ins Repo übernehmen

## Erwartete Strukturdateien

```text
structures/trp_cage/experimental.pdb
structures/trp_cage/af2_colabfold.pdb

structures/ubiquitin/experimental.pdb
structures/ubiquitin/af2_colabfold.pdb
```

In v0.3.1 müssen die AF2-Dateien noch durch einen ColabFold-Lauf erzeugt und ins Repo gelegt werden.

## Workflow für den Unterricht

1. Webtool öffnen.
2. Beispiel auswählen.
3. Experimentelle Struktur betrachten.
4. Falls ein lokales KI-Modell vorhanden ist: Overlay mit Experiment betrachten.
5. Optional ColabFold-Notebook öffnen.
6. Modell selbst erzeugen.
7. PDB über **Eigenes PDB testen** importieren.
8. Vergleich und Modellgrenzen im Protokolltext sichern.

## GitHub Pages

Die Dateien müssen im Root des Repos liegen:

```text
index.html
app.js
style.css
data/examples.json
structures/
colab/
```

Danach GitHub Pages auf `main` und `/root` stellen.


## Test für lokale PDB-Dateien

Nach dem Hochladen einer Datei wie

```text
structures/ubiquitin/af2_colabfold.pdb
```

sollte die Datei direkt unter dieser GitHub-Pages-Adresse erreichbar sein:

```text
https://ekerzendorfer.github.io/KI_STRUKTURMODELL_LAB/structures/ubiquitin/af2_colabfold.pdb
```

Die ersten sichtbaren Zeilen sollten typische PDB-Zeilen enthalten, z. B. `MODEL`, `ATOM`, `HETATM`, `TER` oder `END`.

Wenn die Datei im GitHub-Repo sichtbar ist, aber über GitHub Pages noch nicht erreichbar ist, hilft meist ein kurzer Moment Warten, bis Pages neu deployed ist. Danach im Browser Strg+F5 ausführen.
