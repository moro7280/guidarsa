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
  /** null = informazione non disponibile: non equivale a "non c'è". */
  nucleo_alzheimer: boolean | null;
  prezzo_min: number | null;
  prezzo_max: number | null;
  descrizione: string;
  /** Origine del dato: "demo" per i dati fittizi, altrimenti la fonte reale. */
  fonte_dati: string;
  /** Dati del gestore, dalla fonte regionale: servono per le PEC da INI-PEC. */
  codice_struttura_fonte?: string | null;
  denominazione_gestore?: string | null;
  partita_iva_gestore?: string | null;
  codice_fiscale_gestore?: string | null;
  pec_gestore?: string | null;
  /** Riferimento OpenStreetMap del match e sua confidenza. */
  osm_id?: string | null;
  osm_confidenza?: "alta" | "media" | null;
  /**
   * Fonte di ogni singolo campo di contatto, es. { telefono: "osm" }.
   * Permette di isolare sempre cosa viene da OSM: obbligo ODbL.
   */
  fonte_contatti?: Record<string, string> | null;
  contatti_aggiornati_il?: string | null;
  /** Rette dalla carta dei servizi: privata in prezzo_min/prezzo_max, convenzionata a parte. */
  retta_convenzionata_min?: number | null;
  retta_convenzionata_max?: number | null;
  retta_originale?: string | null;
  costi_extra?: string | null;
  carta_servizi_anno?: number | null;
  carta_servizi_scaricata_il?: string | null;
  retta_confidenza?: "alta" | "media" | null;
  url_carta_servizi?: string | null;
  updated_at: string;
}

/** Nodo geografico (regione, provincia o comune) con il numero di strutture. */
export interface NodoGeografico {
  nome: string;
  slug: string;
  conteggio: number;
}
