// Controllo di qualità sui contatti salvati.
//   npm run pulisci:contatti -- [--applica]
//
// Senza --applica elenca soltanto cosa toglierebbe.
//
// Tre regole, tutte nate da errori veri trovati in produzione:
//   1. numeri non plausibili (partite IVA, concatenazioni, lunghezze assurde)
//   2. contatti presi da aggregatori: non sono fonti ufficiali
//   3. recapiti condivisi da strutture di comuni diversi: sono centralini di
//      gruppo, non della singola struttura — e attribuirli e` peggio che
//      lasciare il campo vuoto

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLICA = process.argv.includes("--applica");

const AGGREGATORI =
  /(oraridiapertura|orari-apertura|paginegialle|paginebianche|virgilio|tuttocitta|cylex|misterimprese|aziendeitalia|trovaimprese|infoimprese|ufficiocamerale|reportaziende|opencorporates|atoka|cribis|guidasanitaria|portalesanitario|annuario)/i;

const env = {};
for (const riga of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = riga.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Un numero italiano plausibile: 6-12 cifre dopo il prefisso internazionale. */
function telefonoPlausibile(valore) {
  if (!valore) return true;
  const cifre = valore.replace(/\D/g, "").replace(/^(0039|39)(?=[03])/, "");
  if (cifre.length < 6 || cifre.length > 12) return false;
  // 11 cifre attaccate senza separatori: quasi sempre una partita IVA.
  if (!/[\s./-]/.test(valore) && cifre.length >= 11) return false;
  return true;
}

const { data: strutture, error } = await supabase
  .from("strutture")
  .select("slug,nome,comune,telefono,email,sito_web,fonte_contatti");
if (error) throw new Error(`Lettura fallita: ${error.message}`);

const daPulire = new Map(); // slug -> Set(campi)
const motivi = [];

const segna = (struttura, campo, motivo, valore) => {
  if (!daPulire.has(struttura.slug)) daPulire.set(struttura.slug, new Set());
  daPulire.get(struttura.slug).add(campo);
  motivi.push({ slug: struttura.slug, comune: struttura.comune, campo, valore, motivo });
};

// 1 e 2: plausibilità e provenienza.
for (const struttura of strutture) {
  const fonti = struttura.fonte_contatti ?? {};

  if (!telefonoPlausibile(struttura.telefono)) {
    segna(struttura, "telefono", "numero non plausibile", struttura.telefono);
  }

  for (const campo of ["telefono", "email", "sito_web"]) {
    const url = fonti[campo]?.url;
    if (url && AGGREGATORI.test(url)) {
      segna(struttura, campo, "fonte aggregatore, non sito ufficiale", struttura[campo]);
    }
  }
}

// 3: recapiti condivisi fra comuni diversi.
for (const campo of ["telefono", "email"]) {
  const comuniPerValore = new Map();
  for (const struttura of strutture) {
    const valore = struttura[campo];
    if (!valore) continue;
    const chiave = campo === "telefono" ? valore.replace(/\D/g, "").slice(-9) : valore.toLowerCase();
    if (!comuniPerValore.has(chiave)) comuniPerValore.set(chiave, new Set());
    comuniPerValore.get(chiave).add(struttura.comune);
  }

  for (const struttura of strutture) {
    const valore = struttura[campo];
    if (!valore) continue;
    const chiave = campo === "telefono" ? valore.replace(/\D/g, "").slice(-9) : valore.toLowerCase();
    if ((comuniPerValore.get(chiave)?.size ?? 0) > 1) {
      segna(struttura, campo, "stesso recapito su comuni diversi: e` un centralino di gruppo", valore);
    }
  }
}

// --- Report e applicazione --------------------------------------------------

const perMotivo = {};
for (const m of motivi) perMotivo[`${m.campo}: ${m.motivo}`] = (perMotivo[`${m.campo}: ${m.motivo}`] ?? 0) + 1;

console.log(APPLICA ? "=== PULIZIA CONTATTI (applico) ===" : "=== PULIZIA CONTATTI (simulazione) ===");
console.log(`Strutture esaminate: ${strutture.length}`);
console.log(`Campi da rimuovere:  ${motivi.length} su ${daPulire.size} strutture`);
for (const [motivo, quanti] of Object.entries(perMotivo).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${quanti}x  ${motivo}`);
}
console.log("\nEsempi:");
for (const m of motivi.slice(0, 10)) {
  console.log(`  ${m.comune} — ${m.campo} "${m.valore}" (${m.motivo})`);
}

if (!APPLICA) {
  console.log("\nNessuna modifica: rilancia con --applica per rimuoverli.");
  process.exit(0);
}

let aggiornate = 0;
for (const [slug, campi] of daPulire) {
  const struttura = strutture.find((s) => s.slug === slug);
  const fonti = { ...(struttura.fonte_contatti ?? {}) };
  const patch = {};
  for (const campo of campi) {
    patch[campo] = null;
    delete fonti[campo];
  }
  patch.fonte_contatti = fonti;
  const { error: erroreUpdate } = await supabase.from("strutture").update(patch).eq("slug", slug);
  if (erroreUpdate) console.log(`   errore su ${slug}: ${erroreUpdate.message}`);
  else aggiornate++;
}
console.log(`\nStrutture aggiornate: ${aggiornate}`);
