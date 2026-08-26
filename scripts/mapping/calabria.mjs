// Mapping per il Registro delle strutture sanitarie private accreditate di
// Regione Calabria.
//
// E un registro di tutta la sanita accreditata — ambulatori, case di cura,
// laboratori, riabilitazione — e le nostre sono le righe con una tipologia per
// anziani. La Regione le codifica per livello assistenziale, e i codici sono la
// cosa piu affidabile del file: la denominazione della struttura non dice quasi
// mai di che tipo sia.
//
// Il file e in CP1252, non in UTF-8: letto come UTF-8 i trattini lunghi delle
// tipologie psichiatriche diventano caratteri di sostituzione. Quelle righe le
// scartiamo comunque, ma la codifica va dichiarata lo stesso perche gli accenti
// dei comuni passano di li.
//
// Il comune non ha codice ISTAT: c'e il nome in `CITTA'` e la sigla della
// provincia in `ASP`, che nelle aziende sanitarie calabresi coincide con la
// sigla automobilistica. Si risolve per nome e sigla sull'anagrafe ISTAT.

import { readFileSync } from "node:fs";
import { comuneDaNome } from "../lib/istat.mjs";

export const fonte = {
  file: "data/calabria-accreditate.csv",
  nome: "Regione Calabria — Registro delle strutture sanitarie private accreditate",
  url: "https://dati.regione.calabria.it/opendata/dataset/registro-delle-strutture-sanitarie-private-accreditate",
  scaricatoIl: "2026-08-26",
  fonteDati: "opendata_calabria",
  regione: "Calabria",
  delimitatore: ";",
  codifica: "latin1",
};

/**
 * I livelli assistenziali calabresi, con i codici del fabbisogno regionale.
 *
 * R1 e R2 sono residenze sanitarie: assistenza sanitaria continuativa a persone
 * non autosufficienti, cioe quello che nella nostra tassonomia e una RSA. R3 e
 * un gradino sotto — la casa protetta accoglie chi ha bisogno di assistenza ma
 * non di quel livello sanitario — ed e piu onesto chiamarla casa di riposo.
 *
 * Il codice regionale resta scritto nella descrizione di ogni scheda: chi legge
 * vede la classificazione vera, non solo la nostra traduzione.
 */
const TIPOLOGIE = {
  "RESIDENZA SANITARIA ASSISTENZIALE PER ANZIANI (R2)": {
    rango: 2,
    tipologia: "rsa",
    descrizione: "residenza sanitaria assistenziale per anziani (livello R2)",
  },
  "CASA PROTETTA PER ANZIANI (R3)": {
    rango: 1,
    tipologia: "casa-di-riposo",
    descrizione: "casa protetta per anziani (livello R3)",
  },
};

/**
 * Comuni che la fonte scrive in una forma che l'anagrafe ISTAT non riconosce,
 * nemmeno con i ripieghi di `comuneDaNome`. Sono sei, tutti verificabili a
 * occhio, e stanno scritti qui invece che risolti da un'euristica perche il
 * comune finisce nell'URL, nel titolo e nel breadcrumb: se sbaglia, sbaglia in
 * modo visibile e permanente.
 *
 * Tre sono varianti ortografiche, tre sono frazioni scritte al posto del
 * comune. Nessuna e un'invenzione: sono la stessa localita con un altro nome.
 */
const ALIAS_COMUNI = {
  "S. Vito sullo Jonio|CZ": "San Vito sullo Ionio", // Jonio/Ionio, variante storica
  "Chiaravalle C.le|CZ": "Chiaravalle Centrale", // "C.le" abbreviato
  "Cassano allo Jonio|CS": "Cassano all'Ionio", // Jonio/Ionio
  "Cropani M.na|CZ": "Cropani", // Cropani Marina e una frazione di Cropani
  "Rosalì - Reggio Calabria|RC": "Reggio di Calabria", // Rosali e una frazione
  "Spezzano della Sila - Camigliatello Silano|CS": "Spezzano della Sila", // Camigliatello e una frazione
};

