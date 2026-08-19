// Mapping colonne per l'export open data di Regione Lombardia.
// Un file per fonte: lo script di import (scripts/import-lombardia.mjs) resta
// generico, qui sta tutto quello che cambia da una regione all'altra.

export const fonte = {
  file: "data/lombardia-rsa.csv",
  nome: "Regione Lombardia — Elenco Residenze Sanitarie Assistenziali",
  url: "https://dati.lombardia.it",
  // Congelata qui: identifica la versione del dataset da cui provengono le righe.
  scaricatoIl: "2026-08-18",
  fonteDati: "opendata_lombardia",
  regione: "Lombardia",
  tipologia: "rsa",
};

/** Sigle delle province lombarde presenti nel dataset. */
export const PROVINCE = {
  BG: "Bergamo",
  BS: "Brescia",
  CO: "Como",
  CR: "Cremona",
  LC: "Lecco",
  LO: "Lodi",
  MB: "Monza e della Brianza",
  MI: "Milano",
  MN: "Mantova",
  PV: "Pavia",
  SO: "Sondrio",
  VA: "Varese",
};

/** Parole che restano maiuscole quando si normalizza un nome tutto MAIUSCOLO. */
const ACRONIMI = new Set([
  "RSA", "RSD", "ASP", "ASST", "ATS", "IPAB", "ONLUS", "SRL", "S.R.L.", "SPA",
  "S.P.A.", "SNC", "SAS", "COOP", "SOC", "IRCCS", "ASL", "CDI", "APS", "ODV",
  "ETS", "SS", "SP", "SC", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII",
]);

/** Parole che restano minuscole se non sono la prima. */
const MINUSCOLE = new Set([
  "di", "de", "del", "della", "dello", "dei", "degli", "delle", "da", "dal",
  "dalla", "e", "ed", "in", "il", "lo", "la", "i", "gli", "le", "a", "al",
  "alla", "per", "con", "su", "tra", "fra", "d", "l",
  // Forme elise: "dell'Anziano", non "Dell'Anziano".
  "dell", "nell", "all", "dall", "sull", "coll",
]);

/**
 * L'export regionale ha campi doppiamente quotati: dopo il parsing CSV restano
 * virgolette di troppo, es. `"CASA DELL'ANZIANO - RESIDENZA ""LUIGI STRADA"""`.
 * Toglie l'involucro esterno e riporta le virgolette raddoppiate a una sola.
 */
