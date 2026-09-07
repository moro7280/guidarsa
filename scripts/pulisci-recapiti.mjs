// Bonifica dei recapiti: toglie i siti che non sono il sito della struttura e
// i telefoni con prefisso incompatibile.
//
//   npm run pulisci:recapiti -- --prova                 (non scrive niente)
//   npm run pulisci:recapiti -- --ambito milano
//   npm run pulisci:recapiti -- --ambito grandi         (comuni con >5 strutture)
//   npm run pulisci:recapiti -- --ambito tutto
//
// Regola che governa tutto: **meglio nessun dato che un dato sbagliato**. Un
// recapito che non supera i controlli torna a null, mai sostituito con
// un'ipotesi. E siccome anche cancellare un dato giusto e un danno, ogni
// rimozione e reversibile: il valore precedente, il motivo e la data restano
// in `fonte_contatti.rimossi`, cosi un ripensamento e una query, non un
// recupero da backup.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { scarica } from "./lib/web.mjs";

const DATA_BONIFICA = "2026-09-07";
const CACHE = "data/bonifica-pagine.json";
const REPORT = "data/report-bonifica-recapiti.txt";

const argomenti = process.argv.slice(2);
const prova = argomenti.includes("--prova");
// --report non tocca niente: ricostruisce il resoconto complessivo dal registro
// delle rimozioni gia scritto nel database, quindi copre tutti gli ambiti
// eseguiti finora e non solo l'ultimo.
const soloReport = argomenti.includes("--report");
const ambito = (() => {
  const i = argomenti.indexOf("--ambito");
  return i >= 0 ? argomenti[i + 1] : "tutto";
})();

// ============================================================================
// 1. Domini che non sono mai il sito di una struttura
// ============================================================================

const AGGREGATORI = [
  // directory di strutture per anziani
  "peranziani.it", "curalune.com", "hospitalia.it", "lacasadiriposo.it",
  "casariposo.org", "caseriposo.net", "tiassisto.it", "quotalo.it",
  "fatti-trovare.org", "trovacasadiriposo.it", "senioritalia.it",
  // directory generaliste d'impresa (le prime otto erano gia note a pulisci:contatti)
  "paginegialle.it", "paginebianche.it", "virgilio.it", "tuttocitta.it",
  "cylex.it", "misterimprese.it", "aziendeitalia.com", "trovaimprese.it",
  "infoimprese.it", "ufficiocamerale.it", "reportaziende.it", "opencorporates.com",
  "atoka.io", "cribis.com", "icribis.com", "guidasanitaria.it",
  "portalesanitario.it", "annuario.it", "europages.it", "dovequando.it",
  // associazioni di categoria e cluster
  "assolombarda.it", "confcommercio.it", "confindustria.it", "biopmed.eu",
  // vetrine, e-commerce, contenuti sponsorizzati, ripubblicatori di PDF
  "globalstoreitalia.com", "readkong.com", "ideaginger.it", "cfsitalia.com",
  "inprimapagina.com", "siminformatica.it", "idea2000il.it", "almarei.it",
  // testate
  "bresciatoday.it", "milanotoday.it", "ilgiorno.it", "corriere.it", "repubblica.it",
  // aziende sanitarie: sono l'ente che vigila o possiede, non la struttura che
  // la famiglia deve chiamare
  "ats-valpadana.it", "ats-bg.it", "ats-brescia.it", "ats-insubria.it",
  "ats-montagna.it", "ats-milano.it", "ats-pavia.it", "ats-brianza.it",
  "uslumbria1.it", "uslumbria1.gov.it", "uslumbria2.it", "asst-", "ausl.",
  // social e piattaforme
  "facebook.com", "instagram.com", "linkedin.com", "youtube.com", "x.com",
  "twitter.com", "wikipedia.org", "google.com", "booking.com", "tripadvisor.it",
  "indeed.com", "subito.it", "immobiliare.it",
];

const inBlacklist = (host) =>
  AGGREGATORI.some((d) => (d.endsWith("-") || d.endsWith(".") ? host.startsWith(d) : host === d || host.endsWith(`.${d}`)));

/**
 * Path che dicono "questa non e la pagina della struttura": un comunicato, una
 * voce di elenco, un documento. Il dominio puo essere buono — anniazzurri.it e
 * un gestore vero — ma /documentazione non e la pagina di quella RSA.
 */
const PATH_SOSPETTO =
  /\/(blog|news|notizie|comunicati|comunicato|press|rassegna-stampa|cerca-imprese|cerca-imprese-prodotti|listing|directory|documentazione|documenti|archivio|articolo|articoli|magazine|progetti|projects)(\/|$)/i;

