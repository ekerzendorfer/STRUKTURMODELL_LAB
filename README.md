# KI-Strukturmodell-Labor v0.5.0

Schlanke GitHub-Pages-Webapp zum Vergleich von KI-Proteinstrukturmodellen mit experimentellen Referenzstrukturen.

## Neu in v0.5.0

- Drittes Beispiel ergänzt: **Calmodulin**.
- Didaktischer Schwerpunkt: **Sequenzmodell vs. Ca²⁺-gebundener experimenteller Zustand**.
- Lokale experimentelle Calmodulin-Datei erwartet unter `structures/calmodulin/experimental_ca_bound.pdb`.
- Calcium-Ionen bleiben bei Calmodulin sichtbar, wenn **Ionen/Liganden anzeigen** aktiviert ist.
- Wasser und Ethanol aus 1CLL werden herausgefiltert; Calcium-Ionen bleiben erhalten.
- ColabFold-Workflow enthält nun auch die Calmodulin-Sequenz.
- Optionale KI-/Vergleichsmodelle bleiben wie in v0.4.1 erhalten.

## Erwartete Strukturdateien

```text
structures/
├── trp_cage/
│   ├── experimental.pdb
│   ├── af2_best.pdb
│   ├── af2_alternative.pdb
│   └── didactic_decoy.pdb        # optional
├── ubiquitin/
│   ├── experimental.pdb
│   ├── af2_best.pdb
│   ├── af2_alternative.pdb
│   └── didactic_decoy.pdb        # optional
└── calmodulin/
    ├── experimental_ca_bound.pdb
    ├── af2_best.pdb
    ├── af2_alternative.pdb
    └── didactic_decoy.pdb        # optional
```

## Calmodulin-Sequenz für ColabFold

Für den Vergleich mit 1CLL wird die 148-AS-Sequenz ohne zusätzliches N-terminales Methionin verwendet:

```text
>calmodulin_1CLL_reference
ADQLTEEQIAEFKEAFSLFDKDGDGTITTKELGTVMRSLGQNPTEAELQDMINEVDADGNGTIDFPEFLTMMARKMKDTDSEEEIREAFRVFDKDGNGYISAAELRHVMTNLGEKLTDEEVDEMIREADIDGDGQVNYEEFVQMMTAK
```

## Update

Für ein Update auf v0.5.0 mindestens ersetzen:

```text
index.html
app.js
style.css
data/examples.json
README.md
colab/colabfold_template.ipynb
```

Den Ordner `structures/` nicht mit einem leeren Ordner überschreiben, wenn dort bereits PDB-Dateien liegen.
