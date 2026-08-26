# Piano — Ondata 3 e calendario delle successive

Ricognizione del 25/08/2026. Ogni riga della tabella è stata verificata interrogando davvero
l'endpoint o scaricando davvero il file: dove c'è scritto un numero di strutture, quel numero è
stato contato, non stimato. Dove non è stato possibile verificare, è scritto.

**Nessun import parte da qui.** Questo documento serve a decidere, non a eseguire: l'ondata 3
comincia solo con approvazione esplicita e con il semaforo GSC verde (criteri in fondo).

## Il quadro in una riga

Delle nove regioni su cui mancava il dettaglio, **tre hanno una fonte pronta all'uso**
(Trentino, Bolzano, Calabria), **una è frammentata ma recuperabile** (Marche), **cinque non hanno
open data utilizzabili** (Liguria, Abruzzo, Basilicata, Molise, Valle d'Aosta). Il paracadute
ministeriale **non esiste** nella forma che speravamo. In compenso la ricognizione ha trovato tre
fonti non previste — Sicilia, Campania, Lazio — e la Sicilia si sblocca da sola.

## 1. Le nove regioni mancanti

| Regione | Fonte verificata | Formato | Licenza | Freschezza | Strutture utili | Contatti | Coord. | Esito |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Trentino** | APSS `SANSTRUT001.csv` | CSV | CC-BY 4.0 | metadato **2021** | **87** (59 res. + 28 semires.) | tel, email e sito su 87/87 | sì, WGS84 | **pronta** |
| **Bolzano** | WFS GeoServer `p_bz-Health:RestHomes` | GeoJSON via WFS | **CC0** | 2025-04 | **79** | nessuno | sì, **EPSG:25832** | **pronta** |
| **Calabria** | Registro strutture private accreditate | CSV `;` | CC-BY 4.0 | **2026-03** | **89** (R1 9, R2 48, R3 32) | tel 119/137, PEC | no | **pronta** |
| **Marche** | un CSV **per comune** + PDF regionale CUR 2022 + ORPS | CSV frammentati | CC-BY 4.0 | variabile per comune | ~1 per file | tel, email, sito, coord. nel tracciato | sì | frammentata |
| **Liguria** | ALISA, «strutture sanitarie e sociosanitarie accreditate» | XLS in amministrazione trasparente | non dichiarata | non verificabile | ignoto | ignoto | no | **niente open data** |
| **Abruzzo** | portale sanità: pagine HTML e PDF | HTML/PDF | non dichiarata | — | ignoto | — | no | **niente open data** |
| **Basilicata** | Elenco strutture sanitarie accreditate | CSV | CC-BY | 2026-01 | **3 su 75** | no | no | **inutilizzabile** |
| **Molise** | nessuna fonte trovata | — | — | — | — | — | — | **nulla** |
| **Valle d'Aosta** | pagine `regione.vda.it` | HTML | non dichiarata | — | ignoto | — | no | **niente open data** |

### Le tre pronte, nel dettaglio

**Trentino — la più ricca, ma dichiara 2021.** `https://servizi.apss.tn.it/opendata/SANSTRUT001.csv`,
258 righe, tutte le strutture sanitarie pubbliche e accreditate della Provincia. Filtrando
`ASSISTENZA = "ASSISTENZA AGLI ANZIANI"` restano 87 strutture in 47 comuni: 59 con
`TIPO_STRUTTURA = STRUTTURA RESIDENZIALE` → `rsa`, 28 semiresidenziali → `centro-diurno`.
Telefono, email e sito web sono presenti su **tutte e 87**, e le coordinate sono già in gradi
decimali WGS84. Il tracciato è quasi identico a quello umbro perché entrambi derivano dal modello
ministeriale STS.11: il mapping è in gran parte una fotocopia.

Il neo è la freschezza: il catalogo dichiara ultimo aggiornamento **12/04/2021**. Non è un dato che
si possa dedurre dal file, quindi va misurato: **prima di importare, spot-check di 10 strutture a
campione** contro il sito ufficiale della struttura. Se reggono, si procede col trattamento-Umbria
(età del dato dichiarata su ogni scheda); se non reggono, si scrive all'APSS
(`opendata@apss.tn.it`) prima di pubblicare.

**Bolzano — nessun contatto, ma CC0 e coordinate.** Non è un file: è un servizio WFS.
`https://geoservices1.civis.bz.it/geoserver/p_bz-Health/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=p_bz-Health:RestHomes&outputFormat=application/json`
risponde con **79 feature**. Ogni feature ha nome in italiano e tedesco (`NAME_IT`/`NAME_DE`),
via bilingue, numero civico, CAP, comune bilingue e **codice ISTAT** — quindi il join con
`istat-comuni.csv` funziona come per l'Umbria.

Due avvertenze tecniche vere: le coordinate sono `X = 669996, Y = 5183707`, cioè **UTM 32N
(EPSG:25832), non WGS84**, e vanno riproiettate prima di scriverle in `lat`/`lng`; e **non c'è né
telefono né email**, quindi tutte e 79 le schede nascerebbero sotto la soglia di completezza a meno
di arricchirle con OSM e siti ufficiali. La licenza CC0 è la più permissiva incontrata finora.

**Calabria — la più fresca.** CSV con separatore `;`, 772 righe, aggiornato **14/03/2026**. La
colonna `TIPOLOGIA_STRUTTURA` è pulita e già mappabile:

| Valore | Righe | Nostra tipologia |
| --- | --- | --- |
| `RESIDENZA SANITARIA ASSISTENZIALE PER ANZIANI (R2)` | 48 | `rsa` |
| `CASA PROTETTA PER ANZIANI (R3)` | 32 | `casa-di-riposo` |
| `RESIDENZA SANITARIA ASSISTENZIALE MEDICALIZZATA (R1)` | 9 | `rsa` |

> **Corretto il 26/08:** sono **71**, non 89. Il conteggio qui sotto veniva da una lettura del CSV
> che ignorava i campi su più righe, e nove strutture erano contate due volte perché accreditate
> insieme come R2 e come R3. Il livello R1 per anziani non esiste: l'unico R1 è l'hospice. Dettagli
> nella sezione 4-bis.

**89 strutture** in un'ottantina di comuni, con `NUMERO_TELEFONO` su 119 righe su 137 del blocco
residenziale e la PEC del gestore — utile per l'arricchimento gestori già in piedi. Mancano le
coordinate. Da escludere esplicitamente le righe RD4/RD5 (disabili) e SRP (psichiatriche): sono
residenziali ma non per anziani, e finirebbero in pagine che mentono.

### Le altre sei, e perché non entrano

**Marche** è l'unica frammentata invece che assente, ed è un caso curioso: l'elenco regionale non
esiste come dataset unico, ma **ogni comune pubblica il proprio** sulla rete di siti comunali, con
un tracciato identico (`C_<codice>_dataset_rsa-case-di-riposo_<timestamp>.csv`) che contiene
titolo, tipologia, comune, indirizzo, telefono, email, sito, latitudine e longitudine. Verificato
su Camerino: un file, una struttura, campi pieni. Il tracciato include anche `Responsabile`,
`Presidente` e `Direttore` — **dati personali che non entrano nel database**, come già deciso per il
direttore sanitario toscano. Per coprire la regione servirebbe enumerare i comuni marchigiani che
pubblicano, e la copertura resterebbe parziale e non misurabile in anticipo. L'alternativa
ufficiale è l'«Elenco strutture con codice CUR al 31/12/2022», che però è un **PDF**.
**Rinviata all'ondata 5**, quando il costo di un raccoglitore multi-sorgente sarà ammortizzato da
Veneto ed Emilia-Romagna.

**Basilicata** ha un dataset ma non serve: 75 righe totali, di cui **3** citano RSA o anziani, in 3
comuni. Pubblicare tre schede non fa una regione.

**Liguria, Abruzzo, Valle d'Aosta** hanno gli elenchi — ALISA li tiene per area di interesse, con
posti letto per ASL — ma li pubblicano come XLS in amministrazione trasparente o come pagine HTML,
senza licenza dichiarata e senza un endpoint stabile. Sono lavoro da fonte non-open: fattibile, ma
è un altro mestiere rispetto a scaricare un CSV, e va trattato come tale.

**Molise**: nessuna fonte trovata, né aperta né in trasparenza. Da riprovare fra sei mesi.

## 2. Il paracadute ministeriale: non c'è

**Verificato: il Ministero della Salute non pubblica alcun elenco di strutture residenziali o
semiresidenziali a livello di singola struttura.**

I dataset aperti del Ministero censiti nel catalogo nazionale sono **51**, e riguardano farmacie,
parafarmacie, dispositivi medici, distributori di farmaci, fitosanitari, personale delle aziende
sanitarie, apparecchiature e **posti letto ospedalieri**. Sulle strutture residenziali c'è solo
questo, e non basta:

| Dataset | Cosa contiene | Perché non serve |
| --- | --- | --- |
| `Posti letto per struttura ospedaliera` | posti letto ospedalieri | ospedali, non RSA |
| `Posti letto per Regione e disciplina` | aggregato regionale | nessun nome di struttura |
| `Posti letto per stabilimento ospedaliero e disciplina` | stabilimenti ospedalieri | ospedali |

I numeri sulle residenziali — 8.114 strutture residenziali e 3.192 semiresidenziali nel 2023,
326.575 posti letto di cui il 70,1% dedicato agli anziani — vivono **nell'Annuario Statistico del
SSN**, che è una pubblicazione con tavole aggregate per regione, non un elenco.

**Conseguenza sulle regioni senza fonte propria: nessuna può entrare col trattamento-Umbria.** Il
trattamento-Umbria risolve il problema dell'*età* del dato, non quello della sua *inesistenza*: se
il Ministero non dice come si chiama una struttura e dove sta, non c'è niente da datare. Liguria,
Abruzzo, Basilicata, Molise e Valle d'Aosta restano fuori finché non si affrontano le loro fonti
non-open.

**Sulla Sicilia la domanda è diventata inutile, ed è la notizia migliore della ricognizione.** La
Regione Siciliana pubblica **due dataset CC-BY 4.0 propri**, entrambi scaricati e contati oggi:

- `anziani.csv` — albo delle istituzioni socio-assistenziali, 1.475 righe con `codice_comune`
  ISTAT su 1.474 di esse: **176 case di riposo, 24 case protette, 6 case albergo** (→
  `casa-di-riposo`, 206 in tutto) e **19 centri diurni**. Fuori restano 107 comunità alloggio —
  stessa decisione presa per gli alloggi protetti friulani, il nostro schema non le descrive senza
  mentire — e 1.090 servizi di assistenza domiciliare, su cui va presa una decisione a parte.
- `f_accr.csv` — strutture accreditate, di cui **42 con attività `R.S.A.`**

I decreti di iscrizione vanno dal 1989 al 2025, con **134 nel decennio in corso**: l'albo è vivo, e
`data_decreto` dà a ogni riga la sua età, che è esattamente ciò che serve al trattamento-Umbria.
Mancano telefoni e coordinate. **La Sicilia non ha bisogno di una verifica di esistenza: ha una
fonte regionale, ed è una candidata seria per l'ondata 4.**

L'unico uso sensato che resta dei dati ministeriali è **come denominatore**: sapere che in una
regione il Ministero conta N strutture residenziali dice quanta parte ne stiamo coprendo. È un
controllo di qualità della copertura, non una sorgente. Vale la pena estrarlo dall'Annuario una
volta e tenerlo come tabella di riferimento, non come import.

## 3. Veneto, Emilia-Romagna, Piemonte

### Emilia-Romagna — endpoint trovato, il connettore è scrivibile

**Aggiornamento del 25/08/2026: la ricognizione tecnica è chiusa, con esito positivo.**

`reporter.regione.emilia-romagna.it` **non ha un robots.txt**: la richiesta risponde 302 e rimanda
all'applicazione stessa. Il robots.txt del dominio regionale principale non contiene alcun
divieto che ci riguardi — solo `crawl-delay` per gigabot e googlebot e qualche percorso di ricerca.
Nessun ostacolo, quindi, ma nemmeno un permesso esplicito: le pause fra le richieste restano
d'obbligo.

Gli endpoint non erano nei chunk caricati all'avvio, perché la rotta `/flusso/` li carica in
differita. Sono stati catturati dal traffico di rete della pagina:

| Chiamata | Cosa fa |
| --- | --- |
| `GET /ReportERHomeService/methods/viewer/ViewerWizard?id=1001` | definizione del flusso: titolo «Banca dati sui Presidi socio-assistenziali», nome interno `PRS`, e tutti i filtri disponibili |
| `POST /ReportERHomeService/methods/viewer/ViewerResult?id=1001` | **i dati**: elenco di record con recapiti, ente titolare ed ente gestore |

I filtri del wizard sono a cascata e già codificati: `DII_507` provincia (le nove sigle
emiliano-romagnole), `DII_508` distretto, `DII_509` **comune, per codice ISTAT**, `DII_686`
denominazione in testo libero. Il che significa che la strategia di raccolta è la stessa della
Toscana — si enumera per comune e si deduplica — e che il join con `istat-comuni.csv` funziona
senza traduzioni.

Ogni record restituito ha `title` (denominazione), `subTitle` con **la tipologia** e un `content`
con codice struttura, indirizzo, telefono, email, azienda USL, distretto, ente titolare ed ente
gestore completi di indirizzo e recapiti. Senza filtri il flusso restituisce tutti i presidi
socio-assistenziali, compresi i centri antiviolenza: il filtro per tipologia è quindi obbligatorio,
e va impostato prima ancora di contare le righe.

Nell'interfaccia esiste anche un pulsante «Esporta Dati in formato ZIP», che vale la pena
intercettare nella sessione del connettore: se produce un export completo, evita del tutto le
richieste per comune.

**Stima aggiornata: la mezza sessione di ricognizione è consumata e ha dato il risultato. Resta
una sessione per il connettore**, con due incognite già circoscritte — il corpo esatto della POST
e la tipologia da selezionare.

### Emilia-Romagna — la ricognizione preliminare (20/08)

Il dataset ufficiale esiste ed è censito: **«Banca dati sui Presidi socio-assistenziali della
Regione Emilia-Romagna»**, licenza **CC-BY 2.5**, aggiornata 08/08/2025. Ma la sua unica risorsa
non è un file: è il link al viewer
`https://reporter.regione.emilia-romagna.it/ReportER/viewer/flusso/1001`.

Verificato oggi: la pagina risponde 200 ed è un'applicazione **Angular** con bundle a nomi hashati
(`main-4NCHDDCZ.js` più cinque chunk). Il fatto decisivo è che **il catalogo dichiara i formati
`HTML, CSV`**: se ReportER espone un export CSV, l'endpoint esiste già e va solo trovato dentro il
bundle — la stessa tecnica che ha smontato il Portale RSA toscano in mezza sessione.

Una cautela: `reporter.regione.emilia-romagna.it/robots.txt` risponde **302**, quindi il file non è
stato letto. Va risolto il redirect e letto il robots.txt di destinazione **prima** di interrogare
qualsiasi endpoint: la regola di CLAUDE.md sul rispetto di robots.txt non ammette scorciatoie.

**Stima: mezza sessione per trovare l'endpoint, una per il connettore.** Se l'endpoint non
esistesse, si ricade sulla banca dati provinciale e la stima raddoppia.

### Veneto — la più incerta

Il catalogo regionale `dati.veneto.it` è stato interrogato: **non contiene alcun elenco di
strutture per anziani**. Le uniche cose che escono cercando «anziani» sono conti annuali del
personale comunale e la statistica «Famiglie con anziani». Restano le due piste già annotate nel
piano toscano: il WordPress di `demenze.regione.veneto.it` con i dati della mappa probabilmente
dietro `admin-ajax.php` (consentito dal suo robots.txt), e gli elenchi PDF delle autorizzate e
accreditate su `salute.regione.veneto.it`.

**Stima: una sessione di ricognizione, una per il connettore** — con il rischio concreto che la
ricognizione si chiuda con «solo PDF», che è un mestiere diverso.

### Piemonte — la pista di CLAUDE.md è morta

CLAUDE.md cita «tabelle mensili Regione Piemonte». Verificato oggi: il portale storico dei presidi,
`regione.piemonte.it/cgi-bin/polsoc/ricerca/presidi/index.cgi`, che ospitava oltre 780 strutture,
**risponde 404**. È stato dismesso o spostato.

Quello che resta, verificato:
- `Elenco strutture sanitarie private accreditate` su smartdatanet, CSV, CC-BY, **ma inutile**:
  487 righe di cui solo **15 `RESIDENZIALE` e 6 `SEMIRESIDENZIALE`**, il resto ambulatori e case di
  cura. Non è la rete socio-sanitaria degli anziani.
- gli elenchi PDF delle strutture aderenti alla misura «Scelta Sociale», aggiornati fino al 2024
- l'aggiornamento dell'elenco socio-sanitario pubblicato a marzo 2026, di cui va trovata la forma

**Stima: una sessione intera solo per capire dove sia finito l'elenco**, prima ancora di stimare il
connettore. È la meno pronta delle tre, nonostante fosse quella che credevamo di avere già.

## 4. Proposta: composizione dell'ondata 3

**Una vittoria veloce e l'avvio di una grande, come da impostazione.**

### Vittoria veloce: Trentino

87 strutture, 47 comuni, contatti completi su tutte, coordinate già in WGS84, tracciato quasi
identico a quello umbro. È l'unica fonte in cui **ogni struttura nasce già sopra la soglia di
completezza** — quindi 87 pagine indicizzabili, non 87 pagine da arricchire dopo. Ed è già citata
fra le fonti in CLAUDE.md.

Il lavoro reale: mapping (poche ore, è una variante dell'umbro), spot-check di freschezza su 10
strutture, import, `/verifica`, push e deploy verificati.

Perché non Calabria come vittoria veloce, che pure è più fresca: senza coordinate e senza email, le
89 schede calabresi nascerebbero più povere, e la Calabria merita di entrare insieme a un giro di
arricchimento OSM. Va in ondata 4, dove il costo dell'arricchimento è condiviso con la Sicilia.

### Grande da avviare: Emilia-Romagna

Solo la **fase di ricognizione tecnica**: leggere il bundle Angular di ReportER, trovare l'endpoint,
risolvere il 302 di robots.txt e verificarne il contenuto, documentare il tracciato. Il connettore
si scrive nell'ondata 4. Se l'endpoint non salta fuori in mezza sessione, si ferma e si annota:
meglio una ricognizione che si chiude con «non trovato» che un connettore fragile.

### Calendario, ritmo 7-14 giorni

| Ondata | Quando | Contenuto | Perché |
| --- | --- | --- | --- |
| **3** | ~~approvazione + GSC verde~~ **fatta il 25/08/2026** | **Trentino** (85 importate su 87) + **Campania** (34) + ricognizione tecnica **Emilia-Romagna**: endpoint trovato | vittoria veloce e completa; apre la più promettente delle grandi |
| **4** | +7-14 gg, a semaforo verde | **Emilia-Romagna** (1.284) + **Calabria** (71) + giro OSM — connettori pronti e collaudati il 26/08, stima esatta sotto | la grande si chiude; la Calabria entra col giro OSM |
| **5** | +7-14 gg | **Sicilia** (~225 + 42) + **Bolzano** (79) | due fonti proprie; Bolzano porta la riproiezione UTM, la Sicilia il trattamento-Umbria su `data_decreto` |
| **6** | +7-14 gg | **Veneto**: ricognizione e, se va, connettore | la più incerta, affrontata quando il raccoglitore multi-sorgente è maturo |
| **7** | +7-14 gg | **Piemonte**: caccia all'elenco + **Marche** frammentata | le due che richiedono lavoro di indagine, non di trasporto |
| **poi** | da valutare | Liguria, Abruzzo, Valle d'Aosta da fonti non-open; Lazio, Campania, Puglia dai dataset trovati oggi | fonti non-open: mestiere diverso, si decide dopo |

Le regioni fuori tabella ma già verificate oggi e pronte quando servisse: **Campania** (44 RSA
accreditate con colonne `RSA_ANZIANI` e `RSA_DEMENZE` — quest'ultima riempirebbe `nucleo_alzheimer`
con un valore vero), **Lazio** (71 righe che citano RSA o anziani, 586 righe su 1.073 con
coordinate), **Puglia** (registri regionali socio-assistenziali in CSV; attenzione, diversi link del
catalogo sono `goo.gl` ormai dismessi e vanno sostituiti).

## 4-bis. Ondata 4: i connettori sono pronti, i numeri sono contati

Sessione del 26/08/2026, di sola costruzione: nessuna scrittura sul database, nessun import. Le
cifre che seguono vengono da prove a secco sui dati veri, non da stime.

### Emilia-Romagna — 1.284 strutture

La ricognizione prevedeva di girare i 312 comuni. Non serve: il servizio accetta un filtro per
macroarea e destinatari, quindi **due sole richieste** coprono tutta la regione — "Residenziale +
Anziani" e "Semiresidenziale + Anziani". Il corpo della POST è un oggetto di otto filtri, e i
valori vanno rimandati **riempiti di spazi fino a 100 caratteri** esattamente come li manda il
servizio: senza il riempimento la risposta torna vuota, ed è la cosa che fa perdere più tempo.

Dalle 1.579 righe raccolte restano **1.284 strutture**: 438 RSA, 548 case di riposo, 298 centri
diurni, in **267 comuni** e tutte e 9 le province. Le 295 escluse sono comunità alloggio, alloggi
con servizi e gruppi appartamento: soluzioni abitative, non strutture assistenziali — stessa
decisione presa per gli alloggi protetti friulani.

| Campo | Copertura |
| --- | --- |
| telefono | **1.283 / 1.284** |
| email | 993 / 1.284 |
| descrizione ≥ 40 parole | 1.284 / 1.284 |
| coordinate, posti letto, prezzi | nessuno |

**993 su 1.284 (77%) nascono sopra soglia.** Le 291 sotto sono esattamente quelle senza email:
hanno 45 punti e ne servono 60.

Campione su tre province: Bologna 309 strutture in 53 comuni (240 sopra soglia), Parma 139 in 36
comuni (130 sopra soglia), Rimini 56 in 18 comuni (42 sopra soglia).

Il registro attesta l'**autorizzazione al funzionamento**, non l'accreditamento con il servizio
sanitario: `convenzionata` resta quindi `null`, mai `false`.

### Calabria — 71 strutture

Il file ha 531 righe logiche, non 772: i campi del provvedimento di accreditamento sono su più
righe, virgolettati. Delle 80 righe per anziani, **9 sono la stessa struttura contata due volte** —
stesso indirizzo, stesso telefono, accreditata insieme come R2 e come R3. Non sono doppioni da
scartare: sono un edificio solo e meritano una pagina sola, classificata al livello più alto e con
entrambi i livelli dichiarati nella scheda.

Restano **71 strutture fisiche**: 48 RSA (livello R2) e 23 case di riposo (casa protetta, livello
R3), in **62 comuni** e tutte e 5 le province. Telefono su 64, PEC del gestore, nessuna email,
nessuna coordinata: **zero sopra soglia** senza arricchimento.

Sei comuni sono scritti in forme che l'anagrafe ISTAT non riconosce — tre varianti ortografiche
(`Jonio`/`Ionio`, `C.le`, `M.na`) e tre frazioni scritte al posto del comune (Rosalì, Camigliatello
Silano, Cropani Marina). Stanno in una tabella di alias esplicita dentro il mapping, non risolti da
un'euristica: il comune finisce nell'URL e nel breadcrumb, e se sbaglia sbaglia in modo permanente.
**Vanno confermati prima dell'import.**

### Il totale dell'ondata 4

| | |
| --- | ---: |
| strutture nuove | **1.355** |
| di cui sopra soglia all'import | **993** (73%) |
| pagine comune nuove | **633** |
| pagine provincia nuove | 36 |
| pagine regione nuove | 5 |
| schede struttura indicizzabili | 993 |

In URL nuove annunciate a Google: **674 pagine geografiche più 993 schede**, cioè circa **1.667**.
È un salto grosso — la sitemap passerebbe da 2.292 a circa 3.960 — e va soppesato contro le 1.747
URL che oggi Google conosce e non ha ancora scansionato. Se il semaforo dice di andare piano, la
via è spezzare l'ondata: prima la Calabria e una parte dell'Emilia-Romagna, il resto dopo.

Il giro di arricchimento che accompagna l'import è in [piano-arricchimento-osm.md](piano-arricchimento-osm.md).
**Attenzione: la strategia è stata corretta il 26/08 dopo averla misurata.** OSM non è la leva —
a Bologna offre 17 telefoni in tutta la provincia, a Cosenza zero — e la geocodifica funziona
solo in Emilia-Romagna, perché al sud gli indirizzi sono contrade che in OSM non esistono come
vie. La leva è la ricerca dei siti ufficiali: alle 291 emiliano-romagnole e alle 71 calabresi
manca **un solo campo** — email o sito — per superare la soglia.

## 5. Semaforo Google Search Console fra un'ondata e l'altra

Il ritmo di 7-14 giorni non è un calendario da rispettare a prescindere: è il tempo minimo perché
Google dica qualcosa sull'ondata precedente. **Se il semaforo è rosso, l'ondata successiva non
parte**: aggiungere pagine mentre le precedenti non vengono indicizzate peggiora il problema invece
di diluirlo.

Da controllare **prima** di ogni ondata, sull'ondata precedente:

| Criterio | Verde | Giallo | Rosso |
| --- | --- | --- | --- |
| **Indicizzazione delle URL nuove** (Pagine → Indicizzate) | ≥ 60% entro 21 giorni | 30-60% | < 30% |
| **«Rilevata, attualmente non indicizzata»** | stabile o in calo | cresce meno delle indicizzate | cresce **più** delle indicizzate |
| **«Scansionata, attualmente non indicizzata»** | < 15% delle URL nuove | 15-30% | > 30% |
| **Impressioni sulle query della regione nuova** | in crescita | piatte dopo 21 gg | zero dopo 21 gg |
| **Sitemap** | letta senza errori, numero URL coerente col build | avvisi | errori di lettura |
| **Azioni manuali e problemi di sicurezza** | nessuno | — | qualsiasi |
| **Core Web Vitals** (Esperienza sulla pagina) | URL «Buone» stabili o in crescita | peggioramento < 10% | peggioramento > 10% |

Le soglie sono una proposta, non una legge: vanno ritarate dopo la prima ondata misurata davvero,
perché su un sito giovane il 60% a 21 giorni può essere ottimistico.

Due letture che contano più delle percentuali:

- **«Scansionata, attualmente non indicizzata» in crescita è il segnale di thin content.** Google ha
  visto la pagina e ha deciso che non valeva l'indice. Se succede su una regione, il problema è la
  completezza delle schede di quella regione, non la quantità: la risposta è arricchire, non
  aggiungere.
- **Se le impressioni crescono ma i clic no**, il problema è nei title e nelle description, non nei
  dati. Si sistema senza toccare il database.

## 6. Regola anti-deriva

Vale per ognuna delle sessioni qui sopra, senza eccezioni: **ogni sessione che scrive sul database
di produzione si chiude con push e deploy verificati**. La sitemap è dinamica e legge il database
dal vivo, le pagine sono statiche e nascono al build: dati nuovi senza redeploy fanno dichiarare a
Google URL che rispondono 404. È già successo con la Toscana, per cinque giorni e cinquecento URL.

In concreto, alla fine di ogni ondata:

1. `git ls-remote origin main` deve coincidere con `git rev-parse HEAD`
2. `/api/versione/` in produzione deve restituire lo stesso commit
3. spot-check su almeno una URL nuova della regione appena importata: **200**, non «presente in
   sitemap»

Il punto 5 di `/verifica` fa esattamente questo. Non è finita finché i tre SHA non si vedono uguali.

## Fonti della ricognizione

Tutte verificate il 25/08/2026 scaricando il file o interrogando l'endpoint.

- Trentino: [dataset](https://dati.trentino.it/dataset/strutture-sanitarie-dell-azienda-sanitaria-e-convenzionate) · [CSV](https://servizi.apss.tn.it/opendata/SANSTRUT001.csv)
- Bolzano: [portale open data](https://data.civis.bz.it/) · WFS `p_bz-Health:RestHomes` su `geoservices1.civis.bz.it`
- Calabria: [registro strutture accreditate](https://dati.regione.calabria.it/)
- Sicilia: [Elenco RSA e istituzioni socio-assistenziali](https://dati.regione.sicilia.it/)
- Basilicata: [elenco strutture sanitarie accreditate](https://opservice.regione.basilicata.it/opendata/dataset/ElencoStruttureSanitarieAccreditate.csv)
- Emilia-Romagna: [banca dati presidi socio-assistenziali](https://dati.emilia-romagna.it/dataset/banca-dati-sui-presidi-socio-assistenziali-della-regione-emilia-romagna--70348788) · [ReportER](https://reporter.regione.emilia-romagna.it/ReportER/viewer/flusso/1001)
- Liguria: [ALISA, strutture accreditate](https://www.alisa.liguria.it/autorizzazione-accreditamento-qualita/accreditamento-istituzionale/elenco-strutture-sanitarie-e-sociosanitarie-accreditate/documents/strutture-sanitarie-private-accreditate.html)
- Abruzzo: [portale sanità, strutture residenziali](https://sanita.regione.abruzzo.it/canale-assistenza-territoriale/rsa-private)
- Valle d'Aosta: [strutture socio-sanitarie](https://www.regione.vda.it/sanita/servizi_territorio/strutture/default_i.asp)
- Piemonte: [RSA per anziani non autosufficienti](https://www.regione.piemonte.it/web/temi/sanita/sostegno-alle-cure/residenze-sanitarie-assistenziali-per-anziani-non-autosufficienti-rsa)
- Ministero della Salute: [portale open data](https://www.dati.salute.gov.it/) · [Annuario statistico del SSN 2023](https://www.salute.gov.it/new/it/tema/statistiche-sanitarie/annuario-statistico-2023/)
- Catalogo nazionale: [dati.gov.it](https://www.dati.gov.it/)