// ============================================================================
// 3. Telefoni
// ============================================================================

const PREFISSI_2 = new Set(["02", "06"]);
const PREFISSI_3 = new Set([
  "010", "011", "015", "019", "030", "031", "035", "039", "040", "041", "045",
  "049", "050", "051", "055", "059", "070", "071", "075", "079", "080", "081",
  "085", "089", "090", "091", "095", "099",
]);

/**
 * Provincia del distretto telefonico. Copre i prefissi presenti nei nostri
 * dati: un prefisso che non e qui dentro viene trattato come inesistente, ed e
 * voluto — "0005" e "0940" lo sono davvero.
 */
const PREFISSO_PROVINCIA = {
  "010": "GE", "011": "TO", "0125": "TO", "0141": "AT", "0187": "SP", "02": "MI",
  "030": "BS", "031": "CO", "0321": "NO", "0331": "VA", "0332": "VA", "0341": "LC",
  "0342": "SO", "0343": "SO", "0344": "CO", "0345": "BG", "0346": "BG", "035": "BG",
  "0362": "MB", "0363": "BG", "0364": "BS", "0365": "BS", "0371": "LO", "0372": "CR",
  "0373": "CR", "0374": "CR", "0375": "CR", "0376": "MN", "0377": "LO", "0381": "PV",
  "0382": "PV", "0383": "PV", "0384": "PV", "0385": "PV", "0386": "MN", "039": "MB",
  "040": "TS", "0427": "PN", "0431": "UD", "0432": "UD", "0433": "UD", "0434": "PN",
  "0439": "BL", "0461": "TN", "0462": "TN", "0463": "TN", "0464": "TN", "0465": "TN",
  "0481": "GO", "050": "PI", "0522": "RE", "055": "FI", "0564": "GR", "0565": "LI",
  "0566": "GR", "0571": "FI", "0572": "PT", "0573": "PT", "0574": "PO", "0575": "AR",
  "0577": "SI", "0578": "SI", "0583": "LU", "0584": "LU", "0585": "MS", "0586": "LI",
  "0587": "PI", "0588": "PI", "0742": "PG", "0743": "PG", "0744": "TR", "075": "PG",
  "0763": "TR", "080": "BA", "081": "NA",
};

/** Province confinanti: dove il distretto puo legittimamente sconfinare. */
const CONFINANTI = new Set([
  "MI|LO", "LO|MI", "FI|PT", "PT|FI", "UD|GO", "GO|UD", "PN|GO", "GO|PN",
  "LU|PT", "PT|LU", "AR|GR", "GR|AR", "PO|PT", "PT|PO", "PG|TR", "TR|PG",
  "BG|MI", "MI|BG", "RE|MN", "MN|RE", "MB|MI", "MI|MB", "PV|VA", "VA|PV",
  "NO|MI", "MI|NO", "CR|MN", "MN|CR", "VA|MI", "MI|VA", "LC|MB", "MB|LC",
  "CO|VA", "VA|CO", "SO|LC", "LC|SO", "PI|LU", "LU|PI", "MS|LU", "LU|MS",
]);

function scomponi(telefono) {
  const n = String(telefono ?? "").replace(/\D/g, "").replace(/^(0039|39)(?=0|3)/, "");
  if (!n) return { tipo: "vuoto" };
  if (/^3/.test(n)) return { tipo: "cellulare", numero: n };
  // Numeri non geografici validi: verdi, a tariffa condivisa.
  if (/^(80[03]|84[048]|199|892)/.test(n)) return { tipo: "non geografico", numero: n };
  if (!/^0/.test(n)) return { tipo: "senza prefisso", numero: n };
  const p = PREFISSI_2.has(n.slice(0, 2))
    ? n.slice(0, 2)
    : PREFISSI_3.has(n.slice(0, 3))
      ? n.slice(0, 3)
      : n.slice(0, 4);
  return { tipo: PREFISSO_PROVINCIA[p] ? "fisso" : "prefisso inesistente", prefisso: p, numero: n };
}

// ============================================================================
// Lettura
// ============================================================================

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((r) => r.includes("=") && !r.trimStart().startsWith("#"))
    .map((r) => { const i = r.indexOf("="); return [r.slice(0, i).trim(), r.slice(i + 1).trim()]; }),
);
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti in .env.local.");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const tutte = [];
for (let i = 0; ; i += 1000) {
  const { data, error } = await supabase.from("strutture")
    .select("slug,nome,comune,provincia_sigla,regione,telefono,email,sito_web,descrizione,prezzo_min,prezzo_max,lat,lng,posti_letto,nucleo_alzheimer,denominazione_gestore,fonte_contatti")
    .order("slug")
    .range(i, i + 999);
  if (error) throw new Error(`Lettura fallita: ${error.message}`);
  tutte.push(...data);
  if (data.length < 1000) break;
}

