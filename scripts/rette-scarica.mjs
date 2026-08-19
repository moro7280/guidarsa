// Scaricamento delle carte dei servizi.
//   npm run rette:scarica -- --conferma
//
// I PDF restano in locale come pezza d'appoggio della provenienza: sono
// documenti di terzi, non vanno ripubblicati ne` ospitati dal sito, e
// data/carte-servizi/ e` escluso da git. Nel repo va solo il manifest, che
// lega ogni cifra estratta al documento da cui viene (URL, hash, data).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { USER_AGENT, attesa } from "./lib/web.mjs";
import { linkDi } from "./lib/estrazione.mjs";

const CARTELLA = "data/carte-servizi";
const MANIFEST = `${CARTELLA}/manifest.json`;
const PAUSA_MS = 2000;
const TIMEOUT_MS = 45000;
const MAX_BYTE = 40 * 1024 * 1024;

const env = {};
for (const riga of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = riga.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

mkdirSync(CARTELLA, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};

const { data: strutture, error } = await supabase
  .from("strutture")
  .select("slug,nome,comune,url_carta_servizi")
  .not("url_carta_servizi", "is", null)
  .order("slug");
if (error) throw new Error(`Lettura fallita: ${error.message}`);

const daScaricare = strutture.filter((s) => !manifest[s.slug]);

console.log("=== SCARICO CARTE DEI SERVIZI ===");
console.log(`Carte censite: ${strutture.length} | gia in archivio: ${strutture.length - daScaricare.length}`);
console.log(`Da scaricare: ${daScaricare.length}`);
console.log(`Domini distinti: ${new Set(daScaricare.map((s) => new URL(s.url_carta_servizi).hostname)).size}`);
console.log(`STIMA: ${daScaricare.length} richieste, una alla volta con pausa di ${PAUSA_MS / 1000}s;`);
console.log("       le pagine HTML richiedono una richiesta in piu per trovare il PDF.");
console.log("");

if (!process.argv.includes("--conferma")) {
  console.log("Serve --conferma per procedere. Nessuna richiesta effettuata.");
  process.exit(0);
}

const esiti = { pdf: 0, html_seguita: 0, non_pdf: 0, errore: 0, troppo_grande: 0 };
const problemi = [];

/** Cerca nella pagina HTML il link al PDF della carta dei servizi. */
function trovaPdfInPagina(html, urlBase) {
  const candidati = linkDi(html, urlBase).filter(({ href }) => /\.pdf($|\?)/i.test(href));
  const conNome = candidati.find(
    ({ href, testo }) => /carta/i.test(testo) || /carta/i.test(decodeURIComponent(href)),
  );
  return (conNome ?? candidati[0])?.href ?? null;
}

async function richiedi(url) {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/pdf,text/html" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });
}

let contatore = 0;
for (const struttura of daScaricare) {
  contatore++;
  let url = struttura.url_carta_servizi;

  try {
    let risposta = await richiedi(url);
    let tipo = risposta.headers.get("content-type") ?? "";

    // Pagina HTML: un solo passo in piu per raggiungere il PDF.
    if (risposta.ok && tipo.includes("html")) {
      const pdf = trovaPdfInPagina(await risposta.text(), risposta.url);
      if (!pdf) {
        esiti.non_pdf++;
        problemi.push({ slug: struttura.slug, url, motivo: "pagina senza link a PDF" });
        await attesa(PAUSA_MS);
        continue;
      }
      await attesa(PAUSA_MS);
      url = pdf;
      risposta = await richiedi(url);
      tipo = risposta.headers.get("content-type") ?? "";
      esiti.html_seguita++;
    }

    if (!risposta.ok) {
      esiti.errore++;
      problemi.push({ slug: struttura.slug, url, motivo: `HTTP ${risposta.status}` });
      await attesa(PAUSA_MS);
      continue;
    }

    const dati = Buffer.from(await risposta.arrayBuffer());
    if (dati.length > MAX_BYTE) {
      esiti.troppo_grande++;
      problemi.push({ slug: struttura.slug, url, motivo: `${Math.round(dati.length / 1e6)} MB, oltre il limite` });
      await attesa(PAUSA_MS);
      continue;
    }
    if (dati.subarray(0, 5).toString() !== "%PDF-") {
      esiti.non_pdf++;
      problemi.push({ slug: struttura.slug, url, motivo: `non e un PDF (${tipo})` });
      await attesa(PAUSA_MS);
      continue;
    }

    const nomeFile = `${struttura.slug}.pdf`;
    writeFileSync(`${CARTELLA}/${nomeFile}`, dati);
    manifest[struttura.slug] = {
      url,
      url_censito: struttura.url_carta_servizi,
      file: nomeFile,
      byte: dati.length,
      sha256: createHash("sha256").update(dati).digest("hex"),
      scaricato_il: new Date().toISOString(),
    };
    esiti.pdf++;
    if (contatore % 20 === 0) console.log(`   ${contatore}/${daScaricare.length} — ${esiti.pdf} PDF in archivio`);
  } catch (errore) {
    esiti.errore++;
    problemi.push({ slug: struttura.slug, url, motivo: `richiesta fallita: ${errore.name}` });
  }

  await attesa(PAUSA_MS);
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(
  "data/carte-servizi-problemi.json",
  `${JSON.stringify({ eseguito_il: new Date().toISOString(), esiti, problemi }, null, 2)}\n`,
  "utf8",
);

console.log("\n===== REPORT SCARICO =====");
console.log(`PDF archiviati:        ${esiti.pdf}`);
console.log(`Pagine HTML seguite:   ${esiti.html_seguita}`);
console.log(`Non erano PDF:         ${esiti.non_pdf}`);
console.log(`Errori di rete/HTTP:   ${esiti.errore}`);
console.log(`Oltre il limite di peso: ${esiti.troppo_grande}`);
console.log(`Totale in archivio:    ${Object.keys(manifest).length}`);
console.log("Manifest:", MANIFEST);
