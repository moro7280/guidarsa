/** Tipologie di struttura gestite dalla directory (vedi CLAUDE.md). */
export type Tipologia =
  | "rsa"
  | "casa-di-riposo"
  | "centro-diurno"
  | "assistenza-domiciliare";

/**
 * Rispecchia la tabella `strutture` su Supabase.
 * I campi geografici contengono i nomi estesi: gli slug usati nelle URL
 * sono derivati con `slugify()` (vedi src/lib/slug.ts).
 */
export interface Struttura {
  nome: string;
  slug: string;
  tipologia: Tipologia;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  /** Sigla della provincia, es. "MI". */
  provincia_sigla: string;
  regione: string;
  lat: number | null;
  lng: number | null;
  telefono: string | null;
  email: string | null;
  sito_web: string | null;
  posti_letto: number | null;
  convenzionata: boolean;
  nucleo_alzheimer: boolean;
  prezzo_min: number | null;
  prezzo_max: number | null;
  descrizione: string;
  /** Origine del dato: "demo" per i dati fittizi, altrimenti la fonte reale. */
  fonte_dati: string;
  updated_at: string;
}

/** Nodo geografico (regione, provincia o comune) con il numero di strutture. */
export interface NodoGeografico {
  nome: string;
  slug: string;
  conteggio: number;
}
