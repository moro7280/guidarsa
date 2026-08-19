// Mapping colonne per l'elenco delle unita d'offerta sociale per anziani di
// Regione Lombardia, limitatamente ai centri diurni.
//
// La fonte contiene due unita d'offerta: 55 "centro diurni anziani" e 144
// "alloggio protetto anziani". Solo i primi entrano: l'alloggio protetto e una
// forma abitativa che il nostro schema non ha, e infilarlo dentro una delle
// quattro tipologie esistenti direbbe al lettore una cosa falsa. Le righe
// escluse compaiono nel report dell'import, non spariscono in silenzio.
//
// Differenza dal registro dei CDI (lombardia-cdi.mjs): quelli sono centri
// socio-sanitari accreditati, questi sono centri sociali comunali o di
// associazioni. Sono due registri distinti della stessa Regione, e questa fonte
// non dichiara alcun accreditamento: `convenzionata` resta sconosciuta.

import { PROVINCE, normalizzaCap, normalizzaMaiuscole } from "./lombardia.mjs";

export const fonte = {
  file: "data/lombardia-offerta-sociale.csv",
  nome: "Regione Lombardia — Strutture di offerta sociale per anziani",
  url: "https://www.dati.lombardia.it/d/i846-pq8q",
  scaricatoIl: "2026-08-20",
  fonteDati: "opendata_lombardia_sociale",
  regione: "Lombardia",
  tipologia: "centro-diurno",
};

export { PROVINCE };

/** L'unica unita d'offerta che importiamo. */
const UNITA_AMMESSA = /centro\s+diurni?\s+anziani/i;

const RIQUADRO = { latMin: 44.6, latMax: 46.7, lngMin: 8.4, lngMax: 11.5 };

