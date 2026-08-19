// Mapping colonne per l'elenco delle strutture sanitarie residenziali per
// anziani non autosufficienti di Regione Umbria.
//
// Tre cose rendono questa fonte diversa dalle precedenti.
//
// 1. Il file e in windows-1252, non in UTF-8: letto come UTF-8, "Citta di
//    Castello" diventa "Citt? di Castello". Si dichiara `codifica` e lo script
//    di import lo legge come latin1.
// 2. Il comune non c'e: c'e il codice ISTAT ("054039"). Si risolve con
//    l'anagrafe ISTAT dei comuni (scripts/lib/istat.mjs).
// 3. I dati sono la rilevazione ministeriale dell'anno 2020, pubblicata nel
//    2022. Sono i piu` recenti che la Regione espone, ma hanno sei anni: la
//    descrizione di ogni scheda lo dice, e la provenienza dei recapiti porta
//    quella data, non quella dello scaricamento.

import { comuneDaCodice } from "../lib/istat.mjs";

export const fonte = {
  file: "data/umbria-anziani.csv",
  nome: "Regione Umbria — Strutture sanitarie residenziali per anziani non autosufficienti",
  url: "https://dati.regione.umbria.it/dataset/strutture-sanitarie-residenziali-per-anziani-non-autosufficienti",
  scaricatoIl: "2026-08-20",
  /** Anno della rilevazione ministeriale da cui provengono i dati. */
  rilevazione: 2020,
  fonteDati: "opendata_umbria",
  regione: "Umbria",
  delimitatore: ";",
  codifica: "latin1",
  tipologia: "rsa",
};

/**
 * "Tipo rapporto con il S.S.N.", quadro I del modello ministeriale STS.11:
 *
 *   1 — struttura direttamente gestita: a gestione diretta dell'azienda
 *       sanitaria, o equiparata al pubblico
 *   2 — struttura non direttamente gestita: «ogni struttura accreditata o in
 *       regime di convenzione», comprese quelle dell'azienda sanitaria date in
 *       gestione a terzi
 *
 * Entrambi i valori descrivono strutture dentro il servizio sanitario
 * nazionale, quindi `convenzionata` e true in tutti e due i casi. Non e una
 * deduzione nostra: e la definizione del modello che genera questo dato.
 */
const RAPPORTO_SSN = {
  1: "direttamente gestita dall'azienda sanitaria",
  2: "accreditata o in regime di convenzione con il servizio sanitario",
};

const ACRONIMI = new Set([
  "RSA", "R.S.A.", "RP", "R.P.", "ASP", "ONLUS", "ETS", "SRL", "S.R.L.", "SPA",
  "IPAB", "EASP", "E.A.S.P.", "ONPI", "GBR", "BD", "ARL", "A.R.L.",
]);

const MINUSCOLE = new Set([
  "di", "de", "del", "della", "dello", "dei", "degli", "delle", "da", "dal",
  "e", "ed", "in", "il", "lo", "la", "i", "gli", "le", "a", "al", "alla",
  "per", "con", "su", "dell", "nell", "all", "dall", "sull",
]);

/**
 * L'apostrofo in questa fonte fa due mestieri diversi e vanno separati prima di
 * toccare le maiuscole:
 *
 * - virgolette attorno a un pezzo del nome — "CENTRO ANZIANI 'CASA BENEDETTA'",
 *   "COOP.SOC.'IL MONASTERO' ARL": la coppia si toglie e resta il testo
 * - accento troncato sulle maiuscole, come si scriveva a macchina — "CITTA'",
 *   "ETA'", "OSPITALITA'": va restituito l'accento vero, o finisce nell'H1
 *
 * L'ordine conta: senza togliere prima le coppie, "BENEDETTA'" verrebbe letto
 * come un accento e diventerebbe "BENEDETTÀ".
 */
const ACCENTATE = { A: "À", E: "È", I: "Ì", O: "Ò", U: "Ù" };

