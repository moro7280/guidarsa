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
