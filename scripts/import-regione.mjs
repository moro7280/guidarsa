// Import di un elenco regionale di strutture verso Supabase.
//   npm run import:regione -- friuli
//   npm run import:lombardia
//
// Quello che cambia da una regione all'altra sta nel file di mapping
// (scripts/mapping/<regione>.mjs): qui resta solo la meccanica.
// Le chiavi non vengono mai stampate, nemmeno nei messaggi di errore.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const argomenti = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opzioni = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const regione = argomenti[0] ?? "lombardia";
// --prova normalizza e stampa il report senza scrivere niente su Supabase.
const prova = opzioni.has("--prova");
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
  // Non tutti i portali pubblicano in UTF-8: l'Umbria esporta in windows-1252.
  let testo = readFileSync(percorso).toString(fonte.codifica ?? "utf8");
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
if (prova) console.log("Modalita PROVA: nessuna scrittura su Supabase.");

const righe = leggiCsv(fonte.file);
console.log(`Righe lette: ${righe.length}\n`);

const scartate = [];
const perSlug = new Map();
// Codice della fonte per ogni slug: serve a disambiguare le collisioni.
const codicePerSlug = new Map();
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
  codicePerSlug.set(slug, codiceFonte);
}

const daImportare = [...perSlug.values()];
console.log(`Righe normalizzate: ${daImportare.length}`);
console.log(`Slug resi unici con suffisso: ${slugConSuffisso}`);
console.log(`Righe scartate: ${scartate.length}\n`);

const supabase = createClient(url, chiave, { auth: { persistSession: false } });

/**
 * Due fonti diverse possono produrre lo stesso slug: stesso nome, stesso
 * comune, registri distinti. L'upsert su slug sovrascriverebbe la riga
 * dell'altra fonte in silenzio, fondendo due realta diverse in una. Qui le
 * righe gia presenti con un fonte_dati diverso vengono lasciate stare e
 * finiscono nel report.
 */
async function slugDiAltreFonti(elenco) {
  const trovati = new Map();
  for (let i = 0; i < elenco.length; i += 200) {
    const { data, error } = await supabase
      .from("strutture")
      .select("slug,fonte_dati")
      .in("slug", elenco.slice(i, i + 200));
    if (error) throw new Error(`Controllo collisioni fallito: ${error.message}`);
    for (const riga of data ?? []) {
      if (riga.fonte_dati !== fonte.fonteDati) trovati.set(riga.slug, riga.fonte_dati);
    }
  }
  return trovati;
}

/**
 * Quando lo slug e occupato da un'altra fonte la riga non va persa: quasi
 * sempre sono due servizi diversi dello stesso ente nello stesso comune — la
 * RSA e il suo centro diurno — che meritano due schede distinte. Si prova
 * prima con la tipologia in coda, che e leggibile, poi con il codice della
 * fonte. Solo se entrambi sono gia presi la riga viene lasciata fuori.
 */
const collisioni = await slugDiAltreFonti(daImportare.map((s) => s.slug));
const inCollisione = daImportare.filter((s) => collisioni.has(s.slug));

const alternativi = new Map();
for (const s of inCollisione) {
  const base = s.slug;
  alternativi.set(base, [
    `${base}-${s.tipologia}`,
    codicePerSlug.get(base) ? `${base}-${slugify(codicePerSlug.get(base))}` : null,
  ].filter(Boolean));
}

const occupati = await slugDiAltreFonti([...alternativi.values()].flat());
const usati = new Set(daImportare.map((s) => s.slug));
const rinominate = [];
const bloccate = [];

for (const s of inCollisione) {
  const scelto = (alternativi.get(s.slug) ?? []).find(
    (candidato) => !occupati.has(candidato) && !usati.has(candidato),
  );
  if (scelto) {
    rinominate.push({ da: s.slug, a: scelto, occupatoDa: collisioni.get(s.slug) });
    usati.add(scelto);
    s.slug = scelto;
  } else {
    bloccate.push(s);
  }
}

