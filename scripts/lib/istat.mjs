// Anagrafe ISTAT dei comuni italiani, usata per risolvere i codici comune che
// alcune fonti regionali usano al posto del nome.
//
// L'elenco open data della Regione Umbria, per esempio, non scrive "Perugia":
// scrive "054039". Senza questa tabella non sapremmo in quale comune si trova
// una struttura, e senza il comune non esiste la pagina che la contiene.
//
// Il file arriva da ISTAT in ISO-8859-1 (latin1) e va letto come tale, o
// "Assisi" e i comuni con accento finiscono storti.
//
// Fonte: https://www.istat.it/it/archivio/6789 — Codici delle unita
// amministrative territoriali. Riuso consentito con citazione della fonte.

import { readFileSync } from "node:fs";

const PERCORSO = "data/istat-comuni.csv";

/** Indici delle colonne che ci servono, nell'ordine del file ISTAT. */
const COL = {
  codiceAlfanumerico: 4,
  denominazione: 6,
  regione: 10,
  provincia: 11,
  sigla: 14,
};

function parseCsv(testo, delimitatore) {
  const righe = [];
  let riga = [];
  let campo = "";
  let inQuote = false;

  for (let i = 0; i < testo.length; i += 1) {
    const carattere = testo[i];
    if (inQuote) {
      if (carattere === '"' && testo[i + 1] === '"') {
        campo += '"';
        i += 1;
      } else if (carattere === '"') {
        inQuote = false;
      } else {
        campo += carattere;
      }
    } else if (carattere === '"') {
      inQuote = true;
    } else if (carattere === delimitatore) {
      riga.push(campo);
      campo = "";
    } else if (carattere === "\n") {
      riga.push(campo);
      righe.push(riga);
      riga = [];
      campo = "";
    } else if (carattere !== "\r") {
      campo += carattere;
    }
  }
  if (campo.length > 0 || riga.length > 0) {
    riga.push(campo);
    righe.push(riga);
  }
  return righe.filter((r) => r.some((c) => c.trim() !== ""));
}

let cache = null;

/**
 * Mappa `codice ISTAT alfanumerico` -> { comune, provincia, provinciaSigla, regione }.
 * Il codice e a 6 cifre con lo zero iniziale ("054039"): va passato come stringa.
 */
export function comuniIstat() {
  if (cache) return cache;

  const righe = parseCsv(readFileSync(PERCORSO).toString("latin1"), ";").slice(1);
  cache = new Map();

  for (const riga of righe) {
    const codice = (riga[COL.codiceAlfanumerico] ?? "").trim();
    if (!codice) continue;
    cache.set(codice, {
      comune: (riga[COL.denominazione] ?? "").trim(),
      provincia: (riga[COL.provincia] ?? "").trim(),
      provinciaSigla: (riga[COL.sigla] ?? "").trim().toUpperCase(),
      regione: (riga[COL.regione] ?? "").trim(),
    });
  }

  return cache;
}

/** Restituisce il comune per un codice ISTAT, oppure null se non esiste. */
export function comuneDaCodice(codice) {
  const pulito = String(codice ?? "").trim();
  if (!/^\d{6}$/.test(pulito)) return null;
  return comuniIstat().get(pulito) ?? null;
}

/**
 * Chiave di confronto per i nomi di comune: via accenti, apostrofi,
 * punteggiatura e spazi, cosi "Reggio nell'Emilia", "REGGIO NELL EMILIA" e
 * "Reggio nell’Emilia" diventano la stessa cosa.
 */
function chiaveNome(nome) {
  return String(nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

let perNome = null;

/**
 * Comune a partire dal nome e dalla sigla di provincia.
 *
 * Serve alle fonti che non pubblicano il codice ISTAT ma scrivono il comune per
 * esteso: l'Emilia-Romagna lo lascia dentro l'indirizzo ("VIA DANTE 4 -
 * MIRANDOLA(MO)"), la Calabria in una colonna a parte. La sigla non e un
 * dettaglio: in Italia ci sono decine di omonimi — Peschiera, San Giorgio,
 * Castelnuovo — e senza provincia si sceglierebbe a caso.
 *
 * Il nome da solo non basta mai: se la sigla manca si restituisce null invece
 * di indovinare.
 */
export function comuneDaNome(nome, provinciaSigla) {
  const sigla = String(provinciaSigla ?? "").trim().toUpperCase();
  const chiave = chiaveNome(nome);
  if (!chiave || !/^[A-Z]{2}$/.test(sigla)) return null;

  if (!perNome) {
    perNome = new Map();
    for (const [codice, voce] of comuniIstat()) {
      const k = `${chiaveNome(voce.comune)}|${voce.provinciaSigla}`;
      // Il primo vince: l'anagrafe non ha omonimi dentro la stessa provincia.
      if (!perNome.has(k)) perNome.set(k, { ...voce, codice });
    }
  }

  const esatto = perNome.get(`${chiave}|${sigla}`);
  if (esatto) return esatto;

  /**
   * Ripiego, e solo se non lascia scelta: fra i comuni della stessa provincia,
   * quelli il cui nome contiene per intero quello cercato. Serve a due casi
   * reali e diversi fra loro, entrambi incontrati in Emilia-Romagna:
   *
   * - nomi scritti a meta dalla fonte — "IGEA MARINA(RN)" per Bellaria-Igea
   *   Marina, che in provincia di Rimini non puo essere nient'altro
   * - comuni fusi, dove il nome vecchio sopravvive dentro quello nuovo —
   *   "MONTE COLOMBO(RN)" dentro Montescudo-Monte Colombo dal 2016
   *
   * Se i candidati sono zero o piu di uno si restituisce null: meglio una riga
   * scartata e riportata che una struttura messa nel comune sbagliato, perche
   * quel comune finisce nell'URL, nel titolo e nel breadcrumb della pagina.
   */
  const candidati = [];
  for (const [k, voce] of perNome) {
    const [nomeVoce, siglaVoce] = k.split("|");
    if (siglaVoce !== sigla) continue;
    if (nomeVoce.includes(chiave)) candidati.push(voce);
  }
  if (candidati.length === 1) return candidati[0];
  if (candidati.length > 1) return null;

  /**
   * Ultimo ripiego, sempre unico-o-niente: le parole cercate devono comparire
   * **nell'ordine** all'inizio delle parole del nome vero. Copre le due forme
   * abbreviate piu comuni negli elenchi regionali:
   *
   * - "S. Stefano di Rogliano" per Santo Stefano di Rogliano, dove "s" e
   *   l'iniziale puntata di "santo"
   * - "Melito Porto Salvo" per Melito di Porto Salvo, dove la fonte salta la
   *   preposizione
   *
   * L'ordine e obbligatorio: senza, "Villa San Giovanni" e "San Giovanni in
   * Fiore" diventerebbero intercambiabili. E la parola cercata deve essere
   * prefisso di quella vera, mai il contrario: "allo" non vale per "all'".
   */
  const parole = (testo) =>
    String(testo ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

  const cercate = parole(nome);
  if (cercate.length === 0) return null;

  const sottosequenza = [];
  for (const [k, voce] of perNome) {
    const [, siglaVoce] = k.split("|");
    if (siglaVoce !== sigla) continue;
    const vere = parole(voce.comune);
    let i = 0;
    for (const v of vere) {
      if (i < cercate.length && v.startsWith(cercate[i])) i += 1;
    }
    if (i === cercate.length) sottosequenza.push(voce);
  }
  return sottosequenza.length === 1 ? sottosequenza[0] : null;
}
