// Raccolta dal Portale RSA di Regione Toscana.
//
// Strato nuovo nel progetto: finora ogni fonte era un CSV che si scaricava con
// un comando solo. Qui le strutture stanno dietro un servizio che risponde un
// comune alla volta, quindi serve qualcosa che componga il file locale prima
// che l'import lo legga. Lo scopo resta lo stesso delle altre fonti: uno
// snapshot datato nel repo, cosi l'import e riproducibile anche se domani il
// servizio cambia forma.
//
// Non e uno scraper: gli endpoint sono JSON pubblici, dichiarati in chiaro nel
// file di configurazione dell'applicazione del portale
// (config/rsaConfig-1.0.txt). Non si legge una riga di HTML.
//
//   node scripts/raccogli/toscana.mjs [--limite N]

import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://servizi.toscana.it/RT/RSA";
const USER_AGENT = "GuidaRSA/1.0 (+https://guidarsa.it; directory strutture per anziani)";
const PAUSA_MS = 300;
const TENTATIVI = 3;
const DESTINAZIONE = "data/toscana-rsa.json";

const argomenti = process.argv.slice(2);
const limite = (() => {
  const i = argomenti.indexOf("--limite");
  return i >= 0 ? Number.parseInt(argomenti[i + 1], 10) : null;
})();

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Una richiesta, con qualche tentativo in caso di errore di rete o di 5xx. Se
 * il servizio comincia a rispondere male ci si ferma invece di insistere: 276
 * richieste in fila vanno fatte con garbo.
 */
