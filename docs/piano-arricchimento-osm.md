# Piano — giro di arricchimento OSM dell'ondata 4

Preparato il 26/08/2026, da eseguire **insieme** all'import dell'ondata 4, nella sessione che il
semaforo GSC sbloccherà. Tutti i numeri qui sotto sono contati sul database di produzione in sola
lettura, non stimati.

## Perché serve, in una tabella

La soglia di indicizzazione è **60 punti**. Una struttura con nome, indirizzo e descrizione ne ha
20; il telefono ne vale 25, email o sito 15, le coordinate 10, i posti letto 10, i prezzi 15.

Oggi in produzione ci sono **704 strutture sotto soglia** su 1.773, e l'ondata 4 ne aggiungerebbe
altre **362**. Sono pagine che esistono, si raggiungono, ma portano `noindex` e restano fuori dalla
sitemap: lavoro fatto che non produce traffico.

| Fonte | Sotto soglia | Punteggio medio | Cosa manca |
| --- | ---: | ---: | --- |
| `opendata_lombardia` (RSA) | 356 / 740 | 48 | telefono a tutte, email o sito a 163 |
| `opendata_lombardia_cdi` (centri diurni) | 298 / 298 | 40 | telefono e contatti web a tutte |
| **`opendata_campania`** | **34 / 34** | **30** | telefono, contatti web **e coordinate** a tutte |
| `opendata_friuli` | 6 / 166 | 40 | telefono e contatti web |
| `opendata_umbria` | 3 / 61 | 42 | contatti web, coordinate |
| `opendata_trentino` | 3 / 85 | 52 | contatti web |
| `portale_rsa_toscana` | 2 / 334 | 30 | telefono e contatti web |
| `opendata_lombardia_sociale` | 2 / 55 | 48 | telefono |
| **totale in produzione** | **704** | — | — |
| *Emilia-Romagna (ondata 4)* | *291 / 1.284* | *45* | *solo email o sito: hanno già il telefono* |
| *Calabria (ondata 4)* | *71 / 71* | *43* | *email o sito, e coordinate* |

**Tutte e 704 supererebbero la soglia con telefono ed email presi da OSM.** Non è una previsione
ottimistica: è il calcolo del punteggio con quei due campi valorizzati, fatto struttura per
struttura.

## Correzione del 26/08/2026: misurato, e il piano qui sotto non regge

Le tre sezioni che seguono sono state scritte prima di provare gli endpoint. Provati, danno numeri
che cambiano la conclusione. **Si conservano perché il ragionamento resta valido — è la premessa a
essere falsa** — ma la strategia operativa è quella della sezione finale, non questa.

**Geocodifica: funziona solo in Emilia-Romagna.** Campione reale su Nominatim, query strutturate
con via e comune:

| Regione | Vie risolte | Perché |
| --- | --- | --- |
| Emilia-Romagna | **6 / 8** | vie urbane, ben mappate |
| Calabria | **0 / 8** | indirizzi come «Contrada Frailliti», «C.da Dema»: le contrade non sono vie in OSM |
| Campania | **0 / 3** | stesso problema: contrade e strade rurali |

Il centroide del comune si ottiene sempre, ma **non va usato**: metterebbe la struttura al municipio
invece che dove sta, e assegnerebbe 10 punti di completezza a una coordinata che non è sua. È
inventare un dato, e CLAUDE.md lo vieta.

**Contatti in OSM: troppo pochi per essere la leva.** Interrogazione Overpass per provincia su tutte
le `amenity=social_facility` e assimilate:

| Provincia | Elementi | Con nome | Con telefono | Con sito | Con email | Nostre strutture lì |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Bologna | 101 | 97 | **17** | 31 | **7** | 309 |
| Cosenza | 19 | 14 | **0** | 1 | 0 | 27 |

A Bologna, la provincia dove abbiamo più strutture di tutta l'ondata 4, OSM offre diciassette numeri
di telefono e sette email **in totale**, e non tutti riferiti a strutture per anziani. A Cosenza,
zero. Anche con un abbinamento perfetto, il raccolto sarebbe di poche decine di campi su 1.355
strutture.

