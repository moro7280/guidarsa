// Raccolta dalla Banca dati sui Presidi socio-assistenziali dell'Emilia-Romagna,
// esposta dall'applicazione ReportER.
//
//   node scripts/raccogli/emilia-romagna.mjs [--limite N]
//
// Come per la Toscana non e uno scraper: si parla con il servizio JSON che
// l'applicazione stessa interroga, scoperto leggendo il traffico della pagina.
// Due endpoint, entrambi sotto /ReportERHomeService/methods/viewer:
//
//   GET  ViewerWizard?id=1001    la definizione dei filtri
//   POST ViewerResult?id=1001    i presidi, con il corpo dei filtri scelti
//
// **La differenza che conta rispetto alla Toscana: qui bastano due richieste.**
// Il servizio accetta un filtro per macroarea e destinatari, quindi
// "residenziale per anziani" e "semiresidenziale per anziani" si chiedono in
// una volta sola ciascuno, per tutta la regione. Non c'e nessun bisogno di
// girare i 312 comuni: farlo sarebbe 156 volte piu traffico per lo stesso
// risultato, e la cortesia verso un servizio pubblico non e un dettaglio.
//
// Esiste anche `POST ExportDiretto?id=1001`, che accetta lo stesso corpo e
// restituisce uno ZIP. Non lo usiamo: ViewerResult da gia JSON strutturato,
// mentre l'export andrebbe scompattato e riparsato senza guadagnare niente —
// stessi dati, stesso numero di richieste, un formato in piu da mantenere.
// Resta annotato come ripiego se un giorno ViewerResult cambiasse forma.
//
// robots.txt: `reporter.regione.emilia-romagna.it/robots.txt` risponde 302 e
// rimanda all'applicazione, quindi il file non esiste; quello del dominio
// regionale non pone divieti che ci riguardino. Nessun divieto, ma nemmeno un
// permesso esplicito: si va piano lo stesso.

import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://reporter.regione.emilia-romagna.it/ReportERHomeService/methods/viewer";
const FLUSSO = "1001";
const USER_AGENT = "GuidaRSA/1.0 (+https://guidarsa.it; directory strutture per anziani)";
const PAUSA_MS = 2000;
const TENTATIVI = 3;
const DESTINAZIONE = "data/emilia-romagna-presidi.json";

/**
 * I valori dei filtri arrivano dal servizio riempiti di spazi fino a 100
 * caratteri, e vanno rimandati **esattamente cosi**: "Residenziale" senza
 * riempimento non seleziona niente e la risposta torna vuota. E la cosa che
 * fa perdere piu tempo di tutte, quindi sta scritta qui.
 */
const LARGHEZZA_VALORE = 100;
const riempi = (valore) => valore.padEnd(LARGHEZZA_VALORE, " ");

/** Le due interrogazioni che coprono tutto cio che ci interessa. */
const INTERROGAZIONI = [
  { chiave: "residenziale", macroarea: "Residenziale", target: "Anziani" },
  { chiave: "semiresidenziale", macroarea: "Semiresidenziale", target: "Anziani" },
];

/**
 * Gli otto filtri che l'applicazione manda sempre, anche quando l'utente non
 * ne tocca nessuno. "-5" significa "Tutti". Ometterne uno fa rispondere male
 * al servizio, quindi si mandano tutti e otto anche quando ne servono due.
 */
function corpoFiltri({ macroarea, target }) {
  return JSON.stringify({
    DII_507: ["-5"], // provincia
    DII_508: ["-5"], // distretto
    DII_509: ["-5"], // comune
    DII_548: [riempi(macroarea)], // macroarea
    DII_579: [riempi(target)], // destinatari
    DII_617: ["-5"], // tipo struttura: lo teniamo aperto e lo leggiamo dal risultato
    DII_482: ["-5"], // natura giuridica dell'ente titolare
    DII_510: ["-5"], // natura giuridica dell'ente gestore
  });
}

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

