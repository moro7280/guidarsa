// Mapping colonne per l'elenco delle strutture sanitarie pubbliche e
// accreditate dell'Azienda provinciale per i servizi sanitari di Trento.
//
// Il file contiene tutte le strutture sanitarie della Provincia — ambulatori,
// laboratori, consultori — e le nostre sono il sottoinsieme con
// `ASSISTENZA = "ASSISTENZA AGLI ANZIANI"`: 87 righe, 59 residenziali e 28
// semiresidenziali. Come per l'Umbria il tracciato deriva dal modello
// ministeriale STS.11, quindi le colonne e la codifica del rapporto con il SSN
// sono le stesse.
//
// **L'eta di questo dato e il suo problema principale.** L'header HTTP del file
// su servizi.apss.tn.it dice `Last-Modified: 12 Apr 2021`: non e un metadato
// trascurato nel catalogo, e il file stesso, fermo da cinque anni. Su un elenco
// operativo — non su una rilevazione datata per costruzione come quella umbra —
// significa che una struttura chiusa nel frattempo resterebbe qui dentro.
//
// Per questo ogni descrizione dichiara l'anno, la provenienza dei recapiti
// porta la data della fonte e non quella dello scaricamento, e le schede
// invitano a verificare prima di muoversi. Esiste una fonte provinciale
// aggiornata al 2026, una pagina per struttura su trentinosalute.net, ma i suoi
// elenchi si caricano via JavaScript: e un connettore, non un mapping, ed e il
// primo candidato per sostituire questa fonte.

import { comuneDaCodice } from "../lib/istat.mjs";

export const fonte = {
  file: "data/trentino-strutture.csv",
  nome: "APSS Trento — Strutture sanitarie pubbliche e accreditate",
  url: "https://dati.trentino.it/dataset/strutture-sanitarie-dell-azienda-sanitaria-e-convenzionate",
  scaricatoIl: "2026-08-25",
  /** Data reale dell'ultimo aggiornamento del file, letta dall'header HTTP. */
  aggiornataAl: "2021-04-12",
  fonteDati: "opendata_trentino",
  regione: "Trentino-Alto Adige",
  /**
   * L'anagrafe ISTAT scrive la regione in forma bilingue,
   * "Trentino-Alto Adige/Südtirol". E il nome giusto per il controllo di
   * appartenenza, ma non per le nostre URL: `/rsa/trentino-alto-adige-sudtirol/`
   * sarebbe illeggibile e nessuno lo cerca. I due nomi restano separati.
   */
  regioneIstat: "Trentino-Alto Adige/Südtirol",
  delimitatore: ",",
  codifica: "utf8",
};

/** Solo queste due righe ci riguardano; il resto del file e sanita generale. */
const TIPOLOGIA_PER_STRUTTURA = {
  "STRUTTURA RESIDENZIALE": "rsa",
  "STRUTTURA SEMIRESIDENZIALE": "centro-diurno",
};

/**
 * Stessa codifica del quadro I dello STS.11 gia incontrata in Umbria, qui
 * scritta per esteso invece che con il codice numerico. Entrambi i valori
 * descrivono strutture dentro il servizio sanitario, quindi `convenzionata` e
 * true in tutti e due i casi.
 */
const RAPPORTO_SSN = {
  "STRUTTURA DIRETTAMENTE GESTITA": "direttamente gestita dall'azienda sanitaria provinciale",
  "STRUTTURA NON DIRETTAMENTE GESTITA": "accreditata o in regime di convenzione con il servizio sanitario provinciale",
};