**Conseguenza.** Il giro OSM non è il modo per portare le schede sopra soglia. Resta utile come
supplemento — è gratuito, è ODbL, e dove il match c'è il dato è buono — ma non va messo sul percorso
critico dell'ondata 4, e soprattutto non va promesso come la soluzione delle 704 schede sotto soglia.

---

## L'ostacolo che va risolto prima: le coordinate

`scripts/enrich-osm.mjs` fa una query Overpass per provincia e poi **abbina per prossimità**: cerca
l'elemento OSM più vicino entro 400 metri e ne misura la somiglianza del nome. È una strategia
solida — ha prodotto match ad alta confidenza in Lombardia e Toscana — ma ha un requisito che qui
non è soddisfatto:

> **senza `lat`/`lng` la struttura non entra nemmeno nel confronto.**

Emilia-Romagna, Calabria e Campania non pubblicano coordinate. Sono **1.389 strutture** che il giro
di arricchimento, così com'è, salterebbe in silenzio. Il piano deve quindi avere due tempi.

### Tempo 1 — geocodifica degli indirizzi (Nominatim)

Nominatim è il geocoder di OpenStreetMap, stessa licenza ODbL dei dati che già ripubblichiamo con
attribuzione. La sua *usage policy* è esplicita e va rispettata alla lettera, o l'IP viene bloccato:

- **massimo una richiesta al secondo**, senza parallelismo
- User-Agent che identifica l'applicazione e un recapito — quello che `scripts/lib/web.mjs` già usa
- risultati memorizzati localmente, per non richiedere due volte la stessa cosa

Con ~1.400 indirizzi e una pausa di 1,1 secondi si parla di **circa 26 minuti**, una volta sola.
Lo snapshot dei risultati va scritto in `data/` come per le altre fonti, così la geocodifica è
riproducibile e non si ripete a ogni import.

Attenzione a due cose:

- **l'indirizzo va composto per esteso** — via, civico, comune, provincia, "Italia" — perché
  Nominatim su "Contrada Frailliti" da solo restituisce mezza Calabria
- **il risultato va verificato**, non accettato: se il punto restituito cade fuori dal comune
  dichiarato, si scarta. Una coordinata sbagliata mette la struttura sulla mappa di un'altra città,
  ed è un errore che si vede

La geocodifica da sola vale 10 punti: porta l'Emilia-Romagna da 45 a 55 e la Calabria da 45 a 55.
**Non basta a superare la soglia**, ma è ciò che permette al tempo 2 di funzionare.

### Tempo 2 — arricchimento contatti da OSM

Con le coordinate a posto, `npm run enrich:osm` lavora come ha già fatto per Lombardia e Toscana:
una query Overpass per provincia — non per struttura — matching in locale, e **mai** sovrascrittura
di un campo già valorizzato. I match a confidenza media finiscono in
`data/osm-match-da-rivedere.json` per il controllo umano, come già avviene.

Le province nuove da coprire sono 14: le 9 emiliano-romagnole, le 5 calabresi. La Campania è già
coperta dal giro esistente ma le sue 34 strutture non erano state raggiunte per mancanza di
coordinate: con il tempo 1 rientrano.

### Tempo 3, facoltativo — siti ufficiali

`scripts/enrich-siti.mjs` cerca il sito ufficiale della struttura e ne estrae i recapiti fattuali,
onorando robots.txt. È il ripiego per chi resta senza contatti dopo OSM. Vale la pena farlo girare
solo sulle strutture ancora sotto soglia a valle del tempo 2, non su tutte: è il passaggio più
lento e più fragile dei tre.

## Ordine di esecuzione dentro la sessione dell'ondata 4

L'ordine non è indifferente, perché ogni passo abilita il successivo:

1. **import** di Emilia-Romagna e Calabria — le strutture devono esistere prima di poterle
   arricchire
2. **geocodifica** delle strutture senza coordinate: Emilia-Romagna, Calabria, Campania e i pochi
   residui di Umbria e Trentino
3. **arricchimento OSM** su tutte le province scoperte
4. **ricalcolo del punteggio** e conteggio di quante schede hanno superato la soglia
5. `/verifica` completo, build, push e **deploy verificato con i tre SHA** — regola anti-deriva:
   la sessione scrive sul database di produzione, quindi non è finita finché la produzione non
   serve quel commit