function ripulisci(valore) {
  return (valore ?? "")
    .replace(/\s+/g, " ")
    .trim()
    // Coppie di apici usate come virgolette: apertura a inizio stringa, dopo
    // uno spazio o dopo un punto; chiusura a fine parola.
    .replace(/(^|[\s.])'([^']*)'(?=\s|$)/g, "$1$2")
    // Accento troncato: solo dopo una vocale a fine parola, cioe` dove
    // l'apostrofo non puo` essere un'elisione ("DELL'AMICIZIA" resta intatto).
    .replace(/([AEIOU])'(?=\s|$)/g, (_, vocale) => ACCENTATE[vocale])
    .replace(/(^|\s)['"]+/g, "$1")
    .replace(/['"]+($|\s)/g, "$1")
    .trim();
}

/**
 * Qui non basta la regola usata per Lombardia e Friuli — "normalizza solo se
 * tutta la stringa e maiuscola" — perche' la fonte mescola i due stili dentro
 * la stessa riga: "RESIDENZA SANITARIA ASSISTITA (R.S.A.) Citta di Castello".
 * Si normalizza quindi parola per parola.
 *
 * Restano intatte: le parole che contengono gia' minuscole (la fonte le ha
 * scritte cosi apposta), le sigle note e i gruppi di una o due lettere, che
 * negli acronimi puntati sono la norma — "R.S.A.", "S.MARTINO".
 */
function titola(parola, indice) {
  if (/[a-zà-ù]/.test(parola)) return parola;
  if (ACRONIMI.has(parola)) return parola;
  // Parola di una sola lettera senza punto: e una congiunzione o un articolo
  // ("ASSISTENZA E SERVIZI"), non l'iniziale puntata di un nome ("G. Balducci").
  if (indice > 0 && /^[A-ZÀ-Ù]$/.test(parola) && MINUSCOLE.has(parola.toLowerCase())) {
    return parola.toLowerCase();
  }

  let primoGruppo = true;
  return parola.replace(/[A-ZÀ-Ù]+/g, (gruppo) => {
    const eraPrimo = primoGruppo;
    primoGruppo = false;
    // Le lettere singole restano maiuscole: sono le iniziali puntate degli
    // acronimi, "R.S.A." e "S.MARTINO".
    if (gruppo.length < 2 || ACRONIMI.has(gruppo)) return gruppo;
    const minuscolo = gruppo.toLowerCase();
    if (eraPrimo && indice > 0 && MINUSCOLE.has(minuscolo)) return minuscolo;
    return minuscolo[0].toUpperCase() + minuscolo.slice(1);
  });
}

function normalizzaMaiuscole(valore) {
  const testo = ripulisci(valore);
  if (!testo) return "";
  return testo
    .split(" ")
    .map((parola, indice) => titola(parola, indice))
    .join(" ");
}

function normalizzaEmail(valore) {
  const testo = ripulisci(valore).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(testo) ? testo : null;
}

/**
 * Domini di primo livello plausibili per un ente italiano. Serve a scartare gli
 * indirizzi troncati che la fonte contiene: "www.uslumbria1.gov" e la versione
 * mutila di "www.uslumbria1.gov.it" e non risolve. Meglio nessun link che un
 * link morto in una scheda.
 */
const TLD_AMMESSI = new Set(["it", "com", "org", "net", "eu", "info", "cloud", "online", "coop"]);

function normalizzaSito(valore) {
  const testo = ripulisci(valore).toLowerCase();
  if (!testo || testo.includes("@")) return null;
  const conSchema = /^https?:\/\//.test(testo) ? testo : `https://${testo}`;
  try {
    const url = new URL(conSchema);
    const etichette = url.hostname.split(".");
    if (etichette.length < 2) return null;
    if (!TLD_AMMESSI.has(etichette[etichette.length - 1])) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Prefisso e numero stanno in due colonne separate: "075" + "8509679". */
function componiTelefono(prefisso, numero) {
  const p = (prefisso ?? "").replace(/\D/g, "");
  const n = (numero ?? "").replace(/\D/g, "");
  if (n.length < 5) return null;
  const completo = p ? `${p} ${n}` : n;
  const cifre = p.length + n.length;
  return cifre >= 6 && cifre <= 13 ? completo : null;
}

/**
 * L'elenco umbro non ha una colonna con il livello assistenziale: i due livelli
 * regionali — residenza sanitaria assistita e residenza protetta — si leggono
 * solo nella denominazione, e in una quindicina di casi non compaiono affatto
 * ("Villa Sabrina", "Non ti scordar di me").
 *
 * Per questo la tipologia non viene dedotta dal nome: l'intero dataset e, per
 * dichiarazione della Regione, l'elenco delle strutture residenziali per
 * anziani NON autosufficienti, che nella nostra tassonomia sono RSA. Il livello
 * dichiarato nel nome, quando c'e, finisce nella descrizione: chi legge vede
 * cosa dice davvero il documento.
 */
function livelloDaNome(nome) {
  if (/\b(r\.?s\.?a\.?|residenza sanitaria)\b/i.test(nome)) return "residenza sanitaria assistita";
  if (/\b(r\.?p\.?|residenza protetta)\b/i.test(nome)) return "residenza protetta";
  return null;
}

function componiDescrizione({ nome, comune, provincia, livello, rapporto }) {
  const frasi = [
    `${nome} è una struttura residenziale per anziani non autosufficienti con sede a ${comune}, in provincia di ${provincia}.`,
  ];

  if (livello) {
    frasi.push(`Nella denominazione ufficiale compare come «${livello}».`);
  }

  frasi.push(
    `Nell'anagrafe regionale risulta ${rapporto}: una parte della retta è quindi a carico del servizio sanitario, mentre la quota alberghiera resta alla famiglia.`,
  );

  frasi.push(
    `I dati provengono dall'elenco open data di Regione Umbria, che pubblica la rilevazione ministeriale dell'anno ${fonte.rilevazione}: recapiti e denominazione vanno verificati con la struttura prima di muoversi.`,
  );

  return frasi.join(" ");
}

export function normalizzaRiga(riga) {
  // Una struttura con anno di chiusura valorizzato ha chiuso: non va pubblicata.
  const chiusura = (riga["Anno chiusura"] ?? "").trim();
  if (/^\d{4}$/.test(chiusura) && chiusura !== "0000") {
    return { ok: false, motivo: `struttura chiusa nel ${chiusura}` };
  }

  const nome = normalizzaMaiuscole(riga["Denominazione struttura"]);
  if (!nome) return { ok: false, motivo: "denominazione mancante" };

  const codiceComune = (riga["Codice Comune"] ?? "").trim();
  const luogo = comuneDaCodice(codiceComune);
  if (!luogo) return { ok: false, motivo: `codice comune ISTAT non risolto: "${codiceComune}"` };
  if (luogo.regione !== fonte.regione) {
    return { ok: false, motivo: `comune fuori regione: ${luogo.comune} (${luogo.regione})` };
  }

  const codiceRapporto = Number.parseInt((riga["Tipo rapporto con il S.S.N."] ?? "").trim(), 10);
  const rapporto = RAPPORTO_SSN[codiceRapporto];
  if (!rapporto) {
    return { ok: false, motivo: `rapporto con il SSN non codificato: "${riga["Tipo rapporto con il S.S.N."] ?? ""}"` };
  }

  const cap = (riga.CAP ?? "").replace(/\D/g, "");
  const telefono = componiTelefono(riga.Prefisso, riga.Telefono);
  const email = normalizzaEmail(riga["E-mail"]);
  const sito = normalizzaSito(riga["Sito web"]);

  // La data di provenienza e l'anno della rilevazione, non quello in cui
  // abbiamo scaricato il file: e quella l'eta` vera di questi recapiti.
  const provenienza = {
    fonte: fonte.fonteDati,
    url: fonte.url,
    il: `${fonte.rilevazione}-12-31`,
  };
  const fonteContatti = {};
  const contatti = {};
  if (telefono) {
    contatti.telefono = telefono;
    fonteContatti.telefono = provenienza;
  }
  if (email) {
    contatti.email = email;
    fonteContatti.email = provenienza;
  }
  if (sito) {
    contatti.sito_web = sito;
    fonteContatti.sito_web = provenienza;
  }
  // Un campo assente resta fuori dal payload: a null cancellerebbe, al reimport,
  // quello che l'arricchimento ha aggiunto nel frattempo.
  if (Object.keys(fonteContatti).length > 0) contatti.fonte_contatti = fonteContatti;

  return {
    ok: true,
    codiceFonte: (riga["Codice struttura"] ?? "").trim(),
    struttura: {
      nome,
      tipologia: fonte.tipologia,
      indirizzo: normalizzaMaiuscole(riga.Indirizzo).replace(/,(\S)/g, ", $1") || null,
      cap: /^\d{5}$/.test(cap) ? cap : null,
      comune: luogo.comune,
      provincia: luogo.provincia,
      provincia_sigla: luogo.provinciaSigla,
      regione: fonte.regione,
      ...contatti,
      // Codici 1 e 2 dello STS.11 stanno entrambi dentro il servizio sanitario.
      convenzionata: true,
      codice_struttura_fonte: (riga["Codice struttura"] ?? "").trim() || null,
      partita_iva_gestore: (riga["Partita IVA"] ?? "").trim() || null,
      descrizione: componiDescrizione({
        nome,
        comune: luogo.comune,
        provincia: luogo.provincia,
        livello: livelloDaNome(nome),
        rapporto,
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