async function chiedi(percorso) {
  let ultimoErrore;
  for (let tentativo = 1; tentativo <= TENTATIVI; tentativo += 1) {
    try {
      const risposta = await fetch(`${BASE}/${percorso}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(45000),
      });
      if (risposta.status >= 500) throw new Error(`HTTP ${risposta.status}`);
      if (!risposta.ok) return { errore: `HTTP ${risposta.status}` };
      return { dati: await risposta.json() };
    } catch (errore) {
      ultimoErrore = errore.message;
      if (tentativo < TENTATIVI) await attendi(PAUSA_MS * 4 * tentativo);
    }
  }
  return { errore: ultimoErrore };
}

/**
 * Il blocco `json_data` e una stringa base64 con un secondo livello di
 * dettaglio: recapiti diretti, tariffa privata, moduli, camere. Non e un
 * formato documentato — e un contratto interno dell'applicazione — quindi se
 * un giorno sparisse la raccolta deve continuare a funzionare lo stesso.
 */
function decodifica(struttura) {
  if (!struttura.json_data) return null;
  try {
    return JSON.parse(Buffer.from(struttura.json_data, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

// --- Comuni -----------------------------------------------------------------

console.log("Portale RSA Regione Toscana");
console.log(`Endpoint: ${BASE}`);

const esitoComuni = await chiedi("Comuni.json");
if (esitoComuni.errore) throw new Error(`Elenco comuni non raggiungibile: ${esitoComuni.errore}`);

const comuni = esitoComuni.dati?.Comuni?.comuni ?? [];
if (comuni.length === 0) throw new Error("L'elenco dei comuni e vuoto: il servizio ha cambiato forma.");
console.log(`Comuni da interrogare: ${comuni.length}${limite ? ` (limitati a ${limite})` : ""}\n`);

// --- Strutture --------------------------------------------------------------

const perId = new Map();
const falliti = [];
let comuniSenzaStrutture = 0;

const daFare = limite ? comuni.slice(0, limite) : comuni;

for (const [indice, comune] of daFare.entries()) {
  const codice = String(comune.cod_comune ?? "").trim();
  if (!codice) continue;

  const esito = await chiedi(`Lista.json?CodiceComune=${encodeURIComponent(codice)}`);
  if (esito.errore) {
    falliti.push({ codice, comune: comune.comune, motivo: esito.errore });
  } else {
    const lista = esito.dati?.Lista ?? {};
    // `comune` sono le strutture del comune chiesto, `limitrofi` quelle dei
    // comuni vicini: si prendono entrambe e si deduplica per id, cosi un
    // comune che non compare mai come chiave non resta scoperto.
    const trovate = [...(lista.comune ?? []), ...(lista.limitrofi ?? []), ...(lista.zona ?? [])];
    if ((lista.comune ?? []).length === 0) comuniSenzaStrutture += 1;

    for (const struttura of trovate) {
      const id = String(struttura.id ?? "").trim();
      if (!id || perId.has(id)) continue;
      perId.set(id, { ...struttura, dettaglio: decodifica(struttura) });
    }
  }

  if ((indice + 1) % 25 === 0 || indice + 1 === daFare.length) {
    console.log(`  ${indice + 1}/${daFare.length} comuni — ${perId.size} strutture distinte`);
  }
  await attendi(PAUSA_MS);
}

// --- Snapshot ---------------------------------------------------------------

const strutture = [...perId.values()].sort((a, b) => Number(a.id) - Number(b.id));
// Data locale, non UTC: a tarda sera la forma ISO indicherebbe il giorno prima
// e lo snapshot risulterebbe datato male nel registro delle fonti.
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
      fonte: "Portale RSA Regione Toscana",
      endpoint: BASE,
      scaricatoIl: oggi,
      comuniInterrogati: daFare.length,
      strutture,
    },
    null,
    1,
  )}\n`,
  "utf8",
);

// --- Report -----------------------------------------------------------------

const attive = strutture.filter((s) => String(s.rsa_attiva) === "1").length;
const conTariffa = strutture.filter((s) => Number(s.dettaglio?.struttura?.tariffa_privata_ranged?.minima) > 0).length;
const conQuota = strutture.filter((s) => Number(s.rsa_quotasanitaria) > 0).length;
const conTelefono = strutture.filter((s) => s.telefono_sede || s.dettaglio?.struttura?.telefono_rsa).length;
const conEmail = strutture.filter((s) => s.email_sede || s.dettaglio?.struttura?.email).length;
const conCoordinate = strutture.filter((s) => Number(s.lat) && Number(s.lon)).length;
const conModuloCognitivo = strutture.filter((s) =>
  (s.dettaglio?.struttura?.modulo ?? []).some((m) => /cognitiv/i.test(m)),
).length;
const comuniCoperti = new Set(strutture.map((s) => s.cod_comune)).size;

// La fonte scrive la stringa "NULL" quando la data manca: non e una data.
const aggiornamenti = strutture
  .map((s) => s.rsa_data_aggiornamento)
  .filter((d) => d && d !== "NULL")
  .sort();
const senzaData = strutture.length - aggiornamenti.length;

console.log("\n===== REPORT RACCOLTA =====");
console.log(`Strutture distinte:      ${strutture.length}`);
console.log(`  di cui attive:         ${attive}`);
console.log(`Comuni con almeno una:   ${comuniCoperti}`);
console.log(`Comuni interrogati a vuoto: ${comuniSenzaStrutture}`);
console.log(`Con telefono:            ${conTelefono}`);
console.log(`Con email:               ${conEmail}`);
console.log(`Con coordinate:          ${conCoordinate}`);
console.log(`Con quota sanitaria:     ${conQuota}`);
console.log(`Con tariffa privata:     ${conTariffa}`);
console.log(`Con modulo cognitivo:    ${conModuloCognitivo}`);
console.log(`Aggiornamento piu vecchio: ${aggiornamenti[0] ?? "—"}`);
console.log(`Aggiornamento piu recente: ${aggiornamenti[aggiornamenti.length - 1] ?? "—"}`);
console.log(`Senza data di aggiornamento: ${senzaData}`);

if (falliti.length > 0) {
  console.log(`\nComuni non interrogati: ${falliti.length}`);
  for (const f of falliti.slice(0, 20)) console.log(`  ${f.codice} ${f.comune}: ${f.motivo}`);
}

console.log(`\nSnapshot: ${DESTINAZIONE} (scaricato il ${oggi})`);