const ACRONIMI = new Set([
  "RSA", "R.S.A.", "RSO", "APSP", "A.P.S.P.", "APSS", "A.P.S.S.", "ONLUS",
  "ETS", "SRL", "S.R.L.", "SPA", "IPAB", "UPIPA", "SPES",
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
    // Accento troncato a fine parola, come in "SANITA'": va restituito
    // l'accento vero, o finisce cosi nell'H1 della pagina.
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
 * Quasi tutte le strutture si chiamano "AZIENDA PUBBLICA SERVIZI ALLA PERSONA -
 * RSA <PAESE>": il prefisso e la forma giuridica dell'ente, uguale per decine di
 * righe, e ripetuto in H1 e title renderebbe le pagine indistinguibili fra loro.
 * Si tiene la parte che identifica davvero la struttura e l'ente torna nella
 * descrizione, dove serve a chi legge invece che a nessuno.
 */
function nomeLeggibile(grezzo) {
  const pulito = ripulisci(grezzo);
  const senzaEnte = pulito
    .replace(/^AZIENDA PUBBLICA SERVIZI ALLA PERSONA\s*-\s*/i, "")
    .replace(/^A\.?P\.?S\.?P\.?\s*-\s*/i, "")
    .trim();
  return normalizzaMaiuscole(senzaEnte || pulito);
}

function normalizzaEmail(valore) {
  const testo = ripulisci(valore).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(testo) ? testo : null;
}

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

function normalizzaTelefono(valore) {
  const cifre = (valore ?? "").replace(/\D/g, "");
  return cifre.length >= 6 && cifre.length <= 13 ? cifre : null;
}

/**
 * Le colonne LATITUDINE_P e LONGITUDINE_P sono gia in gradi decimali WGS84 con
 * il punto; LATITUDINE_V e LONGITUDINE_V sono le stesse con la virgola, e non
 * servono. Si scartano i valori fuori dal riquadro del Trentino invece di
 * fidarsi: una coordinata sbagliata mette la struttura in mezzo al mare.
 */
function coordinata(valore, min, max) {
  const numero = Number.parseFloat((valore ?? "").replace(",", "."));
  return Number.isFinite(numero) && numero >= min && numero <= max ? numero : null;
}

function componiDescrizione({ nome, comune, provincia, semiresidenziale, rapporto }) {
  const frasi = [
    semiresidenziale
      ? `${nome} è un centro diurno per anziani con sede a ${comune}, in provincia di ${provincia}: accoglie le persone durante il giorno e le riporta a casa la sera.`
      : `${nome} è una struttura residenziale per anziani con sede a ${comune}, in provincia di ${provincia}.`,
  ];

  frasi.push(
    `Nell'anagrafe dell'Azienda provinciale per i servizi sanitari risulta ${rapporto}: una parte della retta è quindi a carico del servizio sanitario, mentre la quota alberghiera resta alla famiglia.`,
  );

  frasi.push(
    `I dati provengono dall'elenco open data dell'APSS di Trento, il cui ultimo aggiornamento risale ad aprile ${fonte.aggiornataAl.slice(0, 4)}: denominazione e recapiti vanno verificati con la struttura prima di muoversi, e l'apertura stessa del servizio va confermata.`,
  );

  return frasi.join(" ");
}

export function normalizzaRiga(riga) {
  if (riga.ASSISTENZA !== "ASSISTENZA AGLI ANZIANI") {
    return { ok: false, motivo: `assistenza non pertinente: "${riga.ASSISTENZA ?? ""}"` };
  }

  const tipologia = TIPOLOGIA_PER_STRUTTURA[riga.TIPO_STRUTTURA];
  if (!tipologia) {
    return { ok: false, motivo: `tipo struttura non mappato: "${riga.TIPO_STRUTTURA ?? ""}"` };
  }

  const nome = nomeLeggibile(riga.STRUTTURA);
  if (!nome) return { ok: false, motivo: "denominazione mancante" };

  const luogo = comuneDaCodice((riga.COD_COMUNE ?? "").trim());
  if (!luogo) {
    return { ok: false, motivo: `codice comune ISTAT non risolto: "${riga.COD_COMUNE ?? ""}"` };
  }
  if (luogo.regione !== fonte.regioneIstat) {
    return { ok: false, motivo: `comune fuori regione: ${luogo.comune} (${luogo.regione})` };
  }
  // Il file e dell'azienda sanitaria di Trento: una struttura in provincia di
  // Bolzano qui dentro sarebbe un errore della fonte, non un dato da importare.
  if (luogo.provinciaSigla !== "TN") {
    return { ok: false, motivo: `comune fuori provincia di Trento: ${luogo.comune} (${luogo.provinciaSigla})` };
  }

  const rapporto = RAPPORTO_SSN[riga.TIPO_RAPPORTO];
  if (!rapporto) {
    return { ok: false, motivo: `rapporto con il SSN non codificato: "${riga.TIPO_RAPPORTO ?? ""}"` };
  }

  const telefono = normalizzaTelefono(riga.TELEFONO);
  const email = normalizzaEmail(riga.E_MAIL);
  const sito = normalizzaSito(riga.SITO_WEB);

  // La provenienza porta la data dell'ultimo aggiornamento della fonte, non
  // quella dello scaricamento: e quella l'eta vera di questi recapiti.
  const provenienza = { fonte: fonte.fonteDati, url: fonte.url, il: fonte.aggiornataAl };
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
  if (Object.keys(fonteContatti).length > 0) contatti.fonte_contatti = fonteContatti;

  const cap = (riga.CAP ?? "").replace(/\D/g, "");
  const lat = coordinata(riga.LATITUDINE_P, 45.6, 46.6);
  const lng = coordinata(riga.LONGITUDINE_P, 10.4, 12.0);

  return {
    ok: true,
    codiceFonte: (riga.COD_STRUTTURA_OD ?? "").trim(),
    struttura: {
      nome,
      tipologia,
      indirizzo: normalizzaMaiuscole(riga.INDIRIZZO).replace(/,(\S)/g, ", $1") || null,
      cap: /^\d{5}$/.test(cap) ? cap : null,
      comune: luogo.comune,
      provincia: luogo.provincia,
      provincia_sigla: luogo.provinciaSigla,
      regione: fonte.regione,
      ...(lat !== null && lng !== null ? { lat, lng } : {}),
      ...contatti,
      // Entrambi i valori del rapporto stanno dentro il servizio sanitario.
      convenzionata: true,
      // La fonte non dice niente sui nuclei per le demenze: resta ignoto, che
      // non e la stessa cosa di "non ce l'ha".
      nucleo_alzheimer: null,
      codice_struttura_fonte: (riga.COD_STRUTTURA_OD ?? "").trim() || null,
      partita_iva_gestore: (riga.PARTITA_IVA ?? "").trim() || null,
      descrizione: componiDescrizione({
        nome,
        comune: luogo.comune,
        provincia: luogo.provincia,
        semiresidenziale: tipologia === "centro-diurno",
        rapporto,
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
