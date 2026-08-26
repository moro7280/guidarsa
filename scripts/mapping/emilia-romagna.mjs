// Mapping per la Banca dati sui Presidi socio-assistenziali dell'Emilia-Romagna.
// Legge lo snapshot composto da scripts/raccogli/emilia-romagna.mjs.
//
// La fonte e la piu ricca incontrata finora dopo la Toscana: 1.579 presidi per
// anziani, telefono su tutti, email su sette su dieci, e l'ente titolare e
// gestore con recapiti propri. Manca invece cio che altre fonti danno: nessuna
// coordinata, nessun CAP, nessun posto letto, e nessuna dichiarazione di
// accreditamento — il registro attesta l'autorizzazione al funzionamento, che
// non e la stessa cosa. `convenzionata` resta quindi **null**, non false: e la
// regola gia applicata al Friuli, dove affermare "non convenzionata" avrebbe
// significato affermare un dato che la fonte non contiene.
//
// Il comune non ha un campo suo: sta in coda all'indirizzo, nella forma
// "VIA DANTE ALIGHIERI 4 - MIRANDOLA(MO)". Si estrae di li e si risolve
// sull'anagrafe ISTAT per nome e sigla. Il campo `value` dell'indirizzo
// contiene un link a maps.google.com costruito dal portale: non lo leggiamo,
// non lo salviamo e non lo ripubblichiamo — i termini di Google vietano l'uso
// dei loro dati in una directory, e comunque a noi serve il testo, che sta
// nella `label`.

import { comuneDaNome } from "../lib/istat.mjs";

export const fonte = {
  file: "data/emilia-romagna-presidi.json",
  nome: "Regione Emilia-Romagna — Banca dati sui Presidi socio-assistenziali",
  url: "https://reporter.regione.emilia-romagna.it/ReportER/viewer/flusso/1001",
  scaricatoIl: "2026-08-26",
  fonteDati: "opendata_emilia_romagna",
  regione: "Emilia-Romagna",
  formato: "json",
  chiaveRighe: "presidi",
};

/**
 * Le denominazioni regionali, tradotte nella nostra tassonomia.
 *
 * Le tre voci fuori — comunita alloggio, alloggi con servizi, gruppo
 * appartamento — sono soluzioni abitative, non strutture assistenziali: e la
 * stessa decisione presa per gli alloggi protetti del Friuli e per le comunita
 * alloggio siciliane. Il nostro schema non ha una tipologia che le descriva
 * senza mentire, e una scheda che promette assistenza dove c'e un alloggio fa
 * danno a chi la legge.
 *
 * La casa famiglia invece entra: e piccola — sei posti — ma e una struttura
 * residenziale che assiste anziani, e per una famiglia che cerca e un'opzione
 * vera. La denominazione regionale esatta finisce nella descrizione, cosi chi
 * legge sa di cosa si tratta.
 */
const TIPOLOGIE = {
  "Casa-Residenza per anziani non autosuff. (CRA)": "rsa",
  "Casa Protetta Per Anziani": "rsa",
  "Residenza Protetta Per Anziani": "rsa",
  "Casa Di Riposo/Casa Albergo/Albergo per Anziani": "casa-di-riposo",
  "Casa Famiglia - DGR 564/00 e succ. integrazioni-anziani": "casa-di-riposo",
  "Centro Diurno Per Anziani (Centro Diurno Assistenziale)": "centro-diurno",
};

const ESCLUSE = new Set([
  "Comunita Alloggio Per Anziani",
  "Alloggi Con Servizi",
  "Gruppo appartamento per anziani",
]);

const ACRONIMI = new Set([
  "CRA", "C.R.A.", "CD", "C.D.", "RSA", "R.S.A.", "ASP", "A.S.P.", "IPAB",
  "ONLUS", "ETS", "SRL", "S.R.L.", "SPA", "COOP", "ANFFAS", "AUSL",
]);

const MINUSCOLE = new Set([
  "di", "de", "del", "della", "dello", "dei", "degli", "delle", "da", "dal",
  "e", "ed", "in", "il", "lo", "la", "i", "gli", "le", "a", "al", "alla",
  "per", "con", "su", "d", "dell", "nell", "all", "dall", "sull",
]);

const ACCENTATE = { A: "À", E: "È", I: "Ì", O: "Ò", U: "Ù" };

function ripulisci(valore) {
  return String(valore ?? "")
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
  return testo ? testo.split(" ").map(titola).join(" ") : "";
}

function normalizzaEmail(valore) {
  const testo = ripulisci(valore).toLowerCase().replace(/^mailto:/, "");
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(testo) ? testo : null;
}

function normalizzaTelefono(valore) {
  const cifre = String(valore ?? "").replace(/\D/g, "");
  return cifre.length >= 6 && cifre.length <= 13 ? cifre : null;
}