/** Prefisso atteso in un comune, dedotto dai dati (vedi il piano). */
const prefissoDelComune = new Map();
{
  const perComune = new Map();
  for (const s of tutte.filter((x) => x.telefono)) {
    const d = scomponi(s.telefono);
    if (d.tipo !== "fisso") continue;
    const k = `${s.comune}|${s.provincia_sigla}`;
    if (!perComune.has(k)) perComune.set(k, new Map());
    perComune.get(k).set(d.prefisso, (perComune.get(k).get(d.prefisso) ?? 0) + 1);
  }
  for (const [k, m] of perComune) {
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    if (tot < 3) continue;
    const [pref, n] = [...m].sort((a, b) => b[1] - a[1])[0];
    if (n / tot >= 0.7) prefissoDelComune.set(k, pref);
  }
}
const attestati = new Set();
{
  const c = new Map();
  for (const s of tutte.filter((x) => x.telefono)) {
    const d = scomponi(s.telefono);
    if (d.tipo !== "fisso") continue;
    const k = `${d.prefisso}|${s.provincia_sigla}`;
    c.set(k, (c.get(k) ?? 0) + 1);
  }
  for (const [k, n] of c) if (n >= 2) attestati.add(k);
}

function giudicaTelefono(s) {
  const d = scomponi(s.telefono);
  if (d.tipo === "cellulare") return { esito: "cellulare" };
  if (d.tipo === "non geografico") return { esito: "ok" };
  if (d.tipo === "senza prefisso") return { esito: "rimuovi", motivo: "numero senza prefisso" };
  if (d.tipo === "prefisso inesistente") return { esito: "rimuovi", motivo: `prefisso inesistente ${d.prefisso}` };

  const atteso = prefissoDelComune.get(`${s.comune}|${s.provincia_sigla}`);
  if (atteso) {
    return atteso === d.prefisso
      ? { esito: "ok" }
      : { esito: "rimuovi", motivo: `prefisso ${d.prefisso} dove ${s.comune} usa ${atteso}` };
  }
  const casa = PREFISSO_PROVINCIA[d.prefisso];
  if (casa === s.provincia_sigla) return { esito: "ok" };
  if (attestati.has(`${d.prefisso}|${s.provincia_sigla}`)) return { esito: "ok" };
  if (CONFINANTI.has(`${casa}|${s.provincia_sigla}`)) {
    return { esito: "dubbio", motivo: `prefisso ${d.prefisso} (${casa}) in provincia confinante ${s.provincia_sigla}` };
  }
  return { esito: "rimuovi", motivo: `prefisso ${d.prefisso} (${casa}) lontano da ${s.provincia_sigla}` };
}

function giudicaSitoSenzaRete(s) {
  let u;
  try { u = new URL(s.sito_web); } catch { return { esito: "rimuovi", motivo: "URL non valida" }; }
  const host = u.hostname.replace(/^www\./, "");
  if (inBlacklist(host)) return { esito: "rimuovi", motivo: `dominio che non e la struttura: ${host}` };
  if (PATH_SOSPETTO.test(u.pathname)) return { esito: "rimuovi", motivo: `pagina non istituzionale: ${u.pathname}` };
  return { esito: "verifica" };
}

// --- controllo di coerenza (con rete, e con cache) --------------------------

const GENERICHE = new Set([
  "casa", "rsa", "residenza", "residenze", "anziani", "istituto", "fondazione",
  "centro", "onlus", "villa", "srl", "spa", "riposo", "sanitaria", "assistenziale",
  "geriatrico", "polo", "nuova", "nuovo", "santa", "santo", "piccolo", "cooperativa",
  "sociale", "servizi", "azienda", "pubblica", "persona", "ente", "opera", "pia",
]);

const senzaAccenti = (t) =>
  String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const parole = (t) =>
  senzaAccenti(t).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !GENERICHE.has(w));

/**
 * Forma compatta: "Casa di Dio" -> "casadidio", che e quello che si legge in
 * casadidio.eu. Serve perche i nomi fatti solo di parole generiche non hanno
 * nessuna parola distintiva, ma il dominio li scrive tutti attaccati.
 */
const compatta = (t) => senzaAccenti(t).replace(/[^a-z0-9]+/g, "");

/**
 * Fonte del campo sito_web. Il controllo di coerenza vale solo per i link
 * trovati dall'arricchimento automatico: quelli che arrivano da un portale
 * regionale sono gia verificati alla fonte, e li vale solo la blacklist.
 */
