// Mapping colonne per l'elenco delle Residenze Sanitarie Assistenziali
// accreditate di Regione Campania.
//
// E un file piccolo — 44 righe — ma con una colonna che nessun'altra fonte ci
// aveva ancora dato: `RSA_DEMENZE`, i posti letto del modulo dedicato alle
// demenze. Dove e valorizzata, `nucleo_alzheimer` diventa **true** per
// dichiarazione della Regione, non per deduzione dal nome.
//
// Dove non e valorizzata resta **null**, mai false. La colonna conta posti
// letto: una cella vuota dice che il modulo non risulta accreditato, non che il
// nucleo non esista — e su una scheda che una famiglia legge per decidere,
// "non ce l'ha" affermato senza saperlo e peggio di "non lo sappiamo". E la
// stessa regola gia applicata all'accreditamento ignoto del Friuli.
//
// Delle 44 righe, 34 sono RSA per anziani e 10 per disabili: queste ultime
// restano fuori, sono residenziali ma non per anziani e finirebbero in pagine
// che mentono sul proprio contenuto.

import { comuneDaCodice } from "../lib/istat.mjs";

export const fonte = {
  file: "data/campania-rsa.csv",
  nome: "Regione Campania — Residenze Sanitarie Assistenziali (RSA) accreditate",
  url: "https://dati.regione.campania.it/catalogo/dataset/residenze-sanitarie-assistenziali-rsa-accreditate",
  scaricatoIl: "2026-08-25",
  fonteDati: "opendata_campania",
  regione: "Campania",
  delimitatore: ";",
  codifica: "utf8",
};

const ACRONIMI = new Set([
  "RSA", "R.S.A.", "SRL", "S.R.L.", "SPA", "S.P.A.", "ONLUS", "ETS", "ARL",
  "A.R.L.", "IPAB", "SAS", "SNC", "COOP", "SOC",
]);

const MINUSCOLE = new Set([
  "di", "de", "del", "della", "dello", "dei", "degli", "delle", "da", "dal",
  "e", "ed", "in", "il", "lo", "la", "i", "gli", "le", "a", "al", "alla",
  "per", "con", "su", "d", "dell", "nell", "all", "dall", "sull",
]);

const ACCENTATE = { A: "À", E: "È", I: "Ì", O: "Ò", U: "Ù" };