/**
 * Nove strutture compaiono due volte, con lo stesso indirizzo e lo stesso
 * telefono, perche sono accreditate su due livelli insieme: R2 e R3. Non sono
 * doppioni della fonte e non vanno scartate come tali — sono un edificio solo,
 * che merita una pagina sola.
 *
 * Per sapere quale livello vince serve conoscere tutte le righe prima di
 * scriverne una, quindi il file si legge una seconda volta qui. Vince il rango
 * piu alto: chi e accreditato come RSA e una RSA anche se ha pure un modulo di
 * casa protetta, e la scheda dice entrambe le cose.
 */
function indiceLivelli() {
  const testo = readFileSync(fonte.file).toString(fonte.codifica);
  const righe = [];
  let riga = [];
  let campo = "";
  let inQuote = false;
  for (let i = 0; i < testo.length; i += 1) {
    const c = testo[i];
    if (inQuote) {
      if (c === '"') {
        if (testo[i + 1] === '"') { campo += '"'; i += 1; } else inQuote = false;
      } else campo += c;
    } else if (c === '"') inQuote = true;
    else if (c === fonte.delimitatore) { riga.push(campo); campo = ""; }
    else if (c === "\n") { riga.push(campo); righe.push(riga); riga = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo.length > 0 || riga.length > 0) { riga.push(campo); righe.push(riga); }

  const intestazione = (righe[0] ?? []).map((c) => c.trim());
  const col = (nome) => intestazione.indexOf(nome);
  const indice = new Map();

  for (const r of righe.slice(1)) {
    const livello = TIPOLOGIE[ripulisci(r[col("TIPOLOGIA_STRUTTURA")]).toUpperCase()];
    if (!livello) continue;
    const chiave = chiaveStruttura(r[col("DENOMINAZIONE_STRUTTURA")], r[col("CITTA'")]);
    const attuale = indice.get(chiave) ?? { rango: 0, livelli: [] };
    attuale.livelli.push(livello.descrizione);
    if (livello.rango > attuale.rango) {
      attuale.rango = livello.rango;
      attuale.tipologia = livello.tipologia;
      attuale.principale = livello.descrizione;
    }
    indice.set(chiave, attuale);
  }
  return indice;
}

const chiaveStruttura = (nome, citta) =>
  `${ripulisci(nome).toLowerCase()}|${ripulisci(citta).toLowerCase()}`;

let livelliPerStruttura = null;
const giaEmesse = new Set();

const ACRONIMI = new Set([
  "RSA", "R.S.A.", "SRL", "S.R.L.", "SPA", "S.P.A.", "ONLUS", "ETS", "ARL",
  "A.R.L.", "SAS", "SNC", "COOP", "SOC", "IPAB", "ASP", "R1", "R2", "R3",
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

function normalizzaTelefono(valore) {
  // Alcune righe elencano piu numeri separati da / o da virgola: si tiene il
  // primo, che e quello del centralino della sede operativa.
  const primo = String(valore ?? "").split(/[\/,;]/)[0];
  const cifre = primo.replace(/\D/g, "");
  return cifre.length >= 6 && cifre.length <= 13 ? cifre : null;
}

function normalizzaPec(valore) {
  const testo = ripulisci(valore).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(testo) ? testo : null;
}

function componiDescrizione({ nome, comune, provincia, livelli, gestore, provvedimento }) {
  const frasi = [
    `${nome} è una struttura per anziani con sede a ${comune}, in provincia di ${provincia}.`,
    livelli.length > 1
      ? `Nel registro regionale è accreditata su due livelli: ${livelli.join(" e ")}.`
      : `Nel registro regionale è classificata come ${livelli[0]}.`,
  ];

  if (gestore && gestore.toLowerCase() !== nome.toLowerCase()) {
    frasi.push(`È gestita da ${gestore}.`);
  }

  frasi.push(
    "Risulta accreditata con il servizio sanitario regionale: una parte della retta è quindi a carico della Regione, mentre la quota alberghiera resta alla famiglia.",
  );

  if (provvedimento) {
    frasi.push(`L'accreditamento è disposto con ${provvedimento}.`);
  }

  frasi.push(
    "I dati provengono dal Registro delle strutture sanitarie private accreditate di Regione Calabria: recapiti, disponibilità di posti e tariffe vanno verificati con la struttura prima di muoversi.",
  );

  return frasi.join(" ");
}

export function normalizzaRiga(riga) {
  const tipologiaGrezza = ripulisci(riga.TIPOLOGIA_STRUTTURA).toUpperCase();
  if (!TIPOLOGIE[tipologiaGrezza]) {
    return { ok: false, motivo: `tipologia non pertinente agli anziani: "${tipologiaGrezza.slice(0, 60)}"` };
  }

  if (!livelliPerStruttura) livelliPerStruttura = indiceLivelli();
  const chiave = chiaveStruttura(riga.DENOMINAZIONE_STRUTTURA, riga["CITTA'"]);
  if (giaEmesse.has(chiave)) {
    return { ok: false, motivo: "stessa struttura gia importata con l'altro livello di accreditamento" };
  }
  const livello = livelliPerStruttura.get(chiave);
  if (!livello) return { ok: false, motivo: "livello non determinato" };

  const nome = normalizzaMaiuscole(riga.DENOMINAZIONE_STRUTTURA);
  if (!nome) return { ok: false, motivo: "denominazione mancante" };

  const citta = ripulisci(riga["CITTA'"]);
  const sigla = ripulisci(riga.ASP).toUpperCase();
  const alias = ALIAS_COMUNI[`${citta}|${sigla}`];
  const luogo = comuneDaNome(alias ?? citta, sigla);
  if (!luogo) return { ok: false, motivo: `comune non risolto in anagrafe ISTAT: "${citta}(${sigla})"` };
  if (luogo.regione !== fonte.regione) {
    return { ok: false, motivo: `comune fuori regione: ${luogo.comune} (${luogo.regione})` };
  }

  const telefono = normalizzaTelefono(riga.NUMERO_TELEFONO);
  const provenienza = { fonte: fonte.fonteDati, url: fonte.url, il: fonte.scaricatoIl };
  const contatti = {};
  if (telefono) {
    contatti.telefono = telefono;
    contatti.fonte_contatti = { telefono: provenienza };
  }

  const gestore = normalizzaMaiuscole(riga.SOGGETTO_GESTORE);
  const provvedimento = ripulisci(riga.PROVVEDIMENTO_DI_ACCREDITAMENTO).replace(/\s{2,}/g, " ");

  giaEmesse.add(chiave);

  return {
    ok: true,
    // La fonte non ha un identificativo: in caso di collisione fra due
    // strutture omonime nello stesso comune, a distinguerle e l'indirizzo.
    codiceFonte: ripulisci(riga.INDIRIZZO_SEDE_OPERATIVA).slice(0, 40),
    struttura: {
      nome,
      tipologia: livello.tipologia,
      indirizzo: normalizzaMaiuscole(riga.INDIRIZZO_SEDE_OPERATIVA).replace(/,(\S)/g, ", $1") || null,
      comune: luogo.comune,
      provincia: luogo.provincia,
      provincia_sigla: luogo.provinciaSigla,
      regione: fonte.regione,
      ...contatti,
      // E il registro delle strutture accreditate: tutte lo sono.
      convenzionata: true,
      nucleo_alzheimer: null,
      denominazione_gestore: gestore || null,
      pec_gestore: normalizzaPec(riga.PEC),
      descrizione: componiDescrizione({
        nome,
        comune: luogo.comune,
        provincia: luogo.provincia,
        livelli: [...new Set(livello.livelli)],
        gestore,
        provvedimento: provvedimento.length > 4 ? provvedimento.slice(0, 160) : null,
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
