# structures/

Hier werden später die kuratierten, lokal eingebundenen Strukturdateien abgelegt.

Für den Standardmodus sind diese Dateinamen vorbereitet:

```text
structures/trp_cage/experimental.pdb
structures/trp_cage/af2_colabfold.pdb

structures/ubiquitin/experimental.pdb
structures/ubiquitin/af2_colabfold.pdb
```

In v0.3.1 sind die lokalen Pfade bereits im Datenmodell vorbereitet.  
Die experimentellen Strukturen besitzen noch einen Remote-Fallback zu RCSB.  
Die KI-Modelle werden bewusst **nicht** mehr aus fragilen Remote-AlphaFold-Links geladen, sondern sollen als kuratierte ColabFold-PDB-Dateien hier abgelegt werden.

Empfohlener Workflow:

1. Sequenz im ColabFold-Notebook falten lassen.
2. Die beste PDB-Datei herunterladen.
3. Datei passend umbenennen, z. B. `af2_colabfold.pdb`.
4. Datei in den passenden Unterordner legen.
5. GitHub Pages neu laden.
