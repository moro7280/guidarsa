// Import di un elenco regionale di strutture verso Supabase.
//   npm run import:regione -- friuli
//   npm run import:lombardia
//
// Quello che cambia da una regione all'altra sta nel file di mapping
// (scripts/mapping/<regione>.mjs): qui resta solo la meccanica.
// Le chiavi non vengono mai stampate, nemmeno nei messaggi di errore.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const regione = process.argv[2] ?? "lombardia";
const { fonte, normalizzaRiga } = await import(`./mapping/${regione}.mjs`);

const BLOCCO = 500;

// --- Variabili d'ambiente ---------------------------------------------------

function caricaEnv(percorso = ".env.local") {
  const env = {};
  let contenuto;
  try {
    contenuto = readFileSync(percorso, "utf8");
  } catch {
    throw new Error(`File ${percorso} non trovato: copia .env.example e valorizzalo.`);
  }
  for (const riga of contenuto.split(/\r?\n/)) {
    const match = riga.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

// --- Parser CSV (RFC 4180: virgolette, virgole nei campi, CRLF) -------------

function parseCsv(testo, DELIMITATORE = ",") {
  const righe = [];
  let riga = [];
  let campo = "";
  let inQuote = false;

  for (let i = 0; i < testo.length; i++) {
    const carattere = testo[i];
    if (inQuote) {
      if (carattere === '"') {
        if (testo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        campo += carattere;
      }
    } else if (carattere === '"') {
      inQuote = true;
    } else if (carattere === DELIMITATORE) {
      riga.push(campo);
      campo = "";
    } else if (carattere === "\n") {
      riga.push(campo);
      righe.push(riga);
      riga = [];
      campo = "";
    } else if (carattere !== "\r") {
      campo += carattere;
    }
  }
  if (campo.length > 0 || riga.length > 0) {
    riga.push(campo);
    righe.push(riga);
  }
  return righe;
}

function leggiCsv(percorso) {
  let testo = readFileSync(percorso, "utf8");
  if (testo.charCodeAt(0) === 0xfeff) testo = testo.slice(1); // BOM
  const righe = parseCsv(testo, fonte.delimitatore ?? ",").filter((r) => r.some((c) => c.trim() !== ""));
  const intestazione = righe[0].map((c) => c.trim());
  return righe.slice(1).map((valori) =>
    Object.fromEntries(intestazione.map((nome, i) => [nome, valori[i] ?? ""])),
  );
}

// --- Slug -------------------------------------------------------------------

function slugify(valore) {
  return valore
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- Import -----------------------------------------------------------------

const env = caricaEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const chiave = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chiave) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti in .env.local.",
  );
}

console.log(`Fonte: ${fonte.nome}`);
console.log(`File:  ${fonte.file} (scaricato il ${fonte.scaricatoIl})`);

const righe = leggiCsv(fonte.file);
console.log(`Righe lette: ${righe.length}\n`);

const scartate = [];
const perSlug = new Map();
let slugConSuffisso = 0;

for (const [indice, riga] of righe.entries()) {
  const esito = normalizzaRiga(riga);
  if (!esito.ok) {
    scartate.push({ riga: indice + 2, codice: riga.COD_STRUTTURA ?? "", motivo: esito.motivo });
    continue;
  }

  const { struttura, codiceFonte } = esito;
  const base = `${slugify(struttura.nome)}-${slugify(struttura.comune)}`;
  let slug = base;

  if (perSlug.has(slug)) {
    // Collisione: il codice struttura della fonte è unico e stabile.
    slug = codiceFonte ? `${base}-${slugify(codiceFonte)}` : "";
    if (!slug || perSlug.has(slug)) {
      scartate.push({
        riga: indice + 2,
        codice: codiceFonte,
        motivo: `slug duplicato non risolvibile: "${base}"`,
      });
      continue;
    }
    slugConSuffisso++;
  }

  perSlug.set(slug, { ...struttura, slug });
}

const daImportare = [...perSlug.values()];
console.log(`Righe normalizzate: ${daImportare.length}`);
console.log(`Slug resi unici con suffisso: ${slugConSuffisso}`);
console.log(`Righe scartate: ${scartate.length}\n`);

const supabase = createClient(url, chiave, { auth: { persistSession: false } });

const { count: primaDi } = await supabase
  .from("strutture")
  .select("*", { count: "exact", head: true })
  .eq("fonte_dati", fonte.fonteDati);

let inviate = 0;
for (let i = 0; i < daImportare.length; i += BLOCCO) {
  const blocco = daImportare.slice(i, i + BLOCCO);
  const { error } = await supabase
    .from("strutture")
    .upsert(blocco, { onConflict: "slug" });

  if (error) {
    // Nessun dettaglio della connessione nel messaggio: solo l'errore del DB.
    throw new Error(`Upsert fallito (${error.code ?? "?"}): ${error.message}`);
  }
  inviate += blocco.length;
  console.log(`Upsert: ${inviate}/${daImportare.length}`);
}

const { count: dopoDi } = await supabase
  .from("strutture")
  .select("*", { count: "exact", head: true })
  .eq("fonte_dati", fonte.fonteDati);

// --- Report -----------------------------------------------------------------

console.log("\n===== REPORT IMPORT =====");
console.log(`Righe nel CSV:        ${righe.length}`);
console.log(`Inviate a Supabase:   ${inviate}`);
console.log(`Nuove righe inserite: ${(dopoDi ?? 0) - (primaDi ?? 0)}`);
console.log(`Righe aggiornate:     ${inviate - ((dopoDi ?? 0) - (primaDi ?? 0))}`);
console.log(`Totale in tabella con fonte_dati="${fonte.fonteDati}": ${dopoDi ?? 0}`);

const perProvincia = {};
for (const s of daImportare) {
  perProvincia[s.provincia_sigla] = (perProvincia[s.provincia_sigla] ?? 0) + 1;
}
console.log("\nPer provincia:");
for (const [sigla, quante] of Object.entries(perProvincia).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${sigla}: ${quante}`);
}

if (scartate.length === 0) {
  console.log("\nScartate: nessuna.");
} else {
  const perMotivo = {};
  for (const s of scartate) perMotivo[s.motivo] = (perMotivo[s.motivo] ?? 0) + 1;
  console.log(`\nScartate: ${scartate.length}`);
  for (const [motivo, quante] of Object.entries(perMotivo).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${quante}x  ${motivo}`);
  }
  console.log("\nDettaglio (prime 20):");
  for (const s of scartate.slice(0, 20)) {
    console.log(`  riga ${s.riga} (cod. ${s.codice}): ${s.motivo}`);
  }
}
