# Directory RSA Italia — Contesto progetto

## Cosa stiamo costruendo
Directory web delle strutture per anziani in Italia (RSA, case di riposo, centri diurni, assistenza domiciliare), ispirata al modello A Place for Mom / Caring.com. Modello di business: traffico SEO organico → lead generation per le strutture → in futuro SaaS gestionale.

## Obiettivo
10.000 visite organiche/mese entro 12-16 mesi tramite SEO programmatica su query "[servizio] + [città]" e guide informative per le famiglie caregiver.

## Stack tecnico
- Next.js (App Router) + TypeScript
- Postgres su Supabase
- Tailwind CSS
- Guide/articoli in MDX
- Deploy: Vercel

## Struttura URL (non modificare senza chiedere)
- `/[tipologia]/[regione]/[provincia]/[comune]/` → pagine lista geografiche (es. `/rsa/lombardia/milano/milano/`)
- `/[tipologia]/[regione]/` e `/[tipologia]/[regione]/[provincia]/` → pagine hub intermedie
- `/struttura/[slug]/` → scheda singola struttura
- `/guide/[slug]/` → articoli informativi
- Tipologie valide: `rsa`, `casa-di-riposo`, `centro-diurno`, `assistenza-domiciliare`

## Schema dati — tabella `strutture` (campi minimi)
nome, slug (unico), tipologia, indirizzo, cap, comune, provincia, regione, lat, lng, telefono, email, sito_web, posti_letto, convenzionata (bool), nucleo_alzheimer (bool), prezzo_min, prezzo_max, descrizione, fonte_dati, updated_at

## Regole SEO (priorità massima)
- Ogni pagina hub linkata da nav/footer/breadcrumb deve esistere e rispondere 200 — mai link a rotte non implementate
- Eseguire /verifica prima di ogni commit che tocca routing, template o dati
- Nessuna pagina si pubblica con contenuto sotto le 100 parole utili: meglio non pubblicarla
- Ogni retta mostrata dichiara la natura del dato: "Fonte: carta dei servizi [anno], ultimo controllo [data]" con link al documento originale sul sito della struttura, più la dicitura "tariffa indicativa: verificare con la struttura"; se la carta ha più di 2 anni la dicitura diventa "tariffa storica"
- Rette convenzionate e rette private si mostrano sempre distinte, con etichette esplicite: mai mescolate né presentate come un unico prezzo
- Medie e mediane si calcolano e pubblicano solo entro la stessa fonte e lo stesso concetto tariffario; nessun confronto tra regioni o fonti diverse senza nota metodologica esplicita (un mensile letto in una carta dei servizi e un mensile calcolato da una tariffa giornaliera dichiarata alla Regione non sono la stessa grandezza: dove convivono, le popolazioni si mostrano separate)
- Ogni pagina ha title, meta description e H1 unici, generati dai dati (mai duplicati)
- JSON-LD schema.org su ogni scheda struttura (LocalBusiness) e su ogni guida (Article + breadcrumb)
- Sitemap.xml dinamica, divisa per tipo di pagina; robots.txt corretto
- Pagine statiche (SSG/ISR), veloci, Core Web Vitals verdi
- Breadcrumb e internal linking automatico: città ↔ strutture ↔ guide correlate
- Mai pubblicare pagine vuote: una pagina comune esiste solo se contiene almeno 1 struttura

## Convenzioni di lavoro
- Lingua del sito, dei contenuti e dei commit: italiano
- Commit piccoli e frequenti; un task per sessione
- Eseguire `npm run build` e sistemare gli errori prima di dichiarare concluso un task
- Mai inventare dati sulle strutture: solo dati da fonti reali (open data regionali, Google Places API); i dati demo vanno marcati come tali
- Ogni sessione che scrive sul database di produzione termina con push e deploy verificati: la sitemap è dinamica e le pagine sono statiche, quindi dati nuovi senza redeploy fanno dichiarare a Google URL che rispondono 404. Verificato significa controllato, non lanciato: `git ls-remote origin main` deve coincidere con `HEAD`, e la produzione deve servire quel commit
- `/verifica` confronta il commit deployato (`/api/versione`) con `HEAD` e fa uno spot-check su una URL nuova in produzione, cioè una che esiste solo grazie ai dati o al codice di questa sessione
- Dopo ogni modifica alle variabili d'ambiente la verifica di produzione include le **sonde runtime**, mai solo pagine statiche: le pagine statiche sono state generate prima della modifica e risponderebbero 200 anche con una credenziale morta. Le sonde sono `/sitemap.xml` e `/dati/osm/`, che leggono il database a ogni richiesta; la sitemap si controlla per prima
- Le migrazioni di credenziali si chiudono con `/verifica` completo, non con script ad hoc: uno script scritto per l'occasione prova quello che chi lo scrive si aspetta, e non ciò che ha dimenticato

## Fonti dati
- **Google Maps/Places non può essere usato per popolare o arricchire il database né per mostrare contenuti nella directory (vietato dai termini per i listing service); unico uso consentito nel progetto: autocomplete indirizzi nei form**
- OpenStreetMap (ODbL): consentito salvare e ripubblicare con attribuzione; i campi che arrivano da OSM vanno sempre marcati in `fonte_contatti`
- Open Data Regione Lombardia: elenco RSA accreditate (CSV)
- Portale RSA Toscana, tabelle mensili Regione Piemonte, open data Friuli-Venezia Giulia / Umbria / Trentino
- Siti ufficiali delle strutture e dei gestori: solo dati fattuali di contatto (telefono, email, PEC, indirizzo), mai testi descrittivi; robots.txt onorato e provenienza registrata in `fonte_contatti`

## Fuori scope per ora (fase 2, non implementare)
- Autenticazione utenti e area riservata per le strutture
- Recensioni utenti, pagamenti, SaaS gestionale
