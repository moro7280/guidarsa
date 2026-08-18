import type { Struttura } from "./types";

/**
 * Punteggio di completezza del profilo di una struttura, calcolato dai dati
 * presenti. Serve a decidere, al momento del deploy, quali schede indicizzare:
 * una scheda con solo nome e indirizzo è una pagina povera, e CLAUDE.md vieta
 * di pubblicare pagine sotto le 100 parole utili.
 *
 * Derivato, non salvato: si ricalcola da solo quando i dati si arricchiscono
 * (Google Places, dati forniti dalle strutture).
 */

export type LivelloCompletezza = "minimo" | "parziale" | "buono";

export interface Completezza {
  /** 0-100. */
  punteggio: number;
  livello: LivelloCompletezza;
  /** Etichette dei blocchi informativi assenti, per il report di import. */
  mancanti: string[];
}

/** Parole della descrizione: la misura più vicina alla regola delle 100 parole. */
export function paroleDescrizione(struttura: Struttura): number {
  const testo = (struttura.descrizione ?? "").trim();
  return testo ? testo.split(/\s+/).length : 0;
}

const CRITERI: {
  etichetta: string;
  peso: number;
  presente: (struttura: Struttura) => boolean;
}[] = [
  { etichetta: "telefono", peso: 20, presente: (s) => Boolean(s.telefono) },
  { etichetta: "email o sito web", peso: 10, presente: (s) => Boolean(s.email || s.sito_web) },
  { etichetta: "descrizione estesa", peso: 25, presente: (s) => paroleDescrizione(s) >= 40 },
  { etichetta: "coordinate", peso: 15, presente: (s) => s.lat !== null && s.lng !== null },
  { etichetta: "prezzi", peso: 15, presente: (s) => s.prezzo_min !== null && s.prezzo_max !== null },
  { etichetta: "posti letto", peso: 10, presente: (s) => s.posti_letto !== null },
  { etichetta: "nucleo Alzheimer noto", peso: 5, presente: (s) => s.nucleo_alzheimer !== null },
];

export function completezza(struttura: Struttura): Completezza {
  let punteggio = 0;
  const mancanti: string[] = [];

  for (const criterio of CRITERI) {
    if (criterio.presente(struttura)) punteggio += criterio.peso;
    else mancanti.push(criterio.etichetta);
  }

  const livello: LivelloCompletezza =
    punteggio >= 70 ? "buono" : punteggio >= 40 ? "parziale" : "minimo";

  return { punteggio, livello, mancanti };
}

/**
 * Soglia proposta per l'indicizzazione al momento del deploy: sotto questo
 * punteggio la scheda resta raggiungibile ma andrebbe esclusa dai motori
 * (noindex) finché non viene arricchita. Decisione da confermare nella
 * sessione sui template SEO.
 */
export const SOGLIA_INDICIZZAZIONE = 60;

export function indicizzabile(struttura: Struttura): boolean {
  return completezza(struttura).punteggio >= SOGLIA_INDICIZZAZIONE;
}
