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

**Deciso e implementato:** `prezzo_min` / `prezzo_max` con il mensile calcolato a **30,44** giorni
(365,25 / 12), il valore giornaliero dichiarato in `retta_originale`, `retta_confidenza = "alta"`
perché il dato è della Regione e non estratto da un PDF. In pagina si mostrano entrambi, e la riga
di disclosure dice esplicitamente che il mensile è calcolato.

**Attenzione, qui la prima stesura del piano sbagliava.** Il portale ha due campi di quota e non
sono intercambiabili. Il codice del portale li etichetta così, con parole sue:

| Campo | Etichetta nel portale | Chi paga | Dove va da noi |
| --- | --- | --- | --- |
| `rsa_quota` | «Quota sociale (a carico dell'assistito)» | la famiglia | `retta_convenzionata_min/max` |
| `rsa_quotasanitaria` | «Quota sanitaria (a carico del servizio sanitario)» | la Regione | solo nella descrizione, come contesto |

Mettere la quota sanitaria fra le rette a carico della famiglia avrebbe pubblicato su 334 schede lo
stesso identico importo — 59,10 € al giorno per tutte, perché è la tariffa regionale — presentando
come costo per la famiglia esattamente la parte che la famiglia **non** paga. La quota sociale,
invece, varia davvero: 81 valori distinti fra 42 e 75 € al giorno.

**Valori anomali.** Sei strutture dichiarano tariffe private fra 1.075 e 11.025 € **al giorno**:
quasi certamente importi mensili finiti nel campo sbagliato. Indovinare sarebbe inventare, quindi
il mapping scarta tutto ciò che sta fuori da 40–350 € al giorno e lo stampa nel report dell'import.

### 2. Cosa non importiamo, e perché

- **Foto e brochure PDF** (`foto0`…`foto5`, `rsa_nome_brochure`): stessa regola delle carte dei
  servizi — non si rihostano. Al massimo si linka l'originale sul portale regionale.
- **Nome, cognome e codice fiscale del direttore**: sono dati personali di una persona fisica e
  non servono a una famiglia che cerca una struttura. Non entrano nel database. Il codice fiscale
  in particolare non deve proprio essere scritto.
- **Posti liberi** (`rsa_posti_liberi`, `posti_liberi_m/f`): cambiano di giorno in giorno. Pubblicarli
  su pagine statiche significa mostrare a settembre la disponibilità di agosto. Meglio niente.
- **Servizi con giorni e orari**: ricchissimi, ma sono la sessione dopo. Prima le rette e i contatti.

### 3. La licenza: come procediamo, e come si torna indietro

**Decisione presa il 20/08/2026:** si procede citando la fonte in ogni scheda, in attesa della
conferma formale della Regione. Le righe restano isolabili perché hanno un `fonte_dati` dedicato.

**In caso di diniego, il ritiro è una query.** Non serve un intervento sul codice né una
ricostruzione: le 334 righe si tolgono con

```sql
delete from public.strutture where fonte_dati = 'portale_rsa_toscana';
```

seguita da un nuovo deploy, che rigenera sitemap e pagine senza la Toscana. Le pagine comune
toscane spariscono da sole, perché una pagina comune esiste solo se contiene almeno una struttura.
Nessun'altra fonte viene toccata. Va cancellato anche lo snapshot `data/toscana-rsa.json`.

### La bozza da mandare all'URP

Da inviare da `info@guidarsa.it` all'URP di Regione Toscana (`urp@regione.toscana.it`), oppure via
PEC a `regionetoscana@postacert.toscana.it`.

> **Oggetto:** Richiesta di conferma della licenza di riutilizzo dei dati del Portale RSA
> (LR 19/2015)
>
> Spettabile Ufficio Relazioni con il Pubblico,
>
> sono Moreno Pascucci, titolare del sito GuidaRSA (https://guidarsa.it), una directory
> informativa gratuita delle strutture per anziani in Italia rivolta alle famiglie che devono
> scegliere una residenza per un familiare.
>
> Il Portale RSA di Regione Toscana (https://servizi.toscana.it/RT/RSA/) espone i dati delle
> strutture residenziali attraverso due endpoint JSON pubblici e non protetti
> (`Comuni.json` e `Lista.json`), raggiungibili senza autenticazione e non esclusi dal file
> robots.txt del dominio `servizi.toscana.it`.
>
> Vorrei riutilizzare tali dati — denominazione, indirizzo, recapiti, quota sociale a carico
> dell'assistito e tariffa privata dichiarate — per pubblicarli sul mio sito, con citazione
> esplicita della fonte in ogni scheda e con il rimando al portale regionale per la verifica
> della disponibilità aggiornata.
>
> Chiedo cortesemente conferma di quanto segue:
>
> 1. che i dati del Portale RSA rientrino fra i dati aperti riutilizzabili ai sensi della
>    **legge regionale 18 febbraio 2015, n. 19** («Disposizioni in materia di dati aperti e
>    loro riutilizzo») e dell'art. 52 del Codice dell'amministrazione digitale;
> 2. quale sia la **licenza applicabile** e la formula di attribuzione che la Regione preferisce
>    veda pubblicata (ad esempio CC-BY 4.0, come per i dataset del catalogo dati.toscana.it);
> 3. se vi siano **limiti di frequenza** nell'interrogazione degli endpoint che dovrei rispettare.
>    Attualmente effettuo una raccolta completa con una pausa di 300 millisecondi fra le richieste,
>    per un totale di circa 276 chiamate, non più di una volta al mese.
>
> Preciso che non ripubblico fotografie, brochure né i dati del direttore sanitario, e che non
> pubblico i posti liberi, rimandando per quelli al portale regionale.
>
> Resto a disposizione per qualsiasi chiarimento e, in caso di riscontro negativo o di condizioni
> particolari, provvederò tempestivamente a rimuovere i dati.
>
> Cordiali saluti,
> Moreno Pascucci — GuidaRSA — info@guidarsa.it

### 3-bis. I fatti su cui poggia la decisione

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

## Esito della sessione Toscana — 20/08/2026

Eseguito. Quello che è stato scritto:

| File | Ruolo |
| --- | --- |
| `scripts/raccogli/toscana.mjs` | interroga i 276 comuni, deduplica, decodifica `json_data`, scrive lo snapshot |
| `data/toscana-rsa.json` | snapshot datato, versionato nel repo |
| `scripts/mapping/toscana.mjs` | colonne del portale → nostro schema |
| `src/components/DisponibilitaPortale.tsx` | rimando al portale per i posti liberi |
| `src/components/BloccoRette.tsx` | disclosure delle rette consapevole della fonte |
| `scripts/import-regione.mjs` | sa leggere anche fonti JSON, non solo CSV |

**334 strutture**, tutte attive, in **155 comuni** e in tutte e 10 le province. Copertura: telefono
325, email 330, sito 234, PEC 286, coordinate 334, posti 332, quota sociale 334, tariffa privata
270. Il dato più recente è aggiornato al **19/08/2026, il giorno prima della raccolta**; il più
vecchio al 2018, e per quelle poche schede la regola dei due anni fa già scattare la dicitura
«tariffa storica».

Due cose emerse solo scrivendo il connettore, oltre allo scambio fra le due quote:

- **Il telefono giusto è `telefono_rsa`, non `telefono_sede`.** Su 334 strutture i due numeri
  differiscono **171 volte**, e la sede legale è spesso il centralino di un gruppo in un'altra
  provincia: la prima versione del mapping dava a una RSA di Camaiore un numero di Firenze. È lo
  stesso errore già corretto in passato sui siti ufficiali, ricomparso da un'altra porta.
- **Il portale non ha un indirizzo per singola struttura.** L'applicazione non legge parametri
  dall'URL: qualsiasi `?id=` viene ignorato. Il rimando alla disponibilità porta quindi alla
  ricerca del portale e il testo dice quale comune cercare — un link finto sarebbe stato peggio.

**Resta da fare:** inviare la richiesta all'URP (bozza qui sopra) e valutare la pagina di
attribuzione sul modello di `/dati/osm`, che con più fonti in CC-BY comincia ad avere senso come
pagina unica delle provenienze.

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