Il punto 4 non è cerimoniale: è la misura del ritorno del giro. Se dopo l'arricchimento le schede
sopra soglia non crescono in modo sensibile, il problema non è nei dati ma nella strategia di
matching, e va affrontato prima di aggiungere altre regioni.

## La strategia corretta, dopo le misure

### Dove sta davvero il problema

Le 704 schede sotto soglia non sono distribuite: **654 sono lombarde** — 356 RSA e 298 centri
diurni — e mancano di telefono. Le altre 50 sono briciole sparse. L'ondata 4 ne aggiunge 362, ma di
natura diversa: le 291 emiliano-romagnole hanno già il telefono e mancano solo di email o sito, le
71 calabresi hanno il telefono e mancano di tutto il resto.

Tradotto in ciò che serve procurare:

| Gruppo | Quante | Cosa manca | Quanto vale |
| --- | ---: | --- | --- |
| Lombardia RSA + CDI | 654 | telefono (e spesso anche web) | 25 punti: da 40-48 a 65-73 |
| Emilia-Romagna | 291 | **solo** email o sito | 15 punti: da 45 a 60, esattamente la soglia |
| Calabria | 71 | email o sito, coordinate | 15 punti bastano: da 45 a 60 |
| Campania | 34 | telefono, web, coordinate | servono almeno telefono + web |

L'Emilia-Romagna e la Calabria sono i casi più facili di tutti: **un solo campo** le porta sopra
soglia, e quel campo è il sito ufficiale della struttura.

### La leva giusta: i siti ufficiali, non OSM

`scripts/enrich-siti.mjs` esiste già, cerca il sito ufficiale di una struttura e ne estrae i
recapiti fattuali onorando robots.txt. Era classificato come «tempo 3, facoltativo». Le misure lo
promuovono a **strumento principale**, per una ragione semplice: una casa di riposo con 60 posti
letto ha quasi sempre un sito o almeno una pagina, mentre quasi mai qualcuno l'ha mappata su
OpenStreetMap con il numero di telefono.

Ordine rivisto per la sessione dell'ondata 4:

1. **import** di Emilia-Romagna e Calabria
2. **`enrich:siti`** sulle 362 nuove sotto soglia — è il passo che decide il ritorno dell'ondata
3. **`enrich:osm`** solo dove le coordinate ci sono già (Lombardia, Toscana, Friuli, Trentino):
   costa poco e qualcosa raccoglie
4. **geocodifica** limitata all'Emilia-Romagna, e solo se serve al punto 3 — non per i 10 punti,
   che da soli non bastano a superare la soglia
5. ricalcolo delle schede sopra soglia, `/verifica`, deploy verificato coi tre SHA

### Cosa aspettarsi, detto prima

Se `enrich:siti` trova il sito a metà delle 362 nuove, l'ondata 4 chiude con circa **1.170 schede
indicizzabili su 1.355** invece di 993. Se ne trova a un quinto, si chiude a 1.065. Il numero va
misurato al punto 5 e confrontato con questa previsione: se resta sotto, il problema non è nei dati
ma nella strategia di ricerca dei siti, e va affrontato prima di aggiungere altre regioni.

**La Calabria va importata sapendo che le sue 71 schede nasceranno sotto soglia** e forse ci
resteranno. Non è un motivo per rinunciare: le 62 pagine comune calabresi hanno contenuto proprio —
elenco, statistiche, FAQ generate dai dati — e sono indicizzabili comunque. Ma va detto adesso,
invece di scoprirlo dopo l'import.

## Cosa non fare

- **Niente Google Places**, per popolare o per arricchire: i termini vietano l'uso in un servizio di
  directory. È scritto in CLAUDE.md e non cambia perché farebbe comodo.
- **Niente sovrascrittura** di un campo già valorizzato da una fonte regionale: l'open data della
  Regione ha più autorità di un tag OSM inserito da un volontario.
- **Niente campo OSM senza `fonte_contatti`**: l'obbligo di attribuzione ODbL si assolve sapendo
  sempre quale campo viene da lì, ed è ciò che alimenta `/dati/osm/`.
- **Niente abbassamento della soglia** per far salire il conteggio. La soglia esiste perché una
  scheda povera indicizzata abbassa la qualità percepita del dominio: è esattamente il segnale
  «scansionata, attualmente non indicizzata» che il semaforo GSC ci insegna a temere.
