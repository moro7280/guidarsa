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
