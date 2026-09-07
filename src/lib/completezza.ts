import type { Struttura } from "./types";

/**
 * Punteggio di completezza del profilo di una struttura, calcolato dai dati
 * presenti. Serve a decidere, al momento del deploy, quali schede indicizzare:
 * una scheda con solo nome e indirizzo è una pagina povera, e CLAUDE.md vieta
 * di pubblicare pagine sotto le 100 parole utili.
 *
 * Derivato, non salvato: si ricalcola da solo quando i dati si arricchiscono.
 *
 * I pesi guardano a cosa serve a una famiglia che cerca una struttura. I dati
 * del gestore (partita IVA, PEC) non entrano nel punteggio: servono a noi per
 * contattare le strutture, non a chi legge la scheda.
 */

export type LivelloCompletezza = "minimo" | "parziale" | "buono";

export interface Completezza {
  /** 0-100. */
  punteggio: number;
  livello: LivelloCompletezza;
  /** Etichette dei blocchi informativi assenti, per i report di arricchimento. */
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
  { etichetta: "telefono", peso: 25, presente: (s) => Boolean(s.telefono) },
  { etichetta: "email o sito web", peso: 15, presente: (s) => Boolean(s.email || s.sito_web) },
  { etichetta: "descrizione estesa", peso: 20, presente: (s) => paroleDescrizione(s) >= 40 },
  { etichetta: "prezzi", peso: 15, presente: (s) => s.prezzo_min !== null && s.prezzo_max !== null },
  { etichetta: "coordinate", peso: 10, presente: (s) => s.lat !== null && s.lng !== null },
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
 * Soglia di completezza sotto la quale una scheda resta raggiungibile ma non
 * entra nell'indice.
 */
export const SOGLIA_INDICIZZAZIONE = 60;

/**
 * Un recapito raggiungibile. Non è un criterio di ricchezza: è la differenza
 * fra una scheda che serve a qualcosa e un vicolo cieco. Una famiglia che
 * arriva su una struttura senza telefono né sito non può farci niente.
 */
function haRecapito(struttura: Struttura): boolean {
  return Boolean(struttura.telefono || struttura.sito_web);
}

/** Una retta pubblicata, privata o convenzionata: il dato che nessun altro dà. */
export function haRettaDocumentata(struttura: Struttura): boolean {
  return struttura.prezzo_min != null || (struttura.retta_convenzionata_min ?? null) != null;
}

/**
 * L'unica funzione che decide se una scheda entra nell'indice. Da qui dipendono
 * il meta robots della scheda, la sitemap, e — attraverso le due funzioni sotto
 * — anche le pagine geografiche.
 *
 * Averla in un posto solo non è ordine fine a sé stesso: quando la regola stava
 * scritta due volte, la sitemap e le pagine potevano dire cose diverse sulla
 * stessa URL, ed è esattamente il genere di contraddizione che Google punisce.
 *
 * Il rientro è automatico e non richiede nessuna migrazione: il punteggio si
 * ricalcola dai dati a ogni build, quindi una scheda che riceve un telefono
 * tramite arricchimento torna nell'indice da sola al deploy successivo.
 */
export function indicizzabile(struttura: Struttura): boolean {
  return completezza(struttura).punteggio >= SOGLIA_INDICIZZAZIONE && haRecapito(struttura);
}

/**
 * Una pagina comune entra nell'indice se ha almeno due schede indicizzabili,
 * oppure almeno una che pubblica la retta.
 *
 * Il perché sta nei dati di Search Console del 07/09: delle 49 pagine comune
 * che Google ha letto e rifiutato, 34 avevano una struttura sola. Una pagina
 * comune con una struttura è il doppione della scheda di quella struttura —
 * stesso titolo, stessi numeri, stesse frasi generate. Con due schede l'elenco
 * comincia a essere un confronto; con una retta pubblicata dice qualcosa che la
 * scheda da sola non direbbe.
 *
 * Le pagine escluse restano raggiungibili e continuano a passare autorità alle
 * schede: `noindex, follow`, mai rimosse.
 */
export function comuneIndicizzabile(strutture: Struttura[]): boolean {
  const indicizzabili = strutture.filter(indicizzabile);
  return indicizzabili.length >= 2 || indicizzabili.some(haRettaDocumentata);
}

/**
 * Un hub — tipologia, regione, provincia — entra nell'indice se sotto di sé ha
 * almeno una scheda indicizzabile.
 *
 * Un hub che elenca soltanto pagine `noindex` è un elenco di porte chiuse: è la
 * definizione della pagina che dice poco. La Campania è il caso limite, con 34
 * strutture importate e nessun recapito.
 */
export function hubIndicizzabile(strutture: Struttura[]): boolean {
  return strutture.some(indicizzabile);
}
