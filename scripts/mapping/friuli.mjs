// Mapping colonne per l'elenco delle strutture residenziali per anziani
// di Regione Friuli-Venezia Giulia.
//
// Qualita della fonte: 169 strutture, tutte con telefono, coordinate e posti
// letto. Sotto questo aspetto e migliore del CSV lombardo, che i recapiti non
// li ha affatto.

export const fonte = {
  file: "data/friuli-anziani.csv",
  nome: "Regione Friuli-Venezia Giulia — Elenco strutture residenziali per anziani",
  url: "https://www.dati.friuliveneziagiulia.it/",
  scaricatoIl: "2026-08-19",
  fonteDati: "opendata_friuli",
  regione: "Friuli-Venezia Giulia",
  delimitatore: ",",
};

export const PROVINCE = {
  GO: "Gorizia",
  PN: "Pordenone",
  TS: "Trieste",
  UD: "Udine",
};

/**
 * Il Friuli classifica per livello di assistenza, non per tipologia come la
 * Lombardia. La corrispondenza non e ovvia e va dichiarata:
 *
 * - secondo e terzo livello accolgono persone non autosufficienti con
 *   assistenza sanitaria continuativa: e cio che le famiglie cercano come RSA
 * - livello base, primo livello, alberghiera e comunita familiare accolgono
 *   persone parzialmente autonome: sono case di riposo
 *
 * Il livello originale finisce comunque nella descrizione, cosi chi legge sa
 * cosa dice davvero il documento regionale.
 */
const TIPOLOGIA_PER_LIVELLO = {
  "terzo livello": "rsa",
  "secondo livello": "rsa",
  "primo livello": "casa-di-riposo",
  "livello base": "casa-di-riposo",
  alberghiera: "casa-di-riposo",
  "comunita familiare": "casa-di-riposo",
};

/**
 * Il file arriva con UTF-8 codificato due volte: "Comunità" diventa
 * "ComunitÃ ". Si ripara reinterpretando i byte come latin1 e rileggendoli
 * come UTF-8. Senza, i nomi dei comuni con accento finirebbero storti in URL
 * e in pagina.
 */
export function riparaCodifica(testo) {
  if (!/Ã.|Â./.test(testo)) return testo;
  return Buffer.from(testo, "latin1").toString("utf8");
}

