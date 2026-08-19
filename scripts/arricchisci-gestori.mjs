// Arricchimento a costo zero: quello che sappiamo gia di un gestore vale per
// tutte le sue strutture.
//
// Nessuna chiamata esterna, nessuna API a pagamento: si legge la tabella e si
// completano le righe nuove con i dati dell'ente che le gestisce, quando quello
// stesso ente compare gia altrove con il dato valorizzato.
//
// Si propagano SOLO campi dell'ente, non della struttura:
//
//   pec_gestore, denominazione_gestore, codice_fiscale_gestore, partita_iva_gestore
//
// Il telefono no, mai. Il numero della RSA non e il numero del centro diurno
// dello stesso ente, e il centralino di un gruppo non e il recapito di una
// singola casa: e l'errore che avevamo gia fatto e corretto in una sessione
// precedente. Lo stesso vale per il sito, che spesso e la pagina della singola
// struttura, non quella dell'ente.
//
//   node scripts/arricchisci-gestori.mjs [--prova]

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const prova = process.argv.includes("--prova");

function caricaEnv(percorso = ".env.local") {
  const env = {};
  for (const riga of readFileSync(percorso, "utf8").split(/\r?\n/)) {
    const match = riga.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

const env = caricaEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti in .env.local.");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CAMPI_ENTE = [
  "pec_gestore",
  "denominazione_gestore",
  "codice_fiscale_gestore",
  "partita_iva_gestore",
];

// --- Lettura ----------------------------------------------------------------

const strutture = [];
for (let da = 0; ; da += 1000) {
  const { data, error } = await supabase
    .from("strutture")
    .select(`id,slug,nome,comune,fonte_dati,${CAMPI_ENTE.join(",")}`)
    .order("id")
    .range(da, da + 999);
  if (error) throw new Error(`Lettura fallita: ${error.message}`);
  strutture.push(...data);
  if (data.length < 1000) break;
}
console.log(`Strutture lette: ${strutture.length}`);

/**
 * Chiave dell'ente: la partita IVA se c'e, altrimenti il codice fiscale. Sono
 * identificatori, non nomi: due enti con denominazione simile restano distinti,
 * e lo stesso ente scritto in due modi resta uno solo.
 */
function chiaveEnte(riga) {
  const piva = (riga.partita_iva_gestore ?? "").replace(/\D/g, "");
  if (piva.length === 11) return `piva:${piva}`;
  const cf = (riga.codice_fiscale_gestore ?? "").trim().toUpperCase();
  return cf.length >= 11 ? `cf:${cf}` : null;
}

// --- Cosa sappiamo di ogni ente ---------------------------------------------

const conoscenza = new Map();
for (const riga of strutture) {
  const chiave = chiaveEnte(riga);
  if (!chiave) continue;
  const noto = conoscenza.get(chiave) ?? {};
  for (const campo of CAMPI_ENTE) {
    const valore = (riga[campo] ?? "").toString().trim();
    if (!valore) continue;
    // Il primo valore visto vince: i dati arrivano ordinati per id, quindi la
    // riga piu vecchia — quella gia verificata — fa da riferimento.
    if (!noto[campo]) noto[campo] = valore;
  }
  conoscenza.set(chiave, noto);
}

const entiConPec = [...conoscenza.values()].filter((e) => e.pec_gestore).length;
console.log(`Enti gestori distinti: ${conoscenza.size} (con PEC nota: ${entiConPec})`);

// --- Proposte ---------------------------------------------------------------

const proposte = [];
for (const riga of strutture) {
  const chiave = chiaveEnte(riga);
  if (!chiave) continue;
  const noto = conoscenza.get(chiave);
  const campi = {};
  for (const campo of CAMPI_ENTE) {
    const attuale = (riga[campo] ?? "").toString().trim();
    if (!attuale && noto[campo]) campi[campo] = noto[campo];
  }
  if (Object.keys(campi).length > 0) proposte.push({ riga, campi });
}

console.log(`\nRighe da completare: ${proposte.length}`);
const perCampo = {};
for (const p of proposte) {
  for (const campo of Object.keys(p.campi)) perCampo[campo] = (perCampo[campo] ?? 0) + 1;
}
for (const [campo, quante] of Object.entries(perCampo).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${campo}: ${quante}`);
}
const perFonte = {};
for (const p of proposte) perFonte[p.riga.fonte_dati] = (perFonte[p.riga.fonte_dati] ?? 0) + 1;
console.log(`Per fonte: ${JSON.stringify(perFonte)}`);

console.log("\nEsempi:");
for (const p of proposte.slice(0, 8)) {
  console.log(`  ${p.riga.nome} (${p.riga.comune}) → ${JSON.stringify(p.campi)}`);
}

if (prova) {
  console.log("\nModalita PROVA: nessuna scrittura.");
  process.exit(0);
}

// --- Scrittura --------------------------------------------------------------

let scritte = 0;
for (const p of proposte) {
  const { error } = await supabase.from("strutture").update(p.campi).eq("id", p.riga.id);
  if (error) {
    console.log(`  errore su ${p.riga.slug}: ${error.message}`);
    continue;
  }
  scritte += 1;
  if (scritte % 50 === 0) console.log(`  aggiornate ${scritte}/${proposte.length}`);
}

console.log(`\n===== REPORT =====`);
console.log(`Righe aggiornate: ${scritte}/${proposte.length}`);
