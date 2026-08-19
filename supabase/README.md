# Migration Supabase

Le migration vanno applicate **in ordine di nome file**:

1. `migrations/20260818_0001_strutture.sql` — tabella `strutture`, indici, trigger, RLS + policy di lettura pubblica
2. `migrations/20260818_0002_leads.sql` — tabella `leads`, RLS + policy di solo inserimento pubblico
3. `migrations/20260818_0003_verifica_schema.sql` — funzione `verifica_schema()` usata da `/verifica`

## Applicazione dalla dashboard (percorso consigliato)

1. Apri [supabase.com/dashboard](https://supabase.com/dashboard) e seleziona il progetto
   (quello indicato da `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`).
2. Menu laterale → **SQL Editor** → **New query**.
3. Apri `migrations/20260818_0001_strutture.sql`, copia **tutto** il contenuto, incollalo
   nell'editor e premi **Run** (o `Ctrl+Invio`). Attendi "Success. No rows returned".
4. Ripeti con `migrations/20260818_0002_leads.sql` e poi con
   `migrations/20260818_0003_verifica_schema.sql`, **in quest'ordine**: `leads` referenzia
   `strutture`, quindi invertire l'ordine fa fallire la seconda migration.
5. Menu laterale → **Table Editor**: devono comparire `strutture` e `leads`, entrambe con il
   badge **RLS enabled**. Cliccando su una tabella, la scheda **Policies** mostra la policy
   corrispondente (`strutture_lettura_pubblica`, `leads_inserimento_pubblico`).

Gli script sono idempotenti (`create table if not exists`, `drop policy if exists`): rieseguirli
non rompe nulla.

## Applicazione con la CLI (alternativa)

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Il `project-ref` è la parte iniziale dell'URL del progetto
(`https://<project-ref>.supabase.co`). `db push` applica tutti i file in `migrations/`
nell'ordine dei nomi.

## Verifica

Dopo l'applicazione, esegui `/verifica`: la sezione Database chiama `verifica_schema()` e deve
riportare `strutture` e `leads` con `rls_attiva: true` e le due policy attese.

## Chi scrive e chi legge

| Ruolo | `strutture` | `leads` |
| --- | --- | --- |
| `anon` (browser, sito) | lettura | solo inserimento |
| `service_role` (script di import in locale, mai in produzione ne nel browser) | lettura e scrittura | lettura e scrittura |

La chiave service role sta solo in `.env.local`, che è escluso da git.