async function interroga(percorso, corpo) {
  let ultimoErrore;
  for (let tentativo = 1; tentativo <= TENTATIVI; tentativo += 1) {
    try {
      const risposta = await fetch(`${BASE}/${percorso}`, {
        method: corpo ? "POST" : "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          ...(corpo ? { "Content-Type": "application/json" } : {}),
        },
        body: corpo,
        signal: AbortSignal.timeout(180000),
      });
      if (risposta.status >= 500) throw new Error(`HTTP ${risposta.status}`);
      if (!risposta.ok) return { errore: `HTTP ${risposta.status}` };
      return { dati: await risposta.json() };
    } catch (errore) {
      ultimoErrore = errore.message;
      if (tentativo < TENTATIVI) await attendi(PAUSA_MS * 3 * tentativo);
    }
  }
  return { errore: ultimoErrore };
}

/**
 * Un presidio arriva come { title, subTitle, content: [{title, value, label}] }.
 * Qui diventa un oggetto piatto, tenendo per ogni campo la forma leggibile:
 * `label` quando c'e — l'indirizzo ha in `value` un link a Google Maps che noi
 * non usiamo e non ripubblichiamo — altrimenti `value`.
 */
function appiattisci(presidio) {
  const campi = {};
  for (const c of presidio.content ?? []) {
    if (!c?.title) continue;
    if (c.type === "ELENCO") {
      campi[c.title] = {
        nome: (c.label ?? "").trim() || null,
        righe: (c.children ?? []).map((r) => String(r.value ?? "").trim()).filter(Boolean),
      };
    } else {
      const leggibile = (c.label ?? "").trim() || String(c.value ?? "").trim();
      campi[c.title] = leggibile || null;
    }
  }
  return { denominazione: (presidio.title ?? "").trim(), tipologia: (presidio.subTitle ?? "").trim(), ...campi };
}

// --- esecuzione -------------------------------------------------------------

const argomenti = process.argv.slice(2);
const limite = (() => {
  const i = argomenti.indexOf("--limite");
  return i >= 0 ? Number.parseInt(argomenti[i + 1], 10) : null;
})();

console.log("Banca dati Presidi socio-assistenziali — Regione Emilia-Romagna (ReportER)");

const wizard = await interroga(`ViewerWizard?id=${FLUSSO}`);
if (wizard.errore) throw new Error(`Il wizard non risponde: ${wizard.errore}`);
console.log(`flusso: ${wizard.dati?.content?.title ?? "?"} (id ${FLUSSO})\n`);

const perCodice = new Map();
const conteggi = {};

for (const interrogazione of INTERROGAZIONI) {
  await attendi(PAUSA_MS);
  const esito = await interroga(`ViewerResult?id=${FLUSSO}`, corpoFiltri(interrogazione));
  if (esito.errore) throw new Error(`Interrogazione "${interrogazione.chiave}" fallita: ${esito.errore}`);

  const elenco = esito.dati?.content ?? [];
  conteggi[interrogazione.chiave] = elenco.length;
  console.log(`${interrogazione.macroarea} + ${interrogazione.target}: ${elenco.length} presidi`);

  const daTenere = limite ? elenco.slice(0, limite) : elenco;
  for (const presidio of daTenere) {
    const piatto = appiattisci(presidio);
    piatto.macroarea = interrogazione.macroarea;
    const codice = piatto["Codice struttura"];
    // Il codice struttura e la chiave stabile della Regione: se un presidio
    // comparisse in due interrogazioni, non va duplicato.
    const chiave = codice || `${piatto.denominazione}|${piatto.Indirizzo}`;
    if (!perCodice.has(chiave)) perCodice.set(chiave, piatto);
  }
}

const presidi = [...perCodice.values()];
const adesso = new Date();
const oggi = [
  adesso.getFullYear(),
  String(adesso.getMonth() + 1).padStart(2, "0"),
  String(adesso.getDate()).padStart(2, "0"),
].join("-");

mkdirSync("data", { recursive: true });
writeFileSync(
  DESTINAZIONE,
  `${JSON.stringify(
    {
      fonte: "Regione Emilia-Romagna — Banca dati sui Presidi socio-assistenziali (ReportER)",
      url: "https://reporter.regione.emilia-romagna.it/ReportER/viewer/flusso/1001",
      licenza: "CC-BY 2.5",
      raccoltoIl: oggi,
      interrogazioni: INTERROGAZIONI.map((i) => ({ ...i, presidi: conteggi[i.chiave] })),
      presidi,
    },
    null,
    1,
  )}\n`,
);

console.log(`\npresidi distinti: ${presidi.length}`);
console.log(`snapshot scritto in ${DESTINAZIONE}`);