const escluse = new Set(bloccate);
const daScrivere = daImportare.filter((s) => !escluse.has(s));

if (rinominate.length > 0) {
  console.log(`\nSlug rinominati per non sovrascrivere un'altra fonte: ${rinominate.length}`);
  for (const r of rinominate.slice(0, 20)) {
    console.log(`  ${r.da} (occupato da "${r.occupatoDa}") → ${r.a}`);
  }
}

if (bloccate.length > 0) {
  console.log(`\nRighe non scrivibili, slug esaurito: ${bloccate.length}`);
  for (const s of bloccate.slice(0, 20)) console.log(`  ${s.nome} — ${s.comune}`);
}

if (prova) {
  console.log("\n===== REPORT PROVA =====");
  console.log(`Righe nel CSV:           ${righe.length}`);
  console.log(`Normalizzate:            ${daImportare.length}`);
  console.log(`Scriverebbe:             ${daScrivere.length}`);
  console.log(`Bloccate da altra fonte: ${bloccate.length}`);
  const perProv = {};
  for (const s of daScrivere) perProv[s.provincia_sigla] = (perProv[s.provincia_sigla] ?? 0) + 1;
  console.log(`Per provincia: ${JSON.stringify(perProv)}`);
  const perMotivo = {};
  for (const s of scartate) perMotivo[s.motivo] = (perMotivo[s.motivo] ?? 0) + 1;
  console.log(`Scartate: ${scartate.length}`);
  for (const [motivo, quante] of Object.entries(perMotivo).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${quante}x  ${motivo}`);
  }
  console.log("\nPrime 3 righe normalizzate:");
  for (const s of daScrivere.slice(0, 3)) console.log(JSON.stringify(s, null, 2));
  process.exit(0);
}

const { count: primaDi } = await supabase
  .from("strutture")
  .select("*", { count: "exact", head: true })
  .eq("fonte_dati", fonte.fonteDati);

/**
 * Le righe si spediscono raggruppate per insieme di colonne valorizzate.
 *
 * Motivo: in un upsert PostgREST le colonne assenti dal payload non vengono
 * toccate — ed e cosi che i reimport non cancellano l'arricchimento. Ma se in
 * uno stesso blocco una riga ha `telefono` e un'altra no, il client uniforma le
 * chiavi e manda `null` per quella che non ce l'ha: la colonna diventa NOT NULL
 * violata, oppure, peggio, un dato buono viene azzerato in silenzio.
 */
function raggruppaPerColonne(righeDaScrivere) {
  const gruppi = new Map();
  for (const riga of righeDaScrivere) {
    const firma = Object.keys(riga).sort().join(",");
    if (!gruppi.has(firma)) gruppi.set(firma, []);
    gruppi.get(firma).push(riga);
  }
  return [...gruppi.values()];
}

const gruppi = raggruppaPerColonne(daScrivere);
if (gruppi.length > 1) {
  console.log(`\nGruppi di colonne diversi: ${gruppi.length} (${gruppi.map((g) => g.length).join(" + ")})`);
}

let inviate = 0;
for (const gruppo of gruppi) {
  for (let i = 0; i < gruppo.length; i += BLOCCO) {
    const blocco = gruppo.slice(i, i + BLOCCO);
    const { error } = await supabase
      .from("strutture")
      .upsert(blocco, { onConflict: "slug" });

    if (error) {
      // Nessun dettaglio della connessione nel messaggio: solo l'errore del DB.
      throw new Error(`Upsert fallito (${error.code ?? "?"}): ${error.message}`);
    }
    inviate += blocco.length;
    console.log(`Upsert: ${inviate}/${daScrivere.length}`);
  }
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

if (bloccate.length > 0) {
  console.log(`Non scritte (slug di un'altra fonte): ${bloccate.length}`);
}

const perProvincia = {};
for (const s of daScrivere) {
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