function ripulisci(valore) {
  return (
    riparaCodifica((valore ?? "").trim())
      // La fonte racchiude molte denominazioni fra apici singoli, a volte
      // spaiati: "Residenza 'Tre Cuori'". Si tolgono gli apici che stanno a
      // inizio o fine parola, non quelli dentro una parola — "dell'anziano"
      // deve restare intatto.
      .replace(/(^|\s)['"]+/g, "$1")
      .replace(/['"]+($|\s)/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
  );
}

const MINUSCOLE = new Set([
  "di", "de", "del", "della", "dei", "degli", "delle", "da", "dal", "e", "ed",
  "in", "il", "lo", "la", "i", "gli", "le", "a", "al", "alla", "per", "con",
  "dell", "nell", "all", "sull",
]);

const ACRONIMI = new Set(["RSA", "ASP", "ONLUS", "ETS", "SRL", "SPA", "IPAB"]);

function normalizzaMaiuscole(valore) {
  const testo = ripulisci(valore);
  if (!testo || testo !== testo.toUpperCase()) return testo;

  return testo
    .split(" ")
    .map((parola, indice) => {
      if (ACRONIMI.has(parola)) return parola;
      return parola
        .split("'")
        .map((pezzo, i) => {
          const minuscolo = pezzo.toLowerCase();
          if (ACRONIMI.has(pezzo)) return pezzo;
          if (i === 0 && indice > 0 && MINUSCOLE.has(minuscolo)) return minuscolo;
          return minuscolo.replace(/^([^a-zà-ù]*)([a-zà-ù])/, (_, p, l) => p + l.toUpperCase());
        })
        .join("'")
        .replace(/'([a-zà-ù])/g, (_, c) => `'${c.toUpperCase()}`);
    })
    .join(" ");
}

function intero(valore) {
  const numero = Number.parseInt(String(valore ?? "").replace(/\D/g, ""), 10);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

function numeroDecimale(valore) {
  const numero = Number.parseFloat(String(valore ?? "").replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Il separatore fra piu numeri qui e il punto e virgola, non la barra: in
 * Italia "0481/757500" e un numero solo, con la barra fra prefisso e numero.
 * Spezzando sulla barra restava "0481" e ogni telefono veniva scartato.
 */
function normalizzaTelefono(valore) {
  const primo = ripulisci(valore).split(/[;]/)[0].trim();
  const cifre = primo.replace(/\D/g, "");
  if (cifre.length < 6 || cifre.length > 13) return null;
  return primo.replace(/\s*\/\s*/, " ");
}

function componiDescrizione({ nome, comune, provincia, livello, natura, posti, tipologia }) {
  const frasi = [
    `${nome} è una struttura residenziale per anziani con sede a ${comune}, in provincia di ${provincia}.`,
  ];

  if (posti !== null) {
    frasi.push(`Dispone di ${posti} posti letto autorizzati.`);
  }
  if (livello) {
    frasi.push(
      `Nella classificazione regionale del Friuli-Venezia Giulia è indicata come «${livello}»${
        tipologia === "rsa"
          ? ": accoglie persone non autosufficienti con assistenza continuativa"
          : ": accoglie persone parzialmente autonome"
      }.`,
    );
  }
  if (natura) {
    frasi.push(`La natura giuridica dichiarata è «${natura.toLowerCase()}».`);
  }

  frasi.push(
    "I dati provengono dall'elenco open data di Regione Friuli-Venezia Giulia e non includono le rette.",
  );

  return frasi.join(" ");
}

export function normalizzaRiga(riga) {
  const nome = normalizzaMaiuscole(riga.denominazione);
  if (!nome) return { ok: false, motivo: "denominazione mancante" };

  const comune = normalizzaMaiuscole(riga.citta);
  if (!comune) return { ok: false, motivo: "comune mancante" };

  const sigla = ripulisci(riga.prov).toUpperCase();
  const provincia = PROVINCE[sigla];
  if (!provincia) return { ok: false, motivo: `sigla provincia sconosciuta: "${sigla || "vuota"}"` };

  const livelloGrezzo = ripulisci(riga.tipologia);
  const chiave = livelloGrezzo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const tipologia = TIPOLOGIA_PER_LIVELLO[chiave];
  if (!tipologia) {
    return { ok: false, motivo: `livello assistenziale non mappato: "${livelloGrezzo}"` };
  }

  const lat = numeroDecimale(riga.lat);
  const lng = numeroDecimale(riga.longit);
  const dentroRegione =
    lat !== null && lng !== null && lat > 45.4 && lat < 46.7 && lng > 12.3 && lng < 13.95;

  const cap = ripulisci(riga.cap).replace(/\D/g, "");
  const posti = intero(riga.pl_tot);
  const civico = ripulisci(riga.n_civ);
  const via = normalizzaMaiuscole(riga.indirizzo);

  return {
    ok: true,
    codiceFonte: ripulisci(riga.id),
    struttura: {
      nome,
      tipologia,
      indirizzo: via ? `${via}${civico ? ` ${civico}` : ""}` : null,
      cap: /^\d{5}$/.test(cap) ? cap : null,
      comune,
      provincia,
      provincia_sigla: sigla,
      regione: fonte.regione,
      lat: dentroRegione ? lat : null,
      lng: dentroRegione ? lng : null,
      telefono: normalizzaTelefono(riga.telefono),
      posti_letto: posti,
      // L'elenco regionale non dichiara l'accreditamento: resta sconosciuto,
      // e null significa "non lo sappiamo", non "non e convenzionata".
      convenzionata: null,
      descrizione: componiDescrizione({
        nome,
        comune,
        provincia,
        livello: livelloGrezzo,
        natura: normalizzaMaiuscole(riga.natura_giuridica),
        posti,
        tipologia,
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
