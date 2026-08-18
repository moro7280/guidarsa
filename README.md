# Directory RSA Italia

Directory web delle strutture per anziani in Italia: RSA, case di riposo, centri diurni e
assistenza domiciliare. Il contesto completo del progetto è in [CLAUDE.md](./CLAUDE.md).

## Stack

Next.js 16 (App Router) + TypeScript, Tailwind CSS 4, Supabase (Postgres), deploy su Vercel.

## Avvio in locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

Il sito gira anche senza variabili d'ambiente: in assenza di configurazione usa
`NEXT_PUBLIC_SITE_URL=http://localhost:3000` e i dati dimostrativi.

## Comandi

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Server di sviluppo |
| `npm run build` | Build di produzione (pagine statiche) |
| `npm run start` | Server di produzione |
| `npm run lint` | ESLint |

## Struttura

```
src/
  app/
    [tipologia]/[regione]/[provincia]/[comune]/  pagine geografiche
    struttura/[slug]/                            scheda struttura
    guide/[slug]/                                guide informative
    sitemap.ts robots.ts                         SEO tecnica
  components/                                    componenti condivisi
  lib/
    strutture.ts   accesso ai dati (oggi mock, domani Supabase)
    mock-data.ts   dati DIMOSTRATIVI, tutti con fonte_dati: "demo"
    supabase.ts    client Supabase (anon e service role)
    seo.ts         metadata e JSON-LD
    percorsi.ts    costruzione delle URL
    tipologie.ts   le 4 tipologie valide
```

## Stato attuale

Scaffold: tutte le pagine sono generate staticamente a partire dai dati dimostrativi in
`src/lib/mock-data.ts` — nessuna struttura reale è ancora presente. Il prossimo passo è
l'import degli open data regionali nella tabella `strutture` su Supabase e la sostituzione
del mock in `src/lib/strutture.ts`.
