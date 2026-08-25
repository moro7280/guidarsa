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
| `lombardia-cdi.csv` | Regione Lombardia — Centri Diurni Integrati accreditati per anziani | https://www.dati.lombardia.it/d/rs6k-vuhs | 20/08/2026 | `opendata_lombardia_cdi` |
| `lombardia-offerta-sociale.csv` | Regione Lombardia — Strutture di offerta sociale per anziani | https://www.dati.lombardia.it/d/i846-pq8q | 20/08/2026 | `opendata_lombardia_sociale` |
| `umbria-anziani.csv` | Regione Umbria — Strutture sanitarie residenziali per anziani non autosufficienti | https://dati.regione.umbria.it | 20/08/2026 | `opendata_umbria` |
| `toscana-rsa.json` | Regione Toscana — Portale RSA | https://servizi.toscana.it/RT/RSA/ | 20/08/2026 | `portale_rsa_toscana` |
| `istat-comuni.csv` | ISTAT — Codici delle unità amministrative territoriali | https://www.istat.it/it/archivio/6789 | 20/08/2026 | — (tabella di appoggio) |

## Note per fonte

- **`lombardia-offerta-sociale.csv`** contiene 199 righe ma ne importiamo 55: solo l'unità
  d'offerta «centro diurni anziani». Le 144 righe di «alloggio protetto anziani» restano fuori
  perché il nostro schema non ha una tipologia che le descriva senza mentire.
- **`umbria-anziani.csv`** è in **windows-1252**, non in UTF-8, e non contiene il nome del comune
  ma il codice ISTAT: per questo serve `istat-comuni.csv`. I dati sono la rilevazione ministeriale
  dell'**anno 2020**, la più recente che la Regione pubblichi.
- **`toscana-rsa.json`** non si scarica con un comando: è composto da
  `scripts/raccogli/toscana.mjs`, che interroga il servizio del Portale RSA un comune alla volta
  (276 richieste, ~300 ms l'una) e deduplica le strutture per `id`. Contiene anche il blocco
  `dettaglio`, cioè il campo `json_data` del portale già decodificato da base64.
- **`istat-comuni.csv`** non è una fonte di strutture: è la tabella che traduce i codici comune in
  nome, provincia e regione. Serve a ogni fonte che identifichi i comuni per codice. È anch'esso in
  windows-1252.