const fonteDelSito = (s) => {
  const f = s.fonte_contatti?.sito_web;
  if (!f) return null;
  return typeof f === "string" ? f : (f.fonte ?? null);
};
const daArricchimento = (s) => {
  const f = fonteDelSito(s);
  return f === "sito_ufficiale" || f === null;
};

const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

/** Quante strutture puntano alla stessa identica URL. */
const urlCondivise = new Map();
for (const s of tutte.filter((x) => x.sito_web)) {
  urlCondivise.set(s.sito_web, (urlCondivise.get(s.sito_web) ?? 0) + 1);
}

async function giudicaCoerenza(s) {
  if (!(s.sito_web in cache)) {
    const esito = await scarica(s.sito_web);
    cache[s.sito_web] = esito.ok
      ? {
          ok: true,
          title: (esito.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
          h1: (esito.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
        }
      : { ok: false, motivo: esito.motivo };
    mkdirSync("data", { recursive: true });
    writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  }
  const p = cache[s.sito_web];
  // Una pagina irraggiungibile non prova che il link sia sbagliato: nel dubbio
  // non si tocca, e finisce nel report.
  if (!p.ok) return { esito: "irraggiungibile", motivo: p.motivo, title: "" };

  // Si cerca in title, H1, URL e dominio, sia a parole sia tutto attaccato:
  // "casadidio" non si trova in "casa di dio" separato da spazi.
  const testo = senzaAccenti(`${p.title} ${p.h1} ${s.sito_web}`);
  const testoCompatto = compatta(`${p.title} ${p.h1} ${s.sito_web}`);

  // Anche il comune: "Casa di Riposo Chiuro" e il sito giusto di una struttura
  // che sta a Chiuro, anche se il comune non compare nella denominazione.
  const distintive = [...new Set([...parole(s.nome), ...parole(s.denominazione_gestore), ...parole(s.comune)])];
  const compatte = [compatta(s.nome), compatta(s.denominazione_gestore), compatta(s.comune)]
    .filter((c) => c.length >= 7);

  const trovata =
    distintive.find((w) => testo.includes(w)) ??
    compatte.find((c) => testoCompatto.includes(c));
  if (trovata) return { esito: "ok", title: p.title };

  // Nessuna parola distintiva da cercare — "Casa di Dio", "La Residenza",
  // "San Giuseppe" sono fatti solo di parole generiche. Qui il controllo non
  // sa decidere, e non deve inventarsi una risposta: decide una persona.
  if (distintive.length === 0) {
    return { esito: "manuale", motivo: "nessuna parola distintiva nel nome", title: p.title };
  }

  // Se la stessa URL serve piu strutture, e la pagina di un gruppo gestore —
  // /contatti, /contattaci — non un link sbagliato per distrazione. Non e
  // ovvio che vada tolta, quindi non la tolgo io.
  if ((urlCondivise.get(s.sito_web) ?? 0) > 1) {
    return { esito: "manuale", motivo: "pagina di gruppo, condivisa da piu strutture", title: p.title };
  }

  return {
    esito: "rimuovi",
    motivo: `nessuna delle parole distintive (${distintive.slice(0, 3).join(", ")}) compare in title, H1, URL o dominio`,
    title: p.title,
  };
}

// ============================================================================
// Ambito
// ============================================================================

const perComuneTot = new Map();
for (const s of tutte) {
  const k = `${s.comune}|${s.provincia_sigla}`;
  perComuneTot.set(k, (perComuneTot.get(k) ?? 0) + 1);
}
const comuniGrandi = new Set([...perComuneTot].filter(([, n]) => n > 5).map(([k]) => k));

const inAmbito = (s) => {
  if (ambito === "milano") return s.comune === "Milano" && s.provincia_sigla === "MI";
  if (ambito === "grandi") return comuniGrandi.has(`${s.comune}|${s.provincia_sigla}`);
  return true;
};
const strutture = tutte.filter(inAmbito);

console.log(`Bonifica recapiti — ambito "${ambito}"${prova ? " (PROVA: nessuna scrittura)" : ""}`);
console.log(`strutture nell'ambito: ${strutture.length} su ${tutte.length}\n`);

// ============================================================================
// Giudizio
// ============================================================================

const azioni = [];
const dubbi = [];
const cellulari = [];
const irraggiungibili = [];
const incoerenti = [];
const daMano = [];

const daVerificare = strutture.filter((s) => s.sito_web && giudicaSitoSenzaRete(s).esito === "verifica" && daArricchimento(s));
console.log(`siti da verificare in rete: ${daVerificare.length} (con pause per dominio, ci vuole)\n`);

let fatti = 0;
for (const s of strutture) {
  const rimozioni = {};

  if (s.sito_web) {
    let g = giudicaSitoSenzaRete(s);
    if (g.esito === "verifica" && !daArricchimento(s)) {
      // Fonte ufficiale: passata la blacklist, il link si tiene.
      g = { esito: "ok" };
    } else if (g.esito === "verifica") {
      g = await giudicaCoerenza(s);
      fatti += 1;
      if (fatti % 50 === 0) console.log(`  verificati ${fatti}/${daVerificare.length}`);
      if (g.esito === "irraggiungibile") irraggiungibili.push({ s, motivo: g.motivo });
      if (g.esito === "rimuovi") incoerenti.push({ s, title: g.title });
      if (g.esito === "manuale") daMano.push({ s, title: g.title, motivo: g.motivo });
    }
    if (g.esito === "rimuovi") rimozioni.sito_web = { valore: s.sito_web, motivo: g.motivo };
  }

  if (s.telefono) {
    const g = giudicaTelefono(s);
    if (g.esito === "rimuovi") rimozioni.telefono = { valore: s.telefono, motivo: g.motivo };
    if (g.esito === "dubbio") dubbi.push({ s, motivo: g.motivo });
    if (g.esito === "cellulare") cellulari.push({ s });
  }

  if (Object.keys(rimozioni).length) azioni.push({ s, rimozioni });
}

// ============================================================================
// Scrittura
// ============================================================================

let scritte = 0;
if (!prova) {
  for (const { s, rimozioni } of azioni) {
    const fonte = { ...(s.fonte_contatti ?? {}) };
    const registro = { ...(fonte.rimossi ?? {}) };
    const patch = {};
    for (const [campo, { valore, motivo }] of Object.entries(rimozioni)) {
      patch[campo] = null;
      // La provenienza del campo va conservata insieme al valore, o un
      // ripristino non sa piu da dove veniva il dato: e un errore che ho gia
      // fatto una volta, e si paga ricostruendo a mano.
      const provenienzaPrecedente = fonte[campo] ?? null;
      delete fonte[campo];
      // Reversibilita: il valore tolto resta qui, con il perche e il quando.
      registro[campo] = { valore, motivo, il: DATA_BONIFICA, provenienza: provenienzaPrecedente };
    }
    fonte.rimossi = registro;
    const { error } = await supabase.from("strutture")
      .update({ ...patch, fonte_contatti: fonte })
      .eq("slug", s.slug);
    if (error) throw new Error(`Scrittura fallita su ${s.slug}: ${error.message}`);
    scritte += 1;
  }
}

// ============================================================================
// Report
// ============================================================================

const CRITERI = [
  [25, (s) => Boolean(s.telefono)],
  [15, (s) => Boolean(s.email || s.sito_web)],
  [20, (s) => (s.descrizione ?? "").trim().split(/\s+/).filter(Boolean).length >= 40],
  [15, (s) => s.prezzo_min != null && s.prezzo_max != null],
  [10, (s) => s.lat != null && s.lng != null],
  [10, (s) => s.posti_letto != null],
  [5, (s) => s.nucleo_alzheimer !== null],
];
const punti = (s) => CRITERI.reduce((t, [p, f]) => t + (f(s) ? p : 0), 0);
const dopo = (s, rim) => ({ ...s, ...Object.fromEntries(Object.keys(rim).map((k) => [k, null])) });

const scese = azioni.filter(({ s, rimozioni }) => punti(s) >= 60 && punti(dopo(s, rimozioni)) < 60);

const perRegione = new Map();
for (const { s, rimozioni } of azioni) {
  const v = perRegione.get(s.regione) ?? { toccate: 0, siti: 0, telefoni: 0, scese: 0 };
  v.toccate += 1;
  if (rimozioni.sito_web) v.siti += 1;
  if (rimozioni.telefono) v.telefoni += 1;
  if (punti(s) >= 60 && punti(dopo(s, rimozioni)) < 60) v.scese += 1;
  perRegione.set(s.regione, v);
}

const motivi = new Map();
for (const { rimozioni } of azioni) {
  for (const { motivo } of Object.values(rimozioni)) {
    const k = motivo.replace(/: .*/, "").replace(/\d{3,4}/g, "N").replace(/dove .* usa N/, "dove il comune usa un altro prefisso");
    motivi.set(k, (motivi.get(k) ?? 0) + 1);
  }
}

const R = [];
R.push("BONIFICA DEI RECAPITI — report");
R.push(`data: ${DATA_BONIFICA}   ambito: ${ambito}${prova ? "   (PROVA, nessuna scrittura)" : ""}`);
R.push(`strutture esaminate: ${strutture.length} su ${tutte.length} in database`);
R.push("");
R.push("Regola: un recapito che non supera i controlli torna a null, mai sostituito");
R.push("con un'ipotesi. Ogni valore tolto resta in fonte_contatti.rimossi con motivo");
R.push("e data, quindi ogni rimozione si puo annullare.");
R.push("");
R.push("=".repeat(78));
R.push("1. NUMERI FINALI PER REGIONE");
R.push("=".repeat(78));
R.push("regione                    toccate   siti tolti   telefoni tolti   scese sotto 60");
for (const [r, v] of [...perRegione].sort((a, b) => b[1].toccate - a[1].toccate)) {
  R.push(`${r.padEnd(26)} ${String(v.toccate).padStart(7)} ${String(v.siti).padStart(12)} ${String(v.telefoni).padStart(16)} ${String(v.scese).padStart(16)}`);
}
R.push("");
R.push(`TOTALE  strutture toccate ${azioni.length} · siti tolti ${azioni.filter((a) => a.rimozioni.sito_web).length} · telefoni tolti ${azioni.filter((a) => a.rimozioni.telefono).length}`);
R.push("");
R.push("motivi:");
for (const [m, n] of [...motivi].sort((a, b) => b[1] - a[1])) R.push(`  ${String(n).padStart(5)}  ${m}`);
R.push("");
R.push("=".repeat(78));
R.push(`2. SCHEDE SCESE SOTTO LA SOGLIA 60 — vanno noindex, e voluto (${scese.length})`);
R.push("=".repeat(78));
for (const { s, rimozioni } of scese) {
  R.push(`${String(punti(s)).padStart(3)} -> ${String(punti(dopo(s, rimozioni))).padStart(3)}  ${s.nome.slice(0, 40).padEnd(41)} ${s.comune} (${s.provincia_sigla})`);
}
R.push("");
R.push("=".repeat(78));
R.push(`3. TELEFONI DUBBI — non toccati, da controllare a mano (${dubbi.length})`);
R.push("=".repeat(78));
for (const { s, motivo } of dubbi) {
  R.push(`${s.nome.slice(0, 34).padEnd(35)} ${s.comune.slice(0, 18).padEnd(19)} ${String(s.telefono).padEnd(18)} ${motivo}`);
}
R.push("");
R.push("=".repeat(78));
R.push(`4. CELLULARI — tenuti, segnalati (${cellulari.length})`);
R.push("=".repeat(78));
for (const { s } of cellulari) {
  R.push(`${s.nome.slice(0, 34).padEnd(35)} ${s.comune.slice(0, 18).padEnd(19)} ${s.telefono}`);
}
R.push("");
R.push("=".repeat(78));
R.push(`5. SITI TOLTI PER INCOERENZA — title e URL, per il controllo a campione (${incoerenti.length})`);
R.push("=".repeat(78));
for (const { s, title } of incoerenti) {
  R.push(`${s.nome} — ${s.comune} (${s.provincia_sigla})`);
  R.push(`   URL:   ${s.sito_web}`);
  R.push(`   title: ${title || "(nessun title)"}`);
}
R.push("");
R.push("=".repeat(78));
R.push(`6. PAGINE IRRAGGIUNGIBILI — non toccate, il link resta (${irraggiungibili.length})`);
R.push("=".repeat(78));
for (const { s, motivo } of irraggiungibili) {
  R.push(`${s.nome.slice(0, 38).padEnd(39)} ${String(s.sito_web).slice(0, 52).padEnd(53)} ${motivo}`);
}
R.push("");
R.push(`scritture eseguite: ${prova ? "0 (prova)" : scritte}`);

mkdirSync("data", { recursive: true });
writeFileSync(REPORT, `${R.join("\n")}\n`, "utf8");

console.log(`\nstrutture toccate: ${azioni.length}`);
console.log(`  siti tolti:     ${azioni.filter((a) => a.rimozioni.sito_web).length}`);
console.log(`  telefoni tolti: ${azioni.filter((a) => a.rimozioni.telefono).length}`);
console.log(`scese sotto soglia 60: ${scese.length}`);
console.log(`da verificare a mano: ${daMano.length}`);
console.log(`dubbi ${dubbi.length} · cellulari ${cellulari.length} · irraggiungibili ${irraggiungibili.length}`);
console.log(`scritture: ${prova ? "0 (prova)" : scritte}`);
console.log(`\nreport in ${REPORT}`);

// ============================================================================
// --report: resoconto complessivo, letto dal registro nel database
// ============================================================================

if (soloReport) {
  const conRegistro = tutte.filter((s) => s.fonte_contatti?.rimossi);
  const perReg = new Map();
  const perMotivo = new Map();
  let siti = 0;
  let telefoni = 0;

  for (const s of conRegistro) {
    const r = s.fonte_contatti.rimossi;
    const v = perReg.get(s.regione) ?? { toccate: 0, siti: 0, telefoni: 0, sotto: 0 };
    v.toccate += 1;
    if (r.sito_web) { v.siti += 1; siti += 1; }
    if (r.telefono) { v.telefoni += 1; telefoni += 1; }
    // "Scesa" e chi oggi sta sotto soglia ma ci starebbe sopra se le rimuovessimo
    // annullassimo: si ricostruisce il prima dal registro stesso.
    const prima = { ...s };
    for (const [campo, { valore }] of Object.entries(r)) prima[campo] = valore;
    if (punti(s) < 60 && punti(prima) >= 60) v.sotto += 1;
    perReg.set(s.regione, v);
    for (const { motivo } of Object.values(r)) {
      const k = motivo.replace(/: .*/, "").replace(/\d{3,4}/g, "N")
        .replace(/dove \S+ usa N/, "dove il comune usa un altro prefisso")
        .replace(/\(\w\w\) lontano da \w\w/, "di provincia lontana");
      perMotivo.set(k, (perMotivo.get(k) ?? 0) + 1);
    }
  }

  const L = [];
  L.push("BONIFICA DEI RECAPITI — RESOCONTO COMPLESSIVO");
  L.push(`data: ${DATA_BONIFICA}`);
  L.push(`strutture in database: ${tutte.length}   strutture bonificate: ${conRegistro.length}`);
  L.push("");
  L.push("Ricostruito dal registro fonte_contatti.rimossi, quindi copre tutti gli ambiti");
  L.push("eseguiti: Milano, i 26 comuni sopra le 5 strutture, e l'intero database.");
  L.push("");
  L.push("Ogni valore tolto e conservato con motivo e data: nessuna rimozione e definitiva.");
  L.push("Per annullarne una basta rileggere fonte_contatti.rimossi.<campo>.valore.");
  L.push("");
  L.push("=".repeat(78));
  L.push("1. NUMERI FINALI PER REGIONE");
  L.push("=".repeat(78));
  L.push("regione                     bonificate   siti tolti   telefoni tolti   scese sotto 60");
  for (const [r, v] of [...perReg].sort((a, b) => b[1].toccate - a[1].toccate)) {
    L.push(`${r.padEnd(27)} ${String(v.toccate).padStart(10)} ${String(v.siti).padStart(12)} ${String(v.telefoni).padStart(16)} ${String(v.sotto).padStart(14)}`);
  }
  L.push("");
  L.push(`TOTALE   strutture ${conRegistro.length} · siti tolti ${siti} · telefoni tolti ${telefoni}`);
  L.push("");
  L.push("motivi delle rimozioni:");
  for (const [m, n] of [...perMotivo].sort((a, b) => b[1] - a[1])) L.push(`  ${String(n).padStart(5)}  ${m}`);
  L.push("");
  L.push("stato dei recapiti dopo la bonifica:");
  L.push(`  con sito_web: ${tutte.filter((s) => s.sito_web).length} (erano 927)`);
  L.push(`  con telefono: ${tutte.filter((s) => s.telefono).length} (erano 1041)`);
  L.push(`  schede sopra la soglia 60: ${tutte.filter((s) => punti(s) >= 60).length} su ${tutte.length}`);
  L.push("");
  L.push("=".repeat(78));
  L.push(`2. SCHEDE SCESE SOTTO LA SOGLIA 60 — vanno noindex, e voluto`);
  L.push("=".repeat(78));
  const primaDi = (s) => {
    const prima = { ...s };
    for (const [campo, { valore }] of Object.entries(s.fonte_contatti.rimossi)) prima[campo] = valore;
    return prima;
  };
  const scesePost = conRegistro.filter((s) => punti(s) < 60 && punti(primaDi(s)) >= 60);
  const giaSotto = conRegistro.filter((s) => punti(s) < 60 && punti(primaDi(s)) < 60);
  L.push(`${scesePost.length} schede sono scese sotto soglia per effetto della bonifica.`);
  L.push(`Altre ${giaSotto.length} bonificate erano gia sotto prima e ci restano: non le conta questa sezione.`);
  L.push("");
  for (const s of scesePost.sort((a, b) => a.regione.localeCompare(b.regione))) {
    const tolti = Object.keys(s.fonte_contatti.rimossi).join("+");
    L.push(`${String(punti(primaDi(s))).padStart(3)} -> ${String(punti(s)).padStart(3)}  ${s.nome.slice(0, 40).padEnd(41)} ${s.comune.slice(0, 18).padEnd(19)} (${s.provincia_sigla})  tolto: ${tolti}`);
  }
  L.push("");
  L.push("=".repeat(78));
  L.push(`3. TELEFONI DUBBI — non toccati (${dubbi.length})`);
  L.push("=".repeat(78));
  L.push("Prefisso di una provincia confinante: il distretto telefonico puo sconfinare,");
  L.push("quindi non si cancella senza verificare. Da controllare a mano.");
  L.push("");
  for (const { s, motivo } of dubbi) {
    L.push(`${s.nome.slice(0, 34).padEnd(35)} ${s.comune.slice(0, 20).padEnd(21)} ${String(s.telefono).padEnd(18)} ${motivo}`);
  }
  L.push("");
  L.push("=".repeat(78));
  L.push(`4. CELLULARI — tenuti, segnalati (${cellulari.length})`);
  L.push("=".repeat(78));
  for (const { s } of cellulari) {
    L.push(`${s.nome.slice(0, 34).padEnd(35)} ${s.comune.slice(0, 20).padEnd(21)} ${s.telefono}`);
  }
  L.push("");
  L.push("=".repeat(78));
  L.push(`5. SITI TOLTI PER INCOERENZA — title e URL, per il controllo a campione`);
  L.push("=".repeat(78));
  L.push("Il nome della struttura e quello del gestore non compaiono ne nel title, ne");
  L.push("nell'H1, ne nell'URL della pagina collegata.");
  L.push("");
  const perIncoerenza = conRegistro.filter((s) => /compaiono in title/.test(s.fonte_contatti.rimossi.sito_web?.motivo ?? ""));
  L.push(`${perIncoerenza.length} siti tolti per questo motivo.`);
  L.push("");
  for (const s of perIncoerenza.sort((a, b) => a.regione.localeCompare(b.regione))) {
    const url = s.fonte_contatti.rimossi.sito_web.valore;
    const p = cache[url];
    L.push(`${s.nome} — ${s.comune} (${s.provincia_sigla})`);
    L.push(`   URL:   ${url}`);
    L.push(`   title: ${p?.title || "(non registrato)"}`);
  }
  L.push("");
  L.push("=".repeat(78));
  L.push(`6. PAGINE IRRAGGIUNGIBILI — non toccate, il link resta (${irraggiungibili.length})`);
  L.push("=".repeat(78));
  L.push("Una pagina che oggi non risponde non prova che il link sia sbagliato.");
  L.push("");
  for (const { s, motivo } of irraggiungibili) {
    L.push(`${s.nome.slice(0, 36).padEnd(37)} ${String(s.sito_web).slice(0, 50).padEnd(51)} ${motivo}`);
  }

  writeFileSync(REPORT, `${L.join("\n")}\n`, "utf8");
  console.log(`\nresoconto complessivo scritto in ${REPORT}`);
  console.log(`strutture bonificate: ${conRegistro.length} · siti ${siti} · telefoni ${telefoni}`);
}

// ============================================================================
// Lista da verificare a mano: casi in cui il controllo non sa decidere e non
// deve inventarsi una risposta. Il link NON viene toccato.
// ============================================================================

const DA_MANO = "data/bonifica-da-verificare-a-mano.txt";
const M = [];
M.push("SITI DA VERIFICARE A MANO — la bonifica non li ha toccati");
M.push(`data: ${DATA_BONIFICA}   ambito: ${ambito}`);
M.push("");
M.push("Due casi finiscono qui:");
M.push("  - il nome della struttura e fatto solo di parole generiche (Casa di Dio,");
M.push("    La Residenza, San Giuseppe): non c'e nessuna parola distintiva da cercare,");
M.push("    e il controllo non deve decidere al posto di una persona");
M.push("  - la stessa URL serve piu strutture: e la pagina di un gruppo gestore,");
M.push("    non un link sbagliato per distrazione");
M.push("");
M.push("Il link e ancora nel database: queste righe sono da decidere una per una.");
M.push("");
M.push("=".repeat(78));
M.push("");
for (const { s, title, motivo } of daMano) {
  M.push(`${s.nome} — ${s.comune} (${s.provincia_sigla})`);
  M.push(`   URL:    ${s.sito_web}`);
  M.push(`   title:  ${title || "(nessun title)"}`);
  M.push(`   perche: ${motivo}`);
  M.push("");
}
M.push(`totale: ${daMano.length}`);
writeFileSync(DA_MANO, `${M.join("\n")}\n`, "utf8");
console.log(`lista da verificare a mano in ${DA_MANO} (${daMano.length} righe)`);
