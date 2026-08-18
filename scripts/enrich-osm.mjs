// Arricchimento dei contatti da OpenStreetMap (ODbL).
//   npm run enrich:osm
//
// Perche` OSM e non Google Places: i termini di Google Maps Platform vietano di
// memorizzare i contenuti Places e di usarli in un "listings or directory
// service" (vedi CLAUDE.md). OSM e` ODbL: si puo` salvare e ripubblicare con
// attribuzione, che e` quello che facciamo — vedi src/components/AttribuzioneOsm.tsx.
//
// Strategia: una query Overpass per provincia (12, non 740), matching in locale.
// Non sovrascrive mai un campo gia` valorizzato.

import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "DirectoryRSAItalia/0.1 (arricchimento contatti; contatto: pascucci.moreno3@gmail.com)";
const PAUSA_FRA_QUERY_MS = 3000;
const RAGGIO_MAX_METRI = 400;
const PERCORSO_REPORT = "data/osm-match-da-rivedere.json";
const SOGLIA_ALTA = { distanza: 150, somiglianza: 0.72 };
const SOGLIA_MEDIA = { distanza: 400, somiglianza: 0.6 };

// --- Ambiente ---------------------------------------------------------------

const env = {};
for (const riga of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = riga.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti in .env.local.");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --- Utilita` ---------------------------------------------------------------

const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizzaNome(valore) {
  return (valore ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    // Parole che non distinguono una struttura dall'altra.
    .replace(/\b(rsa|residenza|sanitaria|assistenziale|casa|di|riposo|fondazione|onlus|ets|srl|spa|istituto|centro|il|la|lo|i|gli|le|dei|delle|della|del|per|anziani)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Somiglianza 0-1 fra due nomi: token in comune (Jaccard). */
function somiglianza(a, b) {
  const ta = new Set(normalizzaNome(a).split(" ").filter(Boolean));
  const tb = new Set(normalizzaNome(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let comuni = 0;
  for (const t of ta) if (tb.has(t)) comuni++;
  return comuni / new Set([...ta, ...tb]).size;
}

/** Distanza in metri fra due coordinate (formula dell'emisenoverso). */
function distanzaMetri(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function normalizzaTelefono(valore) {
  if (!valore) return null;
  const pulito = valore.split(";")[0].trim().replace(/\s+/g, " ");
  return /\d{6,}/.test(pulito.replace(/\D/g, "")) ? pulito : null;
}

function normalizzaSito(valore) {
  if (!valore) return null;
  const url = valore.split(";")[0].trim();
  if (!/^https?:\/\//i.test(url)) return /^[\w.-]+\.\w{2,}/.test(url) ? `https://${url}` : null;
  return url;
}

function normalizzaEmail(valore) {
  if (!valore) return null;
  const email = valore.split(";")[0].trim();
  return /^[^@\s]+@[^@\s]+\.\w{2,}$/.test(email) ? email : null;
}

// --- Overpass ---------------------------------------------------------------

function riquadro(strutture) {
  const lat = strutture.map((s) => s.lat);
  const lng = strutture.map((s) => s.lng);
  const margine = 0.05; // ~5 km di contorno
  return [
    Math.min(...lat) - margine,
    Math.min(...lng) - margine,
    Math.max(...lat) + margine,
    Math.max(...lng) + margine,
  ];
}

async function interrogaOverpass(bbox, etichetta) {
  const [s, w, n, e] = bbox.map((v) => v.toFixed(4));
  const query = `
[out:json][timeout:120];
(
  nwr["amenity"="social_facility"]["social_facility"~"nursing_home|assisted_living|group_home"](${s},${w},${n},${e});
  nwr["amenity"="nursing_home"](${s},${w},${n},${e});
  nwr["healthcare"="nursing_home"](${s},${w},${n},${e});
  nwr["social_facility:for"="senior"](${s},${w},${n},${e});
);
out center tags;`;

  for (let tentativo = 1; tentativo <= 4; tentativo++) {
    const risposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (risposta.ok) return (await risposta.json()).elements ?? [];

    // 429 e 504 sono il modo di Overpass di dire "rallenta".
    const attesaMs = tentativo * 15000;
    console.log(`   ${etichetta}: HTTP ${risposta.status}, riprovo fra ${attesaMs / 1000}s (${tentativo}/4)`);
    await attesa(attesaMs);
  }
  return null;
}

// --- Lettura strutture ------------------------------------------------------

const { data: strutture, error } = await supabase
  .from("strutture")
  .select("slug,nome,comune,provincia,provincia_sigla,lat,lng,telefono,email,sito_web,osm_id,fonte_contatti")
  .not("lat", "is", null);

if (error) throw new Error(`Lettura strutture fallita (${error.code ?? "?"}): ${error.message}`);

const perProvincia = new Map();
for (const s of strutture) {
  if (!perProvincia.has(s.provincia_sigla)) perProvincia.set(s.provincia_sigla, []);
  perProvincia.get(s.provincia_sigla).push(s);
}

const daRiempire = strutture.filter((s) => !s.telefono || !s.sito_web || !s.email);

console.log("=== ARRICCHIMENTO CONTATTI DA OPENSTREETMAP ===");
console.log(`Strutture con coordinate: ${strutture.length}`);
console.log(`Con almeno un contatto mancante: ${daRiempire.length}`);
console.log(`Province da interrogare: ${perProvincia.size}`);
console.log("");
console.log(`STIMA CHIAMATE: ${perProvincia.size} query all'API pubblica Overpass`);
console.log(`(una per provincia, con pausa di ${PAUSA_FRA_QUERY_MS / 1000}s fra l'una e l'altra;`);
console.log(" nessun costo, nessuna chiave: l'unico limite e` la cortesia verso un servizio pubblico)");
console.log("");

// La conferma e` obbligatoria: o interattiva, o esplicita con --conferma
// (serve quando lo script gira in un contesto senza terminale).
let risposta = process.argv.includes("--conferma") ? "s" : null;

if (risposta === null) {
  risposta = await new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Procedo? [s/N] ", (r) => {
      rl.close();
      resolve(r.trim().toLowerCase());
    });
  });
} else {
  console.log("Conferma ricevuta da --conferma.");
}

if (risposta !== "s" && risposta !== "si") {
  console.log("Annullato: nessuna chiamata effettuata.");
  process.exit(0);
}

// --- Match ------------------------------------------------------------------

const aggiornamenti = [];
const dubbi = [];
let senzaCandidati = 0;
let provinceFallite = 0;

for (const [sigla, gruppo] of perProvincia) {
  const elementi = await interrogaOverpass(riquadro(gruppo), sigla);
  if (elementi === null) {
    console.log(`${sigla}: query fallita dopo 4 tentativi, provincia saltata`);
    provinceFallite++;
    continue;
  }

  const candidati = elementi
    .map((el) => ({
      id: `${el.type}/${el.id}`,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      nome: el.tags?.name ?? "",
      telefono: normalizzaTelefono(el.tags?.phone ?? el.tags?.["contact:phone"]),
      sito: normalizzaSito(el.tags?.website ?? el.tags?.["contact:website"]),
      email: normalizzaEmail(el.tags?.email ?? el.tags?.["contact:email"]),
    }))
    .filter((c) => c.lat && c.lng);

  console.log(`${sigla}: ${gruppo.length} strutture, ${candidati.length} POI OSM`);

  for (const struttura of gruppo) {
    let migliore = null;
    for (const candidato of candidati) {
      const distanza = distanzaMetri(struttura.lat, struttura.lng, candidato.lat, candidato.lng);
      if (distanza > RAGGIO_MAX_METRI) continue;
      const punteggio = somiglianza(struttura.nome, candidato.nome);
      if (!migliore || punteggio > migliore.punteggio) {
        migliore = { candidato, distanza, punteggio };
      }
    }
    if (!migliore) {
      senzaCandidati++;
      continue;
    }

    const { candidato, distanza, punteggio } = migliore;
    let confidenza = null;
    if (distanza <= SOGLIA_ALTA.distanza && punteggio >= SOGLIA_ALTA.somiglianza) confidenza = "alta";
    else if (distanza <= SOGLIA_MEDIA.distanza && punteggio >= SOGLIA_MEDIA.somiglianza) confidenza = "media";

    if (!confidenza) {
      dubbi.push({
        slug: struttura.slug,
        nostro: struttura.nome,
        osm: candidato.nome || "(senza nome)",
        distanza: Math.round(distanza),
        somiglianza: punteggio.toFixed(2),
        avrebbeScritto: [
          candidato.telefono && "telefono",
          candidato.sito && "sito",
          candidato.email && "email",
        ].filter(Boolean).join(", ") || "niente",
      });
      continue;
    }

    // Mai sovrascrivere: si scrive solo dove il campo e` vuoto.
    const campi = {};
    const fonti = { ...(struttura.fonte_contatti ?? {}) };
    if (!struttura.telefono && candidato.telefono) { campi.telefono = candidato.telefono; fonti.telefono = "osm"; }
    if (!struttura.sito_web && candidato.sito) { campi.sito_web = candidato.sito; fonti.sito_web = "osm"; }
    if (!struttura.email && candidato.email) { campi.email = candidato.email; fonti.email = "osm"; }

    if (Object.keys(campi).length === 0) continue;

    aggiornamenti.push({
      slug: struttura.slug,
      confidenza,
      campi: {
        ...campi,
        osm_id: candidato.id,
        osm_confidenza: confidenza,
        fonte_contatti: fonti,
        contatti_aggiornati_il: new Date().toISOString(),
      },
    });
  }

  await attesa(PAUSA_FRA_QUERY_MS);
}

// --- Scrittura --------------------------------------------------------------

let scritte = 0;
for (const aggiornamento of aggiornamenti) {
  const { error: erroreUpdate } = await supabase
    .from("strutture")
    .update(aggiornamento.campi)
    .eq("slug", aggiornamento.slug);
  if (erroreUpdate) {
    console.log(`   errore su ${aggiornamento.slug}: ${erroreUpdate.message}`);
    continue;
  }
  scritte++;
}

// --- Report -----------------------------------------------------------------

const conta = (campo) => aggiornamenti.filter((a) => a.campi[campo]).length;

console.log("\n===== REPORT ARRICCHIMENTO OSM =====");
console.log(`Strutture esaminate:        ${strutture.length}`);
console.log(`Province interrogate:       ${perProvincia.size - provinceFallite}/${perProvincia.size}`);
console.log(`Strutture aggiornate:       ${scritte}`);
console.log(`  match confidenza alta:    ${aggiornamenti.filter((a) => a.confidenza === "alta").length}`);
console.log(`  match confidenza media:   ${aggiornamenti.filter((a) => a.confidenza === "media").length}`);
console.log(`Campi riempiti — telefono: ${conta("telefono")} | sito: ${conta("sito_web")} | email: ${conta("email")}`);
console.log(`Nessun POI OSM entro ${RAGGIO_MAX_METRI} m: ${senzaCandidati}`);
console.log(`Match dubbi (scartati, da rivedere a mano): ${dubbi.length}`);

// Il report va anche su file: l'elenco dei dubbi è materiale di revisione
// manuale e nel terminale scorre via.
writeFileSync(
  PERCORSO_REPORT,
  JSON.stringify(
    {
      eseguito_il: new Date().toISOString(),
      esaminate: strutture.length,
      province_interrogate: perProvincia.size - provinceFallite,
      aggiornate: scritte,
      per_confidenza: {
        alta: aggiornamenti.filter((a) => a.confidenza === "alta").length,
        media: aggiornamenti.filter((a) => a.confidenza === "media").length,
      },
      campi_riempiti: {
        telefono: conta("telefono"),
        sito_web: conta("sito_web"),
        email: conta("email"),
      },
      senza_candidati_osm: senzaCandidati,
      da_rivedere_a_mano: dubbi,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log(`\nReport completo salvato in ${PERCORSO_REPORT}`);

if (dubbi.length > 0) {
  console.log("\nDA RIVEDERE A MANO (primi 25):");
  for (const d of dubbi.slice(0, 25)) {
    console.log(`  ${d.slug}`);
    console.log(`     nostro: ${d.nostro}`);
    console.log(`     OSM:    ${d.osm}  (${d.distanza} m, somiglianza ${d.somiglianza}, avrebbe scritto: ${d.avrebbeScritto})`);
  }
}

console.log("\nDati OSM salvati: © OpenStreetMap contributors, ODbL.");
console.log("L'attribuzione compare sulle pagine che li mostrano; l'estratto ODbL e` su /dati/osm.json.");
