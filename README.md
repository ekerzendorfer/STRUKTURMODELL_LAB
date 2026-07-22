# KI-Strukturmodell-Labor v0.1.0

**Arbeitstitel:** KI_STRUKTURMODELL_LAB  
**Thema:** KI-Strukturmodell vs. experimentelle Proteinstruktur

Diese erste Version legt die Architektur für ein kleines, erweiterbares Mini-Tool an.

## Ziel

Das Tool soll zeigen:

> Sequenz → KI-Strukturmodell → experimentelle Struktur → Overlay → Modellgrenzen verstehen.

Es ist bewusst nicht als Erweiterung des bestehenden Proteinlabors gedacht, sondern als eigenes kleines Vergleichswerkzeug.

## Enthalten in v0.1.0

- statische GitHub-Pages-Webapp
- datengetriebene Beispielstruktur über `data/examples.json`
- 3Dmol.js-Viewer
- Beispielkarten
- Trp-cage als Einstieg angelegt
- Ubiquitin als erster echter Modellvergleich angelegt
- automatische Cα-basierte Überlagerung im Browser vorbereitet
- optionaler Upload eines eigenen PDB-Modells vorbereitet
- Calmodulin als späteres AF2/AF3/Experiment-Beispiel im Datenmodell vorgemerkt

## Wichtiger Hinweis zu den Strukturen

v0.1.0 lädt die experimentellen Strukturen und das AlphaFold-DB-Modell zunächst über Remote-URLs. Für eine spätere Unterrichtsversion sollten die wichtigsten Strukturen zusätzlich lokal im Repo abgelegt und vorab geprüft werden.

Bei Ubiquitin wird als KI-Modell zunächst AlphaFold DB `P62988` verwendet und auf die ersten 76 Aminosäuren beschränkt, da dieser Bereich Ubiquitin entspricht.

Bei Trp-cage ist das experimentelle NMR-Beispiel bereits eingebunden. Ein vorbereitetes ColabFold-Modell wird später ergänzt.

## Repo-Struktur

```text
KI_STRUKTURMODELL_LAB/
├── index.html
├── app.js
├── style.css
├── data/
│   └── examples.json
├── structures/
│   ├── trp_cage/
│   ├── ubiquitin/
│   └── calmodulin/
├── colab/
│   └── colabfold_template.ipynb
└── media/
```

## Lokaler Test

Wegen `fetch()` für `data/examples.json` bitte nicht einfach per Doppelklick öffnen, sondern lokal über einen kleinen Server testen:

```bash
python -m http.server 8000
```

Dann öffnen:

```text
http://localhost:8000
```

Auf GitHub Pages funktioniert der Zugriff direkt.

## Nächste sinnvolle Schritte

### v0.1.1

- Anzeige-/Fehlertexte testen
- Ubiquitin-Overlay in verschiedenen Browsern prüfen
- Fallback für AFDB-URL prüfen

### v0.2

- vorberechnetes ColabFold-Modell für Trp-cage ergänzen
- Strukturen lokal ins Repo übernehmen
- didaktische Texte schärfen

### v0.3

- Calmodulin ergänzen
- experimentelle Ca²⁺-gebundene Struktur
- optional manuell erzeugtes AF3-Modell
- optionaler Videolink zum AF3-Prozess

## Didaktischer Kernsatz

> AlphaFold/ColabFold liefert ein sehr wertvolles Strukturmodell aus der Sequenz. Experimentelle Strukturen zeigen aber konkrete Zustände, Liganden/Ionen, flexible Bereiche und alternative Konformationen.
