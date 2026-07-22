# KI-Strukturmodell-Labor v0.3.1

Mini-Tool zum Vergleich von KI-Strukturmodellen und experimentellen Proteinstrukturen.

## Didaktischer Kern

> Sequenz → KI-Strukturmodell → experimentelle Struktur → Overlay → Modellgrenzen verstehen

Die Website bleibt die stabile Vergleichsumgebung.  
ColabFold wird bewusst als externer Vertiefungsweg genutzt.

## Neu in v0.3.1

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
