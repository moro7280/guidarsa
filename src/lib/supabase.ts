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

    clientAnonimo = createClient(url, chiave);
  }
  return clientAnonimo;
}

/** true se le variabili per la lettura pubblica sono configurate. */
export function supabaseConfigurato(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
