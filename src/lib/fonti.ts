/**
 * Provenienza delle rette, e come si chiama in pagina.
 *
 * Serve a due posti che devono dire la stessa cosa: la disclosure sotto le
 * rette di una singola scheda (BloccoRette) e le frasi aggregate delle pagine
 * hub (statistiche, panoramica, FAQ). Finche c'era una sola provenienza —
 * le carte dei servizi — la frase poteva stare scritta a mano nel componente;
 * con il Portale RSA della Toscana quella frase e diventata falsa per un terzo
 * delle rette, e una stringa fissa non basta piu.
 *
 * `mensileCalcolato` non e un dettaglio grafico: distingue due popolazioni che
 * non si possono mediare insieme (CLAUDE.md, regola sui prezzi). Le tariffe
 * toscane nascono giornaliere e diventano mensili moltiplicandole per 30,44;
 * quelle delle carte dei servizi sono gia mensili e comprendono voci diverse.
 */

export interface FonteRetta {
  /** Chiave interna, usata per raggruppare le popolazioni tariffarie. */
  chiave: string;
  /** Nome esteso, per la disclosure sotto le rette. */
  nome: string;
  /** La stessa fonte dentro una frase: "sono tariffe prese da ...". */
  inFrase: string;
  /** Etichetta corta, per gli elenchi che confrontano piu fonti. */
  breve: string;
  url: string | null;
  /** Il valore mensile e calcolato da una tariffa giornaliera dichiarata. */
  mensileCalcolato: boolean;
}

export const CHIAVE_CARTA_SERVIZI = "carta_servizi";

/**
 * Fonti che pubblicano le rette in prima persona, invece di lasciarle dentro
 * una carta dei servizi. Cambia la frase di disclosure: dire "carta dei servizi
 * 2026" per un dato che arriva dall'anagrafe regionale sarebbe falso, e la
 * regola di CLAUDE.md chiede che ogni retta dichiari la sua provenienza vera.
 */
export const FONTI_DIRETTE: Record<string, FonteRetta> = {
  portale_rsa_toscana: {
    chiave: "portale_rsa_toscana",
    nome: "Portale RSA di Regione Toscana",
    inFrase: "dichiarate dalle strutture al Portale RSA di Regione Toscana",
    breve: "Portale RSA Toscana",
    url: "https://servizi.toscana.it/RT/RSA/",
    mensileCalcolato: true,
  },
};

const CARTA_SERVIZI: FonteRetta = {
  chiave: CHIAVE_CARTA_SERVIZI,
  nome: "carta dei servizi",
  inFrase: "prese dalle carte dei servizi pubblicate dalle strutture stesse",
  breve: "carte dei servizi",
  url: null,
  mensileCalcolato: false,
};

/**
 * A quale popolazione tariffaria appartiene la retta di questa struttura.
 * Non coincide con `fonte_dati`: una struttura censita dall'open data lombardo
 * ha la retta presa dalla sua carta dei servizi, non dall'elenco regionale.
 */
export function chiaveRetta(fonteDati: string | null | undefined): string {
  return FONTI_DIRETTE[fonteDati ?? ""] ? (fonteDati as string) : CHIAVE_CARTA_SERVIZI;
}

export function fonteRetta(chiave: string): FonteRetta {
  return FONTI_DIRETTE[chiave] ?? CARTA_SERVIZI;
}

/**
 * Nome leggibile della fonte di una struttura, per le frasi che devono dire da
 * dove viene il dato. "L'elenco regionale" e vero ma non aiuta: chi legge ha
 * diritto di sapere quale.
 */
const NOMI_FONTE: Record<string, string> = {
  opendata_lombardia: "l'elenco open data di Regione Lombardia",
  opendata_lombardia_cdi: "l'elenco dei centri diurni integrati di Regione Lombardia",
  opendata_lombardia_sociale: "l'elenco delle strutture di offerta sociale di Regione Lombardia",
  opendata_friuli: "l'elenco open data di Regione Friuli-Venezia Giulia",
  opendata_umbria: "l'elenco open data di Regione Umbria",
  opendata_trentino: "l'elenco dell'Azienda provinciale per i servizi sanitari di Trento",
  opendata_campania: "l'elenco delle strutture accreditate di Regione Campania",
  opendata_emilia_romagna: "la Banca dati dei Presidi socio-assistenziali di Regione Emilia-Romagna",
  opendata_calabria: "il Registro delle strutture accreditate di Regione Calabria",
  portale_rsa_toscana: "il Portale RSA di Regione Toscana",
};

export function nomeFonte(fonteDati: string | null | undefined): string {
  return NOMI_FONTE[fonteDati ?? ""] ?? "l'elenco regionale di provenienza";
}
