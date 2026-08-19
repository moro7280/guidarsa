// Mapping colonne per l'elenco dei Centri Diurni Integrati accreditati per
// anziani di Regione Lombardia.
//
// Stesso tracciato del CSV delle RSA — DENOM_STRUTTURA, COMUNE_UBICAZIONE,
// WGS84_X/Y, LOCATION, DENOM_GESTORE — quindi le funzioni di normalizzazione
// arrivano tali e quali da lombardia.mjs: quello che cambia e la tipologia e il
// significato dei posti.

import {
  PROVINCE,
  estraiCoordinate,
  normalizzaCap,
  normalizzaMaiuscole,
} from "./lombardia.mjs";

export const fonte = {
  file: "data/lombardia-cdi.csv",
  nome: "Regione Lombardia — Elenco Centri Diurni Integrati accreditati per anziani (CDI)",
  url: "https://www.dati.lombardia.it/d/rs6k-vuhs",
  scaricatoIl: "2026-08-20",
  fonteDati: "opendata_lombardia_cdi",
  regione: "Lombardia",
  tipologia: "centro-diurno",
};

export { PROVINCE };

function intero(valore) {
  const numero = Number.parseInt((valore ?? "").replace(/\D/g, ""), 10);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

/**
 * Quattro centri su 298 si chiamano solo "Centro Diurno" o "CDI": un nome che
 * non identifica niente e che darebbe a quattro pagine diverse lo stesso H1.
 * In quei casi il nome viene completato con il gestore, che nella fonte c'e
 * sempre. Non e un'invenzione: e un secondo campo dello stesso record.
 */
const NOME_GENERICO = /^(centro diurno|centro diurno integrato|cdi|c\.d\.i\.)$/i;

function componiNome(denominazione, gestore) {
  const nome = normalizzaMaiuscole(denominazione);
  if (!nome) return "";
  if (!NOME_GENERICO.test(nome) || !gestore) return nome;
  return `${nome} — ${gestore}`;
}

/**
 * Il centro diurno non ha posti letto: ha posti in accoglienza diurna. Il campo
 * del nostro schema resta `posti_letto` perche e quello che la tabella ha, ma
 * la descrizione lo dice a parole giuste, senza far credere che si dorma li.
 */
function componiDescrizione({ nome, comune, provincia, gestore, natura, accreditati, autorizzati }) {
  const frasi = [
    `${nome} è un centro diurno integrato (CDI) per anziani con sede a ${comune}, in provincia di ${provincia}.`,
    "Il centro diurno accoglie la persona durante il giorno e la riporta a casa la sera: è la formula che dà sollievo a chi assiste senza interrompere la vita a domicilio.",
  ];

  if (accreditati !== null && autorizzati !== null && accreditati !== autorizzati) {
    frasi.push(
      `Dispone di ${autorizzati} posti autorizzati, di cui ${accreditati} accreditati con il servizio sanitario regionale.`,
    );
  } else if (accreditati !== null) {
    frasi.push(`Dispone di ${accreditati} posti accreditati con il servizio sanitario regionale.`);
  } else if (autorizzati !== null) {
    frasi.push(`Dispone di ${autorizzati} posti autorizzati.`);
  }

  if (gestore) {
    frasi.push(
      `È gestito da ${gestore}${natura ? ` ed è a gestione ${natura.toLowerCase()}` : ""}.`,
    );
  } else if (natura) {
    frasi.push(`È un centro a gestione ${natura.toLowerCase()}.`);
  }

  frasi.push(
    "Essendo accreditato, una quota della retta giornaliera è a carico del servizio sanitario regionale; il resto resta a carico della famiglia e varia da centro a centro.",
  );
  frasi.push(
    "I dati provengono dall'elenco open data di Regione Lombardia e non includono recapiti telefonici, sito web e rette.",
  );

  return frasi.join(" ");
}

export function normalizzaRiga(riga) {
  const gestore = normalizzaMaiuscole(riga.DENOM_GESTORE);
  const nome = componiNome(riga.DENOM_STRUTTURA, gestore);
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
      // L'elenco contiene per definizione i soli centri accreditati, e tutte le
      // 298 righe hanno posti accreditati maggiori di zero: qui true e un dato
      // della fonte, non una deduzione.
      convenzionata: true,
      codice_struttura_fonte: (riga.COD_STRUTTURA ?? "").trim() || null,
      denominazione_gestore: gestore || null,
      partita_iva_gestore: (riga.P_IVA ?? "").trim() || null,
      codice_fiscale_gestore: (riga.COD_FISCALE_GESTORE ?? "").trim() || null,
      descrizione: componiDescrizione({
        nome, comune, provincia, gestore, natura, accreditati, autorizzati,
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
