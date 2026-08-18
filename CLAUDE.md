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

## Fonti dati
- Open Data Regione Lombardia: elenco RSA accreditate (CSV)
- Portale RSA Toscana, tabelle mensili Regione Piemonte, open data Friuli-Venezia Giulia / Umbria / Trentino
- Google Places API per arricchimento (telefono, foto, coordinate, orari)

## Fuori scope per ora (fase 2, non implementare)
- Autenticazione utenti e area riservata per le strutture
- Recensioni utenti, pagamenti, SaaS gestionale
