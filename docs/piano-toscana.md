# Piano — Toscana, e il connettore riusabile per Veneto ed Emilia-Romagna

Preparato il 20/08/2026. Tutto quello che segue è stato verificato interrogando davvero gli
endpoint, non dedotto dalla documentazione.

## La scoperta che cambia il piano: non serve uno scraper

Il Portale RSA della Toscana (`servizi.toscana.it/RT/RSA/`) è un'applicazione JavaScript che legge
**due endpoint JSON pubblici**. Il file di configurazione dell'applicazione,
`config/rsaConfig-1.0.txt`, li dichiara in chiaro:

| Endpoint | Cosa restituisce |
| --- | --- |
| `https://servizi.toscana.it/RT/RSA/Comuni.json` | 276 comuni con `cod_comune`, `cod_zona`, `zona` |
| `https://servizi.toscana.it/RT/RSA/Lista.json?CodiceComune=<cod>` | strutture del comune (`comune`) e dei comuni vicini (`limitrofi`) |

Nessun parsing di HTML, nessun browser headless, nessuna fragilità da cambio di template. La
richiesta senza parametri risponde con liste vuote e `state: "KO"`: il codice comune è obbligatorio,
quindi il giro è di 276 richieste, deduplicando le strutture per `id` (i limitrofi si ripetono).

**Conseguenza pratica:** quello che chiamavamo "scraper Toscana" diventa un connettore come quelli
di Lombardia e Umbria, con in più uno strato di raccolta che compone il file locale. Il lavoro
stimato scende da una sessione lunga a una sessione normale.

## Cosa contiene la fonte

Campione verificato: Firenze e comuni limitrofi, 47 strutture.

| Dato | Copertura nel campione | Nota |
| --- | --- | --- |
| Telefono | 47/47 | `telefono_sede`, più `telefono_rsa` nel blocco codificato |
| Email | 47/47 | `email_sede` e `email` |
| PEC | quasi tutte | `posta_certificata_sede` |
| Sito internet | la maggior parte | dentro `json_data` |
| Coordinate | 47/47 | `lat` / `lon`, gradi decimali |
| **Quota sanitaria** | 47/47 | `rsa_quotasanitaria`, **al giorno** |
| **Tariffa privata min/max** | 39/47 | `tariffa_privata_ranged`, **al giorno** |
| Moduli | 47/47 | base, cognitivo comportamentale, riabilitativo, vegetativo |
| Data aggiornamento | per struttura | nel campione arriva al **14/08/2026**, sei giorni fa |

Il campo `json_data` è una stringa base64 che, decodificata, contiene un secondo livello di
dettaglio: numero di piani, camere e posti letto per camera, servizi con giorni e orari, punti di
interesse nei dintorni, direttore della struttura.

Questa è **la fonte più ricca e più fresca che abbiamo**: più delle carte dei servizi, che abbiamo
dovuto estrarre da PDF con anni di ritardo, e con un aggiornamento dichiarato struttura per
struttura.

## Le tre decisioni da prendere prima di scrivere il codice

### 1. Le tariffe sono giornaliere, le nostre sono mensili

`tariffa_privata_ranged: {minima: 100, massima: 118.48}` e `rsa_quotasanitaria: "59.10"` sono euro
**al giorno**. Le 54 rette che abbiamo oggi, estratte dalle carte dei servizi, sono mensili.
Mescolarle senza accorgersene produrrebbe pagine che confrontano 112 € con 2.400 €.

**Proposta:** riempire `prezzo_min` / `prezzo_max` con il mensile calcolato (giornaliera × 30,4) e
salvare il valore dichiarato in `retta_originale`, colonna che già esiste, nella forma
`"100,00–118,48 €/giorno (tariffa privata dichiarata al Portale RSA)"`. In pagina si mostra la
giornaliera come dato della fonte e la mensile come stima esplicita. `retta_regime` distingue già
privata e convenzionata, e qui **per la prima volta la Regione dichiara entrambe**: niente
estrazione, niente confidenza "media".

### 2. Cosa non importiamo, e perché

- **Foto e brochure PDF** (`foto0`…`foto5`, `rsa_nome_brochure`): stessa regola delle carte dei
  servizi — non si rihostano. Al massimo si linka l'originale sul portale regionale.
- **Nome, cognome e codice fiscale del direttore**: sono dati personali di una persona fisica e
  non servono a una famiglia che cerca una struttura. Non entrano nel database. Il codice fiscale
  in particolare non deve proprio essere scritto.
- **Posti liberi** (`rsa_posti_liberi`, `posti_liberi_m/f`): cambiano di giorno in giorno. Pubblicarli
  su pagine statiche significa mostrare a settembre la disponibilità di agosto. Meglio niente.
- **Servizi con giorni e orari**: ricchissimi, ma sono la sessione dopo. Prima le rette e i contatti.

### 3. La licenza va confermata

- `servizi.toscana.it/robots.txt` vieta solo `/cgi-bin/`: gli endpoint sono liberamente
  interrogabili e la regola di CLAUDE.md sul rispetto di robots.txt è soddisfatta.
- Regione Toscana pubblica i propri open data in CC-BY, e la **legge regionale 19/2015** sul
  riutilizzo li rende aperti per impostazione predefinita. Ma il Portale RSA **non è nel catalogo
  `dati.toscana.it`**, quindi la sua licenza non è dichiarata esplicitamente.
- **Azione:** scrivere all'URP della Regione chiedendo conferma della licenza di riuso dei dati del
  Portale RSA. Nel frattempo si procede citando la fonte in ogni scheda, come già facciamo per OSM,
  e registrando la provenienza in `fonte_contatti`. Se la risposta fosse negativa, si rimuove: sono
  righe con `fonte_dati` dedicato, isolabili con una query.