/** "PIAZZA IV NOVEMBRE 1 - FINALE EMILIA(MO)" → via, comune, sigla. */
function scomponiIndirizzo(etichetta) {
  const testo = ripulisci(etichetta);
  const match = testo.match(/^(.*?)\s*-\s*([^-(]+)\(([A-Z]{2})\)$/);
  if (!match) return null;
  return { via: match[1].trim(), comune: match[2].trim(), sigla: match[3] };
}

/** Dalla denominazione regionale al nome della tipologia, senza il target. */
function denominazioneRegionale(tipologia) {
  return ripulisci(tipologia).replace(/^Anziani\s*-\s*/i, "");
}

function componiDescrizione({ nome, comune, provincia, denominazione, tipologia, titolare, gestore, ausl }) {
  const frasi = [];

  if (tipologia === "centro-diurno") {
    frasi.push(`${nome} è un centro diurno per anziani con sede a ${comune}, in provincia di ${provincia}: accoglie le persone durante il giorno e le riporta a casa la sera.`);
  } else if (tipologia === "rsa") {
    frasi.push(`${nome} è una struttura residenziale per anziani non autosufficienti con sede a ${comune}, in provincia di ${provincia}.`);
  } else {
    frasi.push(`${nome} è una struttura residenziale per anziani con sede a ${comune}, in provincia di ${provincia}.`);
  }

  frasi.push(`Nel registro regionale dei presidi socio-assistenziali è classificata come «${denominazione}».`);

  if (titolare) frasi.push(`L'ente titolare è ${titolare}.`);
  if (gestore && gestore !== titolare) frasi.push(`La gestione è affidata a ${gestore}.`);
  if (ausl) frasi.push(`Il territorio di riferimento è quello dell'${ausl.toLowerCase()}.`);

  frasi.push(
    "I dati provengono dalla Banca dati sui Presidi socio-assistenziali di Regione Emilia-Romagna, che attesta l'autorizzazione al funzionamento: l'eventuale accreditamento con il servizio sanitario, la disponibilità di posti e le tariffe vanno chiesti direttamente alla struttura.",
  );

  return frasi.join(" ");
}

export function normalizzaRiga(riga) {
  const denominazione = denominazioneRegionale(riga.tipologia);
  if (ESCLUSE.has(denominazione)) {
    return { ok: false, motivo: `soluzione abitativa, non struttura assistenziale: "${denominazione}"` };
  }
  const tipologia = TIPOLOGIE[denominazione];
  if (!tipologia) return { ok: false, motivo: `tipologia regionale non mappata: "${denominazione}"` };

  const nome = normalizzaMaiuscole(riga.denominazione);
  if (!nome) return { ok: false, motivo: "denominazione mancante" };

  const indirizzo = scomponiIndirizzo(riga.Indirizzo);
  if (!indirizzo) return { ok: false, motivo: `indirizzo non scomponibile: "${riga.Indirizzo ?? ""}"` };

  const luogo = comuneDaNome(indirizzo.comune, indirizzo.sigla);
  if (!luogo) {
    return { ok: false, motivo: `comune non risolto in anagrafe ISTAT: "${indirizzo.comune}(${indirizzo.sigla})"` };
  }
  if (luogo.regione !== fonte.regione) {
    return { ok: false, motivo: `comune fuori regione: ${luogo.comune} (${luogo.regione})` };
  }

  const telefono = normalizzaTelefono(riga.Telefono);
  const email = normalizzaEmail(riga.Email);

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
  if (Object.keys(fonteContatti).length > 0) contatti.fonte_contatti = fonteContatti;

  const titolare = normalizzaMaiuscole(riga["Ente titolare"]?.nome);
  const gestore = normalizzaMaiuscole(riga["Ente gestore"]?.nome);
  const codice = ripulisci(riga["Codice struttura"]);

  return {
    ok: true,
    codiceFonte: codice,
    struttura: {
      nome,
      tipologia,
      indirizzo: normalizzaMaiuscole(indirizzo.via).replace(/,(\S)/g, ", $1") || null,
      comune: luogo.comune,
      provincia: luogo.provincia,
      provincia_sigla: luogo.provinciaSigla,
      regione: fonte.regione,
      ...contatti,
      // Il registro attesta l'autorizzazione, non l'accreditamento con il SSR:
      // "non convenzionata" sarebbe un'affermazione che la fonte non fa.
      convenzionata: null,
      nucleo_alzheimer: null,
      codice_struttura_fonte: codice || null,
      denominazione_gestore: gestore || titolare || null,
      descrizione: componiDescrizione({
        nome,
        comune: luogo.comune,
        provincia: luogo.provincia,
        denominazione,
        tipologia,
        titolare,
        gestore,
        ausl: ripulisci(riga["Azienda USL"]),
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
