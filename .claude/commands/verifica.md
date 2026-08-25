---
description: Verifica completa del progetto — database, sito, integrità dei link, repo
---

Esegui la checklist di verifica del progetto e produci un report finale con esito
**OK** / **PROBLEMA** per ogni punto. Non dichiarare OK ciò che non hai verificato
davvero: se un controllo non è eseguibile, scrivilo.

Regole trasversali:

- Gli script di verifica sono **temporanei**: creali, usali, **eliminali** a fine controllo.
- Non stampare mai il contenuto delle chiavi (`SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`): al massimo dì se sono presenti.
- Al termine il server di produzione va spento (`taskkill` sul PID in ascolto sulla 3000).

## 1. Database

Con uno script temporaneo Node che legge `.env.local` e usa la service role key:

- Verifica che le tabelle `strutture` e `leads` esistano (una risposta `PGRST205`
  significa tabella assente; `GET /rest/v1/` elenca le tabelle esposte).
- Verifica RLS e policy chiamando la RPC dedicata:
  `POST /rest/v1/rpc/verifica_schema` con la service role key (definita in
  `supabase/migrations/20260818_0003_verifica_schema.sql`). Attesi:
  - `strutture` → `rls_attiva: true`, policy `strutture_lettura_pubblica`
  - `leads` → `rls_attiva: true`, policy `leads_inserimento_pubblico`
  Un `PGRST202` significa che la migration della RPC non è stata applicata.
- Controprova con la chiave anon: `select` su `strutture` deve funzionare,
  `select` su `leads` non deve restituire righe.
- Conta le righe di `strutture`, totali e **per provincia**.
- Segnala: `slug` duplicati, righe con campi critici vuoti (`nome`, `comune`,
  `provincia`, `regione`), quante righe hanno `fonte_dati` = `"demo"` invece di
  `"opendata_lombardia"`.

## 2. Sito

```bash
npm run build
npm run start
```

Con richieste HTTP verifica che rispondano **200** e mostrino strutture reali dal
database, **senza l'avviso dei dati demo** (`AvvisoDemo`, testo "Dati dimostrativi"):

- la home `/`
- `/rsa/lombardia/`
- almeno 3 pagine comune

Riporta quante URL contiene `/sitemap.xml`.

## 3. Integrità dei link

A server avviato:

- Leggi `/sitemap.xml`, richiedi **ogni** URL elencata e verifica che risponda 200.
- Estrai tutti i link interni dalle pagine scaricate (nav, footer, breadcrumb, card
  struttura, link tra tipologie) e verifica che nessuno risponda **404 o 403**.
- Report finale con l'elenco dei link rotti: URL, stato HTTP e pagina in cui compare.
  Nessun link rotto = OK.

## 4. Repo

- `npm run build` ed `npm run lint` passano.
- `git status --porcelain` è vuoto (nessuna modifica non committata).
- `.env.local` è escluso da git: verifica con `git check-ignore -v .env.local` e
  `git ls-files --error-unmatch .env.local`.
- Gli script temporanei di verifica sono stati eliminati.

## 5. Allineamento fra repo e produzione

Il controllo che manca a tutti gli altri: qui sopra si verifica il sito **locale**,
ma quello che vedono le famiglie e Google è il build su Vercel. La sitemap è
dinamica e legge il database dal vivo, le pagine sono statiche e nascono al build:
se il database cresce e il deploy non parte, la sitemap dichiara URL che
rispondono 404, e nessuno degli altri controlli se ne accorge. È già successo con
la Toscana, per cinque giorni.

**Non fidarsi di `origin/main`**: è un ref locale e può essere vecchio. L'unica
fonte attendibile è il server.

```bash
git ls-remote origin main           # verità dal server GitHub
git rev-parse HEAD                  # commit locale
curl -s https://guidarsa.it/api/versione/   # commit effettivamente distribuito
```

La **barra finale** non è un dettaglio: il sito usa `trailingSlash` e senza barra
la richiesta riceve un 308, che letto di fretta sembra "rotta assente". È la
stessa trappola documentata in `supabase/README.md` per il webhook.

Tre confronti, tutti obbligatori:

1. **GitHub = HEAD.** `git ls-remote origin main` deve restituire lo stesso SHA di
   `git rev-parse HEAD`. Diverso ⇒ ci sono commit non pushati: dirlo e fermarsi.
2. **Produzione = HEAD.** Il campo `commit` di `/api/versione` deve coincidere con
   `HEAD`. Diverso ⇒ deploy non partito, fallito o ancora in corso. Se la rotta
   risponde 404, la produzione è precedente all'introduzione di `/api/versione` e
   quindi già disallineata.
3. **Spot-check su una URL nuova.** Scegli in produzione almeno una URL che esiste
   solo grazie ai dati o al codice di questa sessione — una pagina comune o una
   scheda struttura della regione appena importata — e verifica che risponda
   **200**, non solo che sia elencata nella sitemap. Confronta poi il numero di
   URL della sitemap pubblica con quello della sitemap locale: se coincidono ma
   una URL nuova dà 404, il database è avanti rispetto al build ed è esattamente
   il guasto che questo controllo esiste per intercettare.

Riporta i tre SHA per esteso: non è verificato finché non si vedono uguali.
