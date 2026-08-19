# Dati sorgente

Export open data versionati nel repo, così ogni import è riproducibile anche quando il portale
di origine cambia formato o ritira il dataset.

## Convenzioni

- Un file per fonte, nome senza data: `lombardia-rsa.csv`.
- La data di download **non** sta nel nome del file ma nella tabella qui sotto e nel file di
  mapping colonne usato dallo script di import: è quella che finisce nei metadati delle righe
  importate, insieme a `fonte_dati`.
- Il file va committato così com'è scaricato, senza ripulirlo a mano: la normalizzazione è
  compito dello script di import, che deve restare riproducibile.

## Fonti

| File | Fonte | URL | Scaricato il | `fonte_dati` |
| --- | --- | --- | --- | --- |
| `lombardia-rsa.csv` | Regione Lombardia — Elenco Residenze Sanitarie Assistenziali | https://dati.lombardia.it | 18/08/2026 | `opendata_lombardia` |
| `friuli-anziani.csv` | Regione Friuli-Venezia Giulia — Elenco strutture residenziali per anziani | https://www.dati.friuliveneziagiulia.it | 19/08/2026 | `opendata_friuli` |