## Architettura: cosa si riusa e cosa no

Il connettore va scritto in **quattro strati**, perché è la separazione che rende riusabile la
parte che conta:

```
1. raccolta   scripts/raccogli/toscana.mjs      ← per fonte: parla con il servizio remoto
2. snapshot   data/toscana-rsa.json             ← file datato nel repo, l'import è riproducibile
3. mapping    scripts/mapping/toscana.mjs       ← per fonte: colonne remote → nostro schema
4. import     scripts/import-regione.mjs        ← già scritto, non si tocca
```

Oggi lo strato 1 non esiste: Lombardia, Friuli e Umbria hanno un CSV che si scarica con un solo
`curl`. La Toscana richiede 276 richieste da comporre, quindi lo strato di raccolta diventa un
concetto del progetto e non un caso particolare. Va scritto pensando che sarà il primo di tre.

Quello che il connettore toscano lascia in eredità a Veneto ed Emilia-Romagna:

- **il pattern di raccolta**: enumera le chiavi (comuni), interroga una per una con un ritardo fra
  le richieste, deduplica per id, salva uno snapshot datato, riporta cosa è cambiato dal precedente
- **la gestione dello snapshot**: il repo tiene il file, l'import legge il file, mai la rete
- **la scomposizione delle tariffe** giornaliero/mensile e privata/convenzionata
- **il riconoscimento del modulo per le demenze**, che riempie `nucleo_alzheimer` con un valore
  vero invece che con `null` (nel campione: 2 strutture su 47 hanno il modulo cognitivo
  comportamentale)

Quello che **non** si riusa: il trasporto. Ogni regione ha il suo, e va scoperto ogni volta.

## Stato della ricognizione su Veneto ed Emilia-Romagna

Verificato oggi, così la sessione successiva non riparte da zero.

**Emilia-Romagna — ReportER.** `reporter.regione.emilia-romagna.it/ReportER/viewer/flusso/1001` è
un'applicazione Angular (`main-*.js` più cinque chunk). Un'applicazione Angular ha per forza un
backend REST: la tecnica è la stessa usata oggi per la Toscana — leggere il bundle e trovare
l'endpoint. Il dominio non espone un `robots.txt` proprio (la richiesta restituisce l'applicazione
stessa), quindi va controllato quello del dominio regionale prima di interrogare.
**Stima: mezza sessione per trovare l'endpoint, una per il connettore.**

**Veneto — Una Mappa per le Demenze.** `demenze.regione.veneto.it/luoghi/strutture` è un WordPress
con Elementor. Il `robots.txt` consente tutto tranne `/wp-admin/`, e c'è una REST API attiva. Ma
`wp-json/wp/v2/types` **non espone un tipo di contenuto per le strutture**: i dati della mappa
arrivano da un plugin, probabilmente via `admin-ajax.php` — che il robots.txt consente
esplicitamente. Serve un'ispezione del JavaScript della pagina mappa per trovare l'azione AJAX.
Da valutare anche l'alternativa: gli elenchi delle strutture autorizzate e accreditate pubblicati
in PDF su `salute.regione.veneto.it`, meno comodi ma ufficiali.
**Stima: una sessione per la ricognizione, una per il connettore.**

## Passi della sessione Toscana

1. **Raccolta** — `scripts/raccogli/toscana.mjs`: scarica `Comuni.json`, poi `Lista.json` per i 276
   comuni con un ritardo di ~300 ms fra le richieste e un `User-Agent` che ci identifica; deduplica
   per `id`; decodifica `json_data`; scrive `data/toscana-rsa.json` e un riepilogo di quante
   strutture, quanti comuni coperti, quante senza tariffa.
2. **Verifica del raccolto** — quante strutture in totale (attese circa 400), quante attive
   (`rsa_attiva = 1`), distribuzione per provincia, quante con tariffa privata e con quota
   sanitaria, quali comuni non ne hanno nessuna.
3. **Mapping** — `scripts/mapping/toscana.mjs`. Comune e provincia dal codice ISTAT tramite
   `scripts/lib/istat.mjs`, che esiste già. `convenzionata` dal campo `accordo`. `nucleo_alzheimer`
   dal modulo cognitivo comportamentale. Rette come al punto 1 delle decisioni.
4. **Prova a vuoto** — `node scripts/import-regione.mjs toscana --prova`, controllo dei nomi
   normalizzati e delle collisioni di slug.
5. **Import**, poi `npm run build`, `/verifica` completo, commit.
6. **Nella stessa sessione o subito dopo:** la pagina di attribuzione, sul modello di `/dati/osm`,
   e la formula di disclosure delle rette adattata a questa fonte — "Fonte: Portale RSA Regione
   Toscana, dato aggiornato il [rsa_data_aggiornamento]" al posto di "carta dei servizi [anno]".

## Rischi

- **La licenza non confermata.** È l'unico che può costringere a tornare indietro. Isolabile:
  `fonte_dati = "portale_rsa_toscana"`.
- **276 richieste in fila.** Con 300 ms di ritardo sono circa novanta secondi: niente che possa
  somigliare a un abuso. Va comunque messo un tetto ai tentativi e un'uscita pulita se il servizio
  inizia a rispondere male.
- **Il formato di `json_data` non è documentato.** È un contratto interno dell'applicazione e può
  cambiare senza preavviso. Il mapping deve trattare come opzionale tutto quello che ne estrae, e
  l'import deve continuare a funzionare anche se quel blocco un giorno sparisce.
- **Doppioni con le carte dei servizi.** Nessuno oggi: in Toscana non abbiamo ancora strutture. Ma
  il controllo di collisione degli slug fra fonti diverse, aggiunto con l'ondata 2, va lasciato
  attivo.