export function ripulisciVirgolette(valore) {
  // 1. Involucro esterno lasciato dall'export, che quota di nuovo un campo gia
  //    quotato: `"CDI ""RSA DI STRADELLA"""` -> `CDI ""RSA DI STRADELLA""`.
  let testo = (valore ?? "").trim();
  while (testo.length > 1 && testo.startsWith('"') && testo.endsWith('"')) {
    testo = testo.slice(1, -1).trim();
  }

  // 2. Virgolette raddoppiate a una sola: quelle rimaste fanno parte del nome
  //    — `CDI "RSA di Stradella"` — e vanno tenute.
  testo = testo.replace(/""/g, '"');

  // 3. Solo se ne resta una spaiata, cioe` se il totale e dispari, si toglie
  //    quella a inizio o fine. Prima di questa correzione la si toglieva
  //    sempre, e in pagina si leggeva `CDI "RSA di Stradella` con la
  //    virgoletta di chiusura mancante.
  if (((testo.match(/"/g) ?? []).length % 2) === 1) {
    testo = testo.replace(/^"|"$/g, "");
  }

  // Se ne resta una dispari in mezzo alla frase, e un'apertura che la fonte non
  // ha mai chiuso — succede in una riga dei CDI, dove l'export ha tre virgolette
  // invece di quattro. Si toglie l'ultima: e quella rimasta senza compagna.
  if (((testo.match(/"/g) ?? []).length % 2) === 1) {
    const ultima = testo.lastIndexOf('"');
    testo = testo.slice(0, ultima) + testo.slice(ultima + 1);
  }

  return testo.replace(/\s+/g, " ").trim();
}

/**
 * "RSA SAN SISTO 2" -> "RSA San Sisto 2"
 * "CASA DI RIPOSO S. GIUSEPPE" -> "Casa di Riposo S. Giuseppe"
 * "CASSANO D'ADDA" -> "Cassano d'Adda"
 * `"CASA DELL'ANZIANO - RESIDENZA ""LUIGI STRADA"""` -> `Casa dell'Anziano - Residenza "Luigi Strada"`
 */
/** Lettere della parola, senza punteggiatura: `"RSA` e `R.S.A.` danno `RSA`. */
function nucleo(parola) {
  return parola.replace(/[^A-Za-zÀ-ÿ]/g, "").toUpperCase();
}

/** "CITTA'" -> "CITTÀ": accento troncato come si scriveva a macchina. */
const ACCENTATE = { A: "À", E: "È", I: "Ì", O: "Ò", U: "Ù" };

export function normalizzaMaiuscole(valore) {
  const testo = ripulisciVirgolette(valore)
    .replace(/\s+/g, " ")
    // Solo a fine parola: dentro la parola l'apostrofo e un'elisione
    // ("DELL'ANZIANO") e va lasciato dov'e.
    .replace(/([AEIOU])'(?=\s|$|")/g, (_, vocale) => ACCENTATE[vocale]);
  if (!testo) return "";
  // Se non è tutto maiuscolo, la fonte ha già una sua forma: non la tocchiamo.
  if (testo !== testo.toUpperCase()) return testo;

  return testo
    .split(" ")
    .map((parola, indice) => {
      // La sigla si riconosce dalle lettere, non dalla punteggiatura che la
      // circonda: senza questo, `"RSA` diventava `"Rsa` e `C.D.I.` `C.d.i.`.
      if (ACRONIMI.has(parola) || ACRONIMI.has(nucleo(parola))) return parola;
      // Gestisce l'apostrofo: D'ADDA -> d'Adda, SANT'ANGELO -> Sant'Angelo
      const pezzi = parola.split("'");
      const composta = pezzi
        .map((pezzo, i) => {
          const minuscolo = pezzo.toLowerCase();
          if (ACRONIMI.has(pezzo)) return pezzo;
          if (i === 0 && indice > 0 && MINUSCOLE.has(minuscolo)) return minuscolo;
          // Maiuscola sulla prima lettera vera: senza questo, una parola che
          // inizia con virgolette o parentesi resterebbe minuscola.
          return minuscolo.replace(
            /^([^a-zà-ù]*)([a-zà-ù])/,
            (_, prefisso, lettera) => prefisso + lettera.toUpperCase(),
          );
        })
        .join("'");
      // "Sant'angelo" -> "Sant'Angelo"
      return composta.replace(/'([a-zà-ù])/g, (_, c) => `'${c.toUpperCase()}`);
    })
    .join(" ");
}

/** "24.126" -> "24126"; restituisce null se non sono 5 cifre. */
export function normalizzaCap(valore) {
  const cifre = (valore ?? "").replace(/\D/g, "");
  return /^\d{5}$/.test(cifre) ? cifre : null;
}

/** "45,67749" -> 45.67749 */
function numeroConVirgola(valore) {
  const testo = (valore ?? "").trim().replace(",", ".");
  const numero = Number.parseFloat(testo);
  return Number.isFinite(numero) ? numero : null;
}

/** Riquadro geografico della Lombardia, per scartare coordinate assurde. */
const RIQUADRO = { latMin: 44.6, latMax: 46.7, lngMin: 8.4, lngMax: 11.5 };

/**
 * Coordinate: preferisce la colonna Location ("POINT (lng lat)"), che usa già
 * il punto decimale; ripiega su WGS84_Y/WGS84_X con la virgola.
 */
export function estraiCoordinate(riga) {
  const point = (riga.Location ?? "").match(
    /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i,
  );

  const lng = point ? Number.parseFloat(point[1]) : numeroConVirgola(riga.WGS84_X);
  const lat = point ? Number.parseFloat(point[2]) : numeroConVirgola(riga.WGS84_Y);

  if (lat === null || lng === null) return { lat: null, lng: null, valide: false };

  const dentro =
    lat >= RIQUADRO.latMin && lat <= RIQUADRO.latMax &&
    lng >= RIQUADRO.lngMin && lng <= RIQUADRO.lngMax;

  return { lat, lng, valide: dentro };
}

function intero(valore) {
  const numero = Number.parseInt((valore ?? "").replace(/\D/g, ""), 10);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

/**
 * Descrizione costruita solo con campi realmente presenti nella fonte.
 * Nessun aggettivo inventato: se un dato manca, la frase corrispondente sparisce.
 */
function componiDescrizione({ nome, comune, provincia, gestore, natura, accreditati, autorizzati, convenzionata }) {
  const frasi = [];

  frasi.push(
    `${nome} è una residenza sanitaria assistenziale (RSA) con sede a ${comune}, in provincia di ${provincia}.`,
  );

  if (accreditati !== null && autorizzati !== null && accreditati !== autorizzati) {
    frasi.push(
      `La struttura dispone di ${autorizzati} posti letto autorizzati, di cui ${accreditati} accreditati con il servizio sanitario regionale.`,
    );
  } else if (accreditati !== null) {
    frasi.push(`La struttura dispone di ${accreditati} posti letto accreditati.`);
  } else if (autorizzati !== null) {
    frasi.push(`La struttura dispone di ${autorizzati} posti letto autorizzati.`);
  }

  if (gestore) {
    frasi.push(
      `È gestita da ${gestore}${natura ? ` ed è a gestione ${natura.toLowerCase()}` : ""}.`,
    );
  } else if (natura) {
    frasi.push(`È una struttura a gestione ${natura.toLowerCase()}.`);
  }

  frasi.push(
    convenzionata
      ? "Risulta accreditata: una parte della retta può essere coperta dal servizio sanitario regionale."
      : "Non risulta accreditata: la retta è interamente a carico dell'ospite o della famiglia.",
  );

  frasi.push(
    "I dati provengono dall'elenco open data di Regione Lombardia e non includono recapiti telefonici, sito web e rette.",
  );

  return frasi.join(" ");
}

/**
 * Trasforma una riga del CSV in una struttura del nostro schema.
 * Restituisce { ok: true, struttura } oppure { ok: false, motivo }.
 *
 * Include SOLO i campi che questa fonte contiene davvero. Telefono, email,
 * sito, prezzi e nucleo_alzheimer restano fuori dal payload: mandarli a null
 * significherebbe che un reimport cancella quanto aggiunto dall'arricchimento
 * (OSM, siti ufficiali, dati forniti dalle strutture). Le colonne assenti
 * dall'upsert non vengono toccate sulle righe esistenti.
 */
export function normalizzaRiga(riga) {
  const nome = normalizzaMaiuscole(riga.DENOM_STRUTTURA);
  if (!nome) return { ok: false, motivo: "denominazione mancante" };

  const comune = normalizzaMaiuscole(riga.COMUNE_UBICAZIONE);
  if (!comune) return { ok: false, motivo: "comune mancante" };

  const sigla = (riga.PROV_COMUNE_UBICAZIONE ?? "").trim().toUpperCase();
  const provincia = PROVINCE[sigla];
  if (!provincia) {
    return { ok: false, motivo: `sigla provincia sconosciuta: "${sigla || "vuota"}"` };
  }

  const cap = normalizzaCap(riga.CAP);
  if (!cap) return { ok: false, motivo: `CAP non valido: "${riga.CAP ?? ""}"` };

  const { lat, lng, valide } = estraiCoordinate(riga);
  if (!valide) return { ok: false, motivo: "coordinate assenti o fuori dalla Lombardia" };

  const accreditati = intero(riga.TOT_POSTI_ACCREDITATI);
  const autorizzati = intero(riga.TOT_POSTI_AUTORIZZATI);
  const convenzionata = (riga.FL_ACCREDITATA ?? "").trim().toUpperCase() === "SI";
  const gestore = normalizzaMaiuscole(riga.DENOM_GESTORE);
  const natura = (riga.PUBBLICA_PRIVATA ?? "").trim();

  return {
    ok: true,
    codiceFonte: (riga.COD_STRUTTURA ?? "").trim(),
    struttura: {
      nome,
      tipologia: fonte.tipologia,
      indirizzo: normalizzaMaiuscole(riga.INDIRIZZO_UBICAZIONE).replace(/,(\S)/g, ", $1") || null,
      cap,
      comune,
      provincia,
      provincia_sigla: sigla,
      regione: fonte.regione,
      lat,
      lng,
      posti_letto: accreditati ?? autorizzati,
      convenzionata,
      codice_struttura_fonte: (riga.COD_STRUTTURA ?? "").trim() || null,
      denominazione_gestore: gestore || null,
      partita_iva_gestore: (riga.P_IVA ?? "").trim() || null,
      codice_fiscale_gestore: (riga.COD_FISCALE_GESTORE ?? "").trim() || null,
      descrizione: componiDescrizione({
        nome, comune, provincia, gestore, natura, accreditati, autorizzati, convenzionata,
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