function ripulisci(valore) {
  return (valore ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([AEIOU])'(?=\s|$)/g, (_, vocale) => ACCENTATE[vocale])
    .trim();
}

function titola(parola, indice) {
  if (/[a-zà-ù]/.test(parola)) return parola;
  if (ACRONIMI.has(parola)) return parola;
  if (indice > 0 && /^[A-ZÀ-Ù]$/.test(parola) && MINUSCOLE.has(parola.toLowerCase())) {
    return parola.toLowerCase();
  }

  let primoGruppo = true;
  return parola.replace(/[A-ZÀ-Ù]+/g, (gruppo) => {
    const eraPrimo = primoGruppo;
    primoGruppo = false;
    if (gruppo.length < 2 || ACRONIMI.has(gruppo)) return gruppo;
    const minuscolo = gruppo.toLowerCase();
    if (eraPrimo && indice > 0 && MINUSCOLE.has(minuscolo)) return minuscolo;
    return minuscolo[0].toUpperCase() + minuscolo.slice(1);
  });
}

function normalizzaMaiuscole(valore) {
  const testo = ripulisci(valore);
  if (!testo) return "";
  return testo.split(" ").map(titola).join(" ");
}

/**
 * Il codice ISTAT arriva a cinque cifre — "64008" per Avellino — mentre
 * l'anagrafe ne usa sei, con lo zero iniziale. Senza il riempimento nessun
 * comune campano verrebbe risolto e l'import scarterebbe l'intero file.
 */
function codiceIstat(valore) {
  const cifre = (valore ?? "").replace(/\D/g, "");
  return cifre.length === 0 ? "" : cifre.padStart(6, "0");
}

function intero(valore) {
  const numero = Number.parseInt((valore ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

/**
 * Quattro colonne dicono a chi e destinata la struttura, contando i posti letto
 * di ciascun modulo: RSA_ANZIANI e RSA_DEMENZE per il residenziale,
 * CD_ANZIANI e CD_DEMENZE per il semiresidenziale. La tipologia si legge da
 * quali di queste sono valorizzate, non dal testo libero di ATTIVITA, che nel
 * file compare in tre grafie diverse.
 */
function destinazione(riga) {
  const rsaAnziani = intero(riga.RSA_ANZIANI);
  const rsaDemenze = intero(riga.RSA_DEMENZE);
  const cdAnziani = intero(riga.CD_ANZIANI);
  const cdDemenze = intero(riga.CD_DEMENZE);

  if (rsaAnziani || rsaDemenze) {
    return { tipologia: "rsa", demenze: rsaDemenze, posti: (rsaAnziani ?? 0) + (rsaDemenze ?? 0) };
  }
  if (cdAnziani || cdDemenze) {
    return { tipologia: "centro-diurno", demenze: cdDemenze, posti: (cdAnziani ?? 0) + (cdDemenze ?? 0) };
  }
  return null;
}

function componiDescrizione({ nome, comune, provincia, gestore, tipologia, posti, demenze }) {
  const frasi = [
    tipologia === "centro-diurno"
      ? `${nome} è un centro diurno per anziani con sede a ${comune}, in provincia di ${provincia}.`
      : `${nome} è una residenza sanitaria assistenziale per anziani non autosufficienti con sede a ${comune}, in provincia di ${provincia}.`,
  ];

  if (gestore && gestore.toLowerCase() !== nome.toLowerCase()) {
    frasi.push(`È gestita da ${gestore}.`);
  }

  frasi.push(
    "Risulta accreditata con il servizio sanitario regionale: una parte della retta è quindi a carico della Regione, mentre la quota alberghiera resta alla famiglia.",
  );

  if (posti) {
    frasi.push(
      demenze
        ? `L'accreditamento regionale le riconosce ${posti} posti, di cui ${demenze} in un modulo dedicato alle demenze.`
        : `L'accreditamento regionale le riconosce ${posti} posti.`,
    );
  }

  frasi.push(
    "I dati provengono dall'elenco open data di Regione Campania delle strutture private accreditate: recapiti e disponibilità vanno verificati con la struttura prima di muoversi.",
  );

  return frasi.join(" ");
}

export function normalizzaRiga(riga) {
  const attivita = (riga.ATTIVITA ?? "").trim();
  if (/disabil/i.test(attivita)) {
    return { ok: false, motivo: `struttura per disabili, non per anziani: "${attivita}"` };
  }

  const scopo = destinazione(riga);
  if (!scopo) {
    return { ok: false, motivo: `nessun posto per anziani dichiarato (attività: "${attivita}")` };
  }

  const nome = normalizzaMaiuscole(riga.DENOMINAZIONE_STRUTTURA_OPERATIVA);
  if (!nome) return { ok: false, motivo: "denominazione mancante" };

  const codice = codiceIstat(riga.CODICE_ISTAT_COMUNE);
  const luogo = comuneDaCodice(codice);
  if (!luogo) return { ok: false, motivo: `codice comune ISTAT non risolto: "${codice}"` };
  if (luogo.regione !== fonte.regione) {
    return { ok: false, motivo: `comune fuori regione: ${luogo.comune} (${luogo.regione})` };
  }

  const gestore = normalizzaMaiuscole(riga.DENOMINAZIONE_GESTORE);

  return {
    ok: true,
    codiceFonte: (riga.ID ?? "").trim(),
    struttura: {
      nome,
      tipologia: scopo.tipologia,
      indirizzo: normalizzaMaiuscole(riga.INDIRIZZO_SEDE_OPERATIVA).replace(/,(\S)/g, ", $1") || null,
      comune: luogo.comune,
      provincia: luogo.provincia,
      provincia_sigla: luogo.provinciaSigla,
      regione: fonte.regione,
      posti_letto: scopo.posti || null,
      // L'elenco e quello delle strutture accreditate: tutte lo sono.
      convenzionata: true,
      // true solo dove la Regione dichiara posti nel modulo demenze; altrimenti
      // null, mai false: la cella vuota non afferma l'assenza del nucleo.
      nucleo_alzheimer: scopo.demenze ? true : null,
      codice_struttura_fonte: (riga.ID ?? "").trim() || null,
      denominazione_gestore: gestore || null,
      partita_iva_gestore: (riga.P_IVA ?? "").trim() || null,
      descrizione: componiDescrizione({
        nome,
        comune: luogo.comune,
        provincia: luogo.provincia,
        gestore,
        tipologia: scopo.tipologia,
        posti: scopo.posti,
        demenze: scopo.demenze,
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
