import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase. Non ancora usato dalle pagine: i dati arrivano da
 * src/lib/mock-data.ts finché non viene importato il dataset reale.
 * Le variabili d'ambiente sono documentate in .env.example.
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

let clientAdmin: SupabaseClient | null = null;

/**
 * Client con service role: solo lato server (script di import dei dati).
 * Non deve mai finire in un bundle client.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin() può essere usato solo lato server.");
  }
  if (!clientAdmin) {
    clientAdmin = createClient(
      richiedi("NEXT_PUBLIC_SUPABASE_URL"),
      richiedi("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );
  }
  return clientAdmin;
}

/** true se le variabili per la lettura pubblica sono configurate. */
export function supabaseConfigurato(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
