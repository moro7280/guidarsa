import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase del sito, con chiave anon: legge le strutture attraverso la
 * policy RLS strutture_lettura_pubblica.
 *
 * Qui non esiste un client con service role, di proposito: il sito pubblico
 * deve poter fare solo cio che la RLS consente a chiunque, e una chiave con
 * privilegi pieni non ha ragione di stare in produzione. Gli script di import
 * e arricchimento creano il proprio client service role leggendo .env.local,
 * che resta sulla macchina di sviluppo.
 */

let clientAnonimo: SupabaseClient | null = null;

/**
 * Impronta della build corrente, mandata come header a ogni query.
 *
 * Serve a impedire che una build prerenderizzi dati vecchi. Next mette in cache
 * le fetch dentro `.next/cache` e la riusa fra una build e l'altra — Vercel la
 * ripristina apposta fra un deploy e il successivo. Dopo un import succede
 * allora che `generateStaticParams`, ricalcolato, elenchi le pagine nuove
 * mentre il corpo della pagina legge dalla cache i dati di prima, non trova la
 * provincia e chiama `notFound()`: la rotta entra nel manifest ma il file
 * prerenderizzato e una 404, e la sitemap — che e force-dynamic e quindi
 * sempre fresca — annuncia quelle URL a Google. È successo davvero, in locale,
 * con Trentino e Campania: pagine regione a 200 e pagine provincia a 404.
 *
 * L'header entra nella chiave di cache di Next, quindi cambiarlo a ogni deploy
 * invalida tutto quanto senza disattivare niente. Non si puo usare
 * `cache: "no-store"`: Next rifiuta di prerenderizzare una pagina che legge
 * senza cache, e la build fallisce con "Dynamic server usage".
 *
 * PostgREST ignora gli header che non conosce, quindi per Supabase e inerte.
 * Il costo e nullo: `tutte()` memoizza il risultato, quindi ogni processo di
 * build fa una manciata di query, non una per pagina.
 */
const IMPRONTA_BUILD =
  process.env.VERCEL_DEPLOYMENT_ID ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  // In locale non esiste un identificativo di deploy: si usa l'avvio del
  // processo, cosi ogni `npm run build` riparte pulito senza dover cancellare
  // .next a mano — che e il rimedio che ci si ricorda solo dopo il danno.
  `locale-${Date.now()}`;

/**
 * Client con chiave anon: legge i dati pubblici e inserisce lead e iscritti.
 *
 * Le due variabili vanno lette con accesso STATICO — `process.env.NOME` scritto
 * per esteso. Next sostituisce a compilazione solo questa forma: con un accesso
 * dinamico tipo `process.env[nome]` il valore resta indefinito nel browser,
 * perche li `process.env` e uno shim vuoto. Il codice funzionava lato server e
 * falliva solo nel form dell'utente, che e il posto peggiore per accorgersene.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!clientAnonimo) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !chiave) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY mancanti: copia .env.example in .env.local e valorizzale.",
      );
    }

    clientAnonimo = createClient(url, chiave, {
      global: { headers: { "x-build": IMPRONTA_BUILD } },
    });
  }
  return clientAnonimo;
}

/** true se le variabili per la lettura pubblica sono configurate. */
export function supabaseConfigurato(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
