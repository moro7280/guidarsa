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

function richiedi(nome: string): string {
  const valore = process.env[nome];
  if (!valore) {
    throw new Error(
      `Variabile d'ambiente mancante: ${nome}. Copia .env.example in .env.local e valorizzala.`,
    );
  }
  return valore;
}

let clientAnonimo: SupabaseClient | null = null;

/** Client con chiave anon: sola lettura dei dati pubblici. */
export function getSupabaseClient(): SupabaseClient {
  if (!clientAnonimo) {
    clientAnonimo = createClient(
      richiedi("NEXT_PUBLIC_SUPABASE_URL"),
      richiedi("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    );
  }
  return clientAnonimo;
}

/** true se le variabili per la lettura pubblica sono configurate. */
export function supabaseConfigurato(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
