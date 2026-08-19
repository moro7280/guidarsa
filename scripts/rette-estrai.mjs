// Estrazione delle rette dalle carte dei servizi archiviate.
//   npm run rette:estrai -- [--applica]
//
// Senza --applica non scrive niente: stampa solo cosa scriverebbe.
//
// Regole (CLAUDE.md, sessione approvata):
// - solo dati fattuali: importi, unita`, etichette. Mai testo descrittivo.
// - retta privata e quota convenzionata restano separate, sempre.
// - nucleo_alzheimer diventa true solo se il documento lo dice; mai false.
// - i casi ambigui non entrano in database: vanno nel file di revisione.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CARTELLA = "data/carte-servizi";
const MANIFEST = `${CARTELLA}/manifest.json`;
const REVISIONE = "data/rette-da-rivedere.json";
const APPLICA = process.argv.includes("--applica");

// Giorni medi al mese: 365/12. Un mese "da 30" sottostimerebbe del 1,5%.
const GIORNI_AL_MESE = 30.44;
const GIORNALIERA = { min: 40, max: 250 };
const MENSILE = { min: 800, max: 7000 };

const env = {};
for (const riga of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = riga.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --- Lettura del PDF --------------------------------------------------------

function testoDelPdf(percorso) {
  try {
    return execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", percorso, "-"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

/** Un PDF scansionato ha pochissimo testo estraibile rispetto al peso. */
function sembraScansione(testo, byte) {
  if (!testo) return true;
  const utile = testo.replace(/\s/g, "").length;
  return utile < 500 || utile / byte < 0.0008;
}

// --- Importi ----------------------------------------------------------------

const IMPORTO = /(?:€|euro)\s*([0-9]{1,3}(?:[.\s][0-9]{3})*(?:[.,][0-9]{2})?)|([0-9]{1,3}(?:[.\s][0-9]{3})*(?:[.,][0-9]{2})?)\s*(?:€|euro)/gi;

function numeroItaliano(grezzo) {
  const pulito = grezzo.replace(/\s/g, "");
  // "1.234,56" -> 1234.56 ; "104,90" -> 104.90 ; "1.234" -> 1234
  const normalizzato = pulito.includes(",")
    ? pulito.replace(/\./g, "").replace(",", ".")
    : pulito.replace(/\.(?=\d{3}\b)/g, "");
  const numero = Number.parseFloat(normalizzato);
  return Number.isFinite(numero) ? numero : null;
}

const PAROLE_RETTA = /(rett|tariff|quota|costo|prezzo|corrispettiv)/i;
const PAROLE_CONVENZIONE = /(convenzionat|accreditat|contratt|solvenza sanitaria|quota sanitaria)/i;
const PAROLE_PRIVATO = /(privat|solvent|intera|libero mercato|non convenzionat)/i;
const PAROLE_GIORNO = /(giornalier|al giorno|die\b|\/gg|\/giorno|pro die)/i;
const PAROLE_MESE = /(mensil|al mese|\/mese)/i;
const PAROLE_EXTRA = /(supplement|maggiorazion|camera singola|aggiuntiv|extra)/i;
const PAROLE_ALZHEIMER = /(alzheimer|demenz|nucleo protetto|nucleo alzheimer)/i;

/**
 * Ogni importo con il suo contesto: la riga in cui compare piu` le due righe
 * precedenti, che nelle tabelle contengono le intestazioni di colonna.
 */
function importiConContesto(testo) {
  const righe = testo.split(/\r?\n/);
  const trovati = [];

  for (const [indice, riga] of righe.entries()) {
    if (!IMPORTO.test(riga)) continue;
    IMPORTO.lastIndex = 0;
    const intestazione = righe.slice(Math.max(0, indice - 3), indice).join(" ");
    const contesto = `${intestazione} ${riga}`.toLowerCase();

    for (const m of riga.matchAll(IMPORTO)) {
      const valore = numeroItaliano(m[1] ?? m[2] ?? "");
      if (valore === null) continue;
      trovati.push({ valore, riga: riga.trim(), contesto, indice });
    }
  }
  return trovati;
}

function unitaDi(contesto) {
  if (PAROLE_GIORNO.test(contesto)) return "giorno";
  if (PAROLE_MESE.test(contesto)) return "mese";
  return null;
}

/** Da valore + unita` a euro/mese, solo se il risultato e` plausibile. */
function aMese(valore, unita) {
  if (unita === "giorno" || (!unita && valore >= GIORNALIERA.min && valore <= GIORNALIERA.max)) {
    if (valore < GIORNALIERA.min || valore > GIORNALIERA.max) return null;
    return { mese: Math.round(valore * GIORNI_AL_MESE), unitaRilevata: "giorno" };
  }
  if (unita === "mese" || (!unita && valore >= MENSILE.min && valore <= MENSILE.max)) {
    if (valore < MENSILE.min || valore > MENSILE.max) return null;
    return { mese: Math.round(valore), unitaRilevata: "mese" };
  }
  return null;
}

function analizza(testo) {
  const privati = [];
  const convenzionati = [];
  const nonClassificati = [];
  const extra = [];

  for (const importo of importiConContesto(testo)) {
    const { valore, contesto, riga } = importo;

    if (PAROLE_EXTRA.test(contesto) && valore < GIORNALIERA.max) {
      extra.push({ valore, riga });
      continue;
    }
    if (!PAROLE_RETTA.test(contesto)) continue;

    const unita = unitaDi(contesto);
    const convertito = aMese(valore, unita);
    if (!convertito) continue;

    const voce = { ...importo, ...convertito };
    const convenzione = PAROLE_CONVENZIONE.test(contesto);
    const privato = PAROLE_PRIVATO.test(contesto);

    if (convenzione && !privato) convenzionati.push(voce);
    else if (privato && !convenzione) privati.push(voce);
    else nonClassificati.push(voce);
  }

  return { privati, convenzionati, nonClassificati, extra };
}

/** Anno della carta: dal testo o, in mancanza, dai riferimenti temporali. */
function annoDellaCarta(testo) {
  const anni = [...testo.matchAll(/\b(20[12][0-9])\b/g)].map((m) => Number.parseInt(m[1], 10));
  if (!anni.length) return null;
  const conteggi = new Map();
  for (const anno of anni) conteggi.set(anno, (conteggi.get(anno) ?? 0) + 1);
  // L'anno piu` recente fra quelli citati almeno due volte: le carte citano
  // spesso normative vecchie, che non vanno scambiate per la data del documento.
  const candidati = [...conteggi.entries()].filter(([, n]) => n >= 2).map(([anno]) => anno);
  return candidati.length ? Math.max(...candidati) : Math.max(...anni);
}

function intervallo(voci) {
  if (!voci.length) return null;
  const valori = voci.map((v) => v.mese);
  return { min: Math.min(...valori), max: Math.max(...valori) };
}

// --- Elaborazione -----------------------------------------------------------

if (!existsSync(MANIFEST)) {
  throw new Error(`Manifest assente: esegui prima npm run rette:scarica`);
}
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

const { data: strutture, error } = await supabase
  .from("strutture")
  .select("slug,nome,comune,url_carta_servizi,prezzo_min,prezzo_max,nucleo_alzheimer,fonte_contatti");
if (error) throw new Error(`Lettura fallita: ${error.message}`);
const perSlug = new Map(strutture.map((s) => [s.slug, s]));

const esiti = { leggibili: 0, scansioni: 0, senzaImporti: 0, alta: 0, media: 0 };
const daRivedere = [];
const aggiornamenti = [];
const prezziTrovati = [];
let alzheimerConfermati = 0;

for (const [slug, voce] of Object.entries(manifest)) {
  const struttura = perSlug.get(slug);
  if (!struttura) continue;

  const percorso = `${CARTELLA}/${voce.file}`;
  if (!existsSync(percorso)) continue;

  const testo = testoDelPdf(percorso);
  if (sembraScansione(testo, voce.byte)) {
    esiti.scansioni++;
    daRivedere.push({ slug, nome: struttura.nome, url: voce.url, motivo: "PDF scansionato: nessun livello di testo" });
    continue;
  }
  esiti.leggibili++;

  const { privati, convenzionati, nonClassificati, extra } = analizza(testo);
  const anno = annoDellaCarta(testo);
  const alzheimer = PAROLE_ALZHEIMER.test(testo);

  const privato = intervallo(privati);
  const convenzionato = intervallo(convenzionati);

  // Molte carte pubblicano una tariffa sola senza dire se sia privata o in
  // convenzione. L'importo e` certo, il regime no: si salva dichiarando
  // "non specificato", invece di scegliere un'etichetta a caso o di buttare
  // via il dato. In pagina comparira` con quella dicitura.
  const generico = !privato && !convenzionato ? intervallo(nonClassificati) : null;

  if (!privato && !convenzionato && !generico) {
    esiti.senzaImporti++;
    daRivedere.push({ slug, nome: struttura.nome, url: voce.url, motivo: "nessun importo riconducibile a una retta" });
    // Anche senza retta, il nucleo Alzheimer resta un dato utile.
    if (alzheimer && struttura.nucleo_alzheimer !== true) {
      aggiornamenti.push({ slug, campi: { nucleo_alzheimer: true }, soloAlzheimer: true });
      alzheimerConfermati++;
    }
    continue;
  }

  const vociUsate = privato || convenzionato ? [...privati, ...convenzionati] : nonClassificati;
  const unitaEsplicita = vociUsate.every((v) => unitaDi(v.contesto) !== null);
  // Alta solo quando il regime e` dichiarato nel documento e l'unita` riconosciuta.
  const confidenza = unitaEsplicita && (privato || convenzionato) ? "alta" : "media";
  esiti[confidenza]++;

  const regime = privato ? "privata" : convenzionato && !generico ? "convenzionata" : "non_specificato";

  const originale = [
    privati[0] && `${privati[0].valore} €/${privati[0].unitaRilevata} (privato)`,
    convenzionati[0] && `${convenzionati[0].valore} €/${convenzionati[0].unitaRilevata} (convenzionato)`,
    generico && `${nonClassificati[0].valore} €/${nonClassificati[0].unitaRilevata} (regime non specificato)`,
  ]
    .filter(Boolean)
    .join("; ");

  const campi = {
    retta_originale: originale || null,
    carta_servizi_anno: anno,
    carta_servizi_scaricata_il: voce.scaricato_il,
    retta_confidenza: confidenza,
    retta_regime: regime,
    costi_extra:
      extra.length > 0
        ? [...new Set(extra.slice(0, 3).map((e) => `${e.valore} € — ${e.riga.slice(0, 60)}`))].join("; ")
        : null,
  };
  if (privato || generico) {
    const scelto = privato ?? generico;
    campi.prezzo_min = scelto.min;
    campi.prezzo_max = scelto.max;
    prezziTrovati.push(scelto.min, scelto.max);
  }
  if (convenzionato) {
    campi.retta_convenzionata_min = convenzionato.min;
    campi.retta_convenzionata_max = convenzionato.max;
  }
  if (generico) {
    daRivedere.push({
      slug,
      nome: struttura.nome,
      url: voce.url,
      motivo: "regime non dichiarato nel documento: importo salvato come non specificato",
      estratto: originale,
    });
  }
  if (alzheimer && struttura.nucleo_alzheimer !== true) {
    campi.nucleo_alzheimer = true;
    alzheimerConfermati++;
  }

  const fonti = { ...(struttura.fonte_contatti ?? {}) };
  const provenienza = { fonte: "carta_servizi", url: voce.url, il: new Date().toISOString().slice(0, 10) };
  if (privato) fonti.prezzo = provenienza;
  if (convenzionato) fonti.retta_convenzionata = provenienza;
  if (campi.nucleo_alzheimer) fonti.nucleo_alzheimer = provenienza;
  campi.fonte_contatti = fonti;

  aggiornamenti.push({ slug, campi, confidenza });

  if (confidenza === "media" && !generico) {
    daRivedere.push({
      slug,
      nome: struttura.nome,
      url: voce.url,
      motivo: "unita di misura non esplicita in tutte le voci: verificare",
      estratto: originale,
    });
  }
}

// --- Scrittura --------------------------------------------------------------

let scritte = 0;
if (APPLICA) {
  for (const a of aggiornamenti) {
    const { error: erroreUpdate } = await supabase.from("strutture").update(a.campi).eq("slug", a.slug);
    if (erroreUpdate) console.log(`   errore su ${a.slug}: ${erroreUpdate.message}`);
    else scritte++;
  }
}

writeFileSync(
  REVISIONE,
  `${JSON.stringify({ eseguito_il: new Date().toISOString(), esiti, casi: daRivedere }, null, 2)}\n`,
  "utf8",
);

// --- Report -----------------------------------------------------------------

const ordinati = [...prezziTrovati].sort((a, b) => a - b);
const mediana = ordinati.length
  ? ordinati.length % 2
    ? ordinati[(ordinati.length - 1) / 2]
    : Math.round((ordinati[ordinati.length / 2 - 1] + ordinati[ordinati.length / 2]) / 2)
  : null;

console.log(APPLICA ? "===== ESTRAZIONE RETTE (applicata) =====" : "===== ESTRAZIONE RETTE (simulazione) =====");
console.log(`PDF in archivio:        ${Object.keys(manifest).length}`);
console.log(`  leggibili:            ${esiti.leggibili}`);
console.log(`  scansionati:          ${esiti.scansioni}`);
console.log(`Rette estratte:         ${aggiornamenti.filter((a) => !a.soloAlzheimer).length}`);
console.log(`  confidenza alta:      ${esiti.alta}`);
console.log(`  confidenza media:     ${esiti.media}`);
console.log(`Senza importi utili:    ${esiti.senzaImporti}`);
console.log(`Nuclei Alzheimer confermati: ${alzheimerConfermati}`);
if (ordinati.length) {
  console.log(`Prezzi privati (€/mese): min ${ordinati[0]} | mediana ${mediana} | max ${ordinati.at(-1)}`);
}
console.log(`Casi in revisione:      ${daRivedere.length} -> ${REVISIONE}`);
if (APPLICA) console.log(`Strutture aggiornate:   ${scritte}`);
else console.log("Nessuna scrittura: rilancia con --applica.");