function numeroDecimale(valore) {
  const numero = Number.parseFloat((valore ?? "").trim().replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

/** Qui la colonna si chiama `location` minuscola, non `Location` come nei CDI. */
function estraiCoordinate(riga) {
  const point = (riga.location ?? "").match(
    /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i,
  );
  const lng = point ? Number.parseFloat(point[1]) : numeroDecimale(riga.WGS84_X);
  const lat = point ? Number.parseFloat(point[2]) : numeroDecimale(riga.WGS84_Y);
  if (lat === null || lng === null) return { lat: null, lng: null, valide: false };
  const dentro =
    lat >= RIQUADRO.latMin && lat <= RIQUADRO.latMax &&
    lng >= RIQUADRO.lngMin && lng <= RIQUADRO.lngMax;
  return { lat, lng, valide: dentro };
}

function intero(valore) {
  const numero = Number.parseInt((valore ?? "").replace(/\D/g, ""), 10);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/**
 * "0332/766514" e un numero solo, con la barra fra prefisso e numero: la barra
 * diventa spazio, cosi il link `tel:` che la scheda costruisce resta valido.
 */
function normalizzaTelefono(valore) {
  const testo = (valore ?? "").trim();
  if (!testo) return null;
  const primo = testo.split(/[;]/)[0].trim();
  const cifre = primo.replace(/\D/g, "");
  if (cifre.length < 6 || cifre.length > 13) return null;
  return primo.replace(/\s*\/\s*/, " ").replace(/\s+/g, " ");
}

function normalizzaEmail(valore) {
  const testo = (valore ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(testo) ? testo : null;
}

/** La fonte scrive "WWW.COMUNE.BESOZZO.VA.IT": senza schema non e un link. */
function normalizzaSito(valore) {
  const testo = (valore ?? "").trim().toLowerCase();
  if (!testo || testo.includes("@")) return null;
  const conSchema = /^https?:\/\//.test(testo) ? testo : `https://${testo}`;
  try {
    const url = new URL(conSchema);
    return url.hostname.includes(".") ? url.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

function componiDescrizione({ nome, comune, provincia, gestore, posti, conRecapiti }) {
  const frasi = [
    `${nome} è un centro diurno per anziani con sede a ${comune}, in provincia di ${provincia}.`,
    "È iscritto fra le unità d'offerta sociale di Regione Lombardia: accoglie la persona durante il giorno e la riporta a casa la sera.",
  ];

  if (posti !== null) frasi.push(`La capienza dichiarata è di ${posti} posti.`);
  if (gestore) frasi.push(`L'ente gestore è ${gestore}.`);

  frasi.push(
    "Le unità d'offerta sociale non sono strutture socio-sanitarie accreditate: l'elenco regionale non dichiara alcun rapporto con il servizio sanitario, quindi costi e modalità di accesso vanno chiesti direttamente al centro o al comune.",
  );
  frasi.push(
    conRecapiti
      ? "I dati, recapiti compresi, provengono dall'elenco open data di Regione Lombardia."
      : "I dati provengono dall'elenco open data di Regione Lombardia, che per questo centro non riporta recapiti.",
  );

  return frasi.join(" ");
}

export function normalizzaRiga(riga) {
  const unita = (riga.UNITA_OFFERTE_SOCIALI ?? "").trim();
  if (!UNITA_AMMESSA.test(unita)) {
    return { ok: false, motivo: `unità d'offerta fuori scope: "${unita || "vuota"}"` };
  }

  const nome = normalizzaMaiuscole(riga.DENOMINAZIONE_STRUTTURA);
  if (!nome) return { ok: false, motivo: "denominazione mancante" };

  const comune = normalizzaMaiuscole(riga.COMUNE_DI_UBICAZIONE);
  if (!comune) return { ok: false, motivo: "comune mancante" };

  const sigla = (riga.PROV ?? "").trim().toUpperCase();
  const provincia = PROVINCE[sigla];
  if (!provincia) {
    return { ok: false, motivo: `sigla provincia sconosciuta: "${sigla || "vuota"}"` };
  }

  const cap = normalizzaCap(riga.CAP);
  if (!cap) return { ok: false, motivo: `CAP non valido: "${riga.CAP ?? ""}"` };

  const { lat, lng, valide } = estraiCoordinate(riga);
  if (!valide) return { ok: false, motivo: "coordinate assenti o fuori dalla Lombardia" };

  const gestore = normalizzaMaiuscole(riga.DENOMINAZIONE_EG);
  const posti = intero(riga.NR_POSTI);
  const telefono = normalizzaTelefono(riga.TELEFONO_STRUTTURA);
  const email = normalizzaEmail(riga.EMAIL_STRUTTURA);
  const sito = normalizzaSito(riga.SITO_WEB_MAIL);

  // Provenienza per campo: i recapiti qui arrivano dall'open data regionale,
  // non da OSM ne dal sito della struttura. Serve a sapere, piu` avanti, quale
  // arricchimento puo` sovrascriverli.
  const provenienza = { fonte: fonte.fonteDati, url: fonte.url, il: fonte.scaricatoIl };
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
  // I campi assenti restano fuori dal payload: mandarli a null significherebbe
  // che un reimport cancella quanto aggiunto dall'arricchimento.
  if (Object.keys(fonteContatti).length > 0) contatti.fonte_contatti = fonteContatti;

  return {
    ok: true,
    codiceFonte: (riga.CODICE_CUDES ?? "").trim(),
    struttura: {
      nome,
      tipologia: fonte.tipologia,
      indirizzo: normalizzaMaiuscole(riga.INDIRIZZO_STRUTTURA).replace(/,(\S)/g, ", $1") || null,
      cap,
      comune,
      provincia,
      provincia_sigla: sigla,
      regione: fonte.regione,
      lat,
      lng,
      ...contatti,
      posti_letto: posti,
      // Registro sociale: l'accreditamento socio-sanitario non c'entra e la
      // fonte non lo dichiara. null = non lo sappiamo.
      convenzionata: null,
      codice_struttura_fonte: (riga.CODICE_CUDES ?? "").trim() || null,
      denominazione_gestore: gestore || null,
      partita_iva_gestore: (riga.PARTITA_IVA_EG ?? "").trim() || null,
      codice_fiscale_gestore: (riga.CODICE_FISCALE_EG ?? "").trim() || null,
      descrizione: componiDescrizione({
        nome,
        comune,
        provincia,
        gestore,
        posti,
        conRecapiti: Boolean(telefono || email || sito),
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
