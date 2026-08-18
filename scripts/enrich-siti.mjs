// Contatti dai siti ufficiali di strutture e gestori.
//   npm run enrich:siti -- --conferma [--fasi=1,2,3] [--limite=N]
//
// Cascata (CLAUDE.md, sessione approvata):
//   fase 1 — dominio dedotto dal nome del gestore, verificato
//   fase 2 — ricerca web (Brave) per i gestori rimasti senza sito
//   fase 3 — ricerca web per singola struttura ancora scoperta
//
// Vincoli non negoziabili:
// - robots.txt onorato, un dominio alla volta con pausa (scripts/lib/web.mjs)
// - si estraggono solo dati fattuali di contatto, mai testi descrittivi
// - i risultati Brave restano in memoria: nessun titolo, snippet o ranking
//   finisce in database (§3(b)(i) dei termini Brave: solo "transient storage")
// - un sito e` "ufficiale" solo dopo verifica nome + comune, con confidenza
//   registrata; nel dubbio non si scrive niente e il caso va in revisione
// - precedenza fonti: sito_ufficiale > osm; ogni sovrascrittura e` tracciata

import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { scarica, attesa } from "./lib/web.mjs";
import {
  estraiEmail,
  estraiPec,
  estraiTelefoni,
  linkVersoStruttura,
  paginePromettenti,
  testoDi,
  trovaCartaServizi,
} from "./lib/estrazione.mjs";

const PERCORSO_REPORT = "data/siti-ufficiali-da-rivedere.json";
const MAX_PAGINE_PER_DOMINIO = 3;
// Gestori lavorati in parallelo: domini diversi, quindi la pausa per dominio
// resta rispettata. Seriale, l intero dataset richiederebbe circa 19 ore.
const GESTORI_IN_PARALLELO = 6;
const PAUSA_BRAVE_MS = 1200;

// Aggregatori e social: non sono mai il sito ufficiale di una struttura.
const DOMINI_ESCLUSI = /(facebook|instagram|linkedin|twitter|x\.com|youtube|paginegialle|paginebianche|virgilio|tuttocitta|cylex|europages|infoimprese|ufficiocamerale|reportaziende|atoka|cribis|icribis|companyreports|wikipedia|indeed|subito|immobiliare|trovacasa|booking|tripadvisor|glassdoor|google|bing|yelp|misterimprese|aziende\.it|dovequando|prontoimprese|italiaora|opencorporates|registroimprese)\./i;

const FORME_GIURIDICHE = /\b(s\.?r\.?l\.?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|onlus|ets|aps|odv|cooperativa|coop|societa|societ|sociale|scs|scarl|impresa|fondazione|associazione|ente|morale|istituto|opera|pia|azienda|servizi|alla|persona|gruppo)\b/gi;

// --- Argomenti e ambiente ---------------------------------------------------

const argomenti = process.argv.slice(2);
const valore = (nome, predefinito) => {
  const trovato = argomenti.find((a) => a.startsWith(`--${nome}=`));
  return trovato ? trovato.split("=")[1] : predefinito;
};
const FASI = new Set(valore("fasi", "1,2,3").split(",").map((f) => f.trim()));
const LIMITE = Number.parseInt(valore("limite", "0"), 10) || 0;

const env = {};
for (const riga of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = riga.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --- Normalizzazione nomi ---------------------------------------------------

function token(valore) {
  return (valore ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(FORME_GIURIDICHE, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 2);
}

function somiglianza(a, b) {
  const ta = new Set(token(a));
  const tb = new Set(token(b));
  if (!ta.size || !tb.size) return 0;
  let comuni = 0;
  for (const t of ta) if (tb.has(t)) comuni++;
  return comuni / Math.min(ta.size, tb.size);
}

const PAROLE_SETTORE = [
  "rsa",
  "residenza sanitaria",
  "casa di riposo",
  "anziani",
  "assistenzial",
  "socio-sanitar",
  "sociosanitar",
  "non autosufficien",
  "alzheimer",
  "centro diurno",
  "riabilitazione",
];

/**
 * Il sito parla davvero di assistenza agli anziani?
 *
 * Senza questo controllo basta un'omonimia: "Croce di Malta SRL" (RSA) e
 * crocemalta.com (un albergo) hanno lo stesso nome, e nella prima prova il
 * numero dell'albergo e` finito su quattro RSA lombarde.
 */
function sembraSettore(html) {
  const testo = testoDi(html).toLowerCase();
  return PAROLE_SETTORE.filter((p) => testo.includes(p)).length >= 2;
}

/** Domini plausibili a partire dal nome del gestore. */
function dominiCandidati(nomeGestore) {
  const parti = token(nomeGestore);
  if (!parti.length) return [];
  const basi = new Set([parti.join(""), parti.join("-"), parti.slice(0, 2).join("")]);
  if (parti.length === 1) basi.add(parti[0]);
  const domini = [];
  for (const base of basi) {
    if (base.length < 4 || base.length > 30) continue;
    for (const tld of ["it", "com", "org"]) domini.push(`https://www.${base}.${tld}`);
  }
  return domini.slice(0, 9);
}

// --- Brave ------------------------------------------------------------------

let queryBrave = 0;

async function cerca(query) {
  if (!env.BRAVE_SEARCH_API_KEY) return [];
  await attesa(PAUSA_BRAVE_MS);
  queryBrave++;

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&country=it&search_lang=it&count=5`;
  const risposta = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY },
  });
  if (!risposta.ok) {
    console.log(`   Brave HTTP ${risposta.status} su "${query.slice(0, 40)}"`);
    return [];
  }
  const dati = await risposta.json();
  // Solo gli URL, in memoria: nessun titolo o snippet viene conservato.
  return (dati.web?.results ?? [])
    .map((r) => r.url)
    .filter((u) => u && !DOMINI_ESCLUSI.test(new URL(u).hostname));
}

// --- Visita di un sito ------------------------------------------------------

/** Scarica homepage + pagine contatti, restituisce i dati grezzi per pagina. */
async function visita(urlIniziale) {
  const pagine = [];
  const home = await scarica(urlIniziale);
  if (!home.ok) return { ok: false, motivo: home.motivo, pagine };

  const base = home.urlFinale ?? urlIniziale;
  pagine.push({ url: base, html: home.html });

  for (const url of paginePromettenti(home.html, base, MAX_PAGINE_PER_DOMINIO - 1)) {
    const pagina = await scarica(url);
    if (pagina.ok) pagine.push({ url: pagina.urlFinale ?? url, html: pagina.html });
  }
  return { ok: true, pagine };
}

/**
 * Verifica che il sito appartenga davvero al gestore o alla struttura, e
 * individua la pagina piu` specifica per quella struttura.
 *
 * Confidenza:
 *   alta  — la pagina nomina la struttura (o il gestore) E il comune
 *   media — solo uno dei due
 *   null  — nessuna corrispondenza: non si scrive niente
 */
function valuta(pagine, struttura, nomeGestore, gestoreMonostruttura) {
  let migliore = null;

  for (const pagina of pagine) {
    const testo = testoDi(pagina.html).toLowerCase();
    const comuneOk = testo.includes(struttura.comune.toLowerCase());
    const strutturaOk =
      token(struttura.nome).filter((t) => testo.includes(t)).length >=
      Math.max(1, Math.ceil(token(struttura.nome).length * 0.6));
    const gestoreOk = nomeGestore
      ? token(nomeGestore).filter((t) => testo.includes(t)).length >=
        Math.max(1, Math.ceil(token(nomeGestore).length * 0.6))
      : false;

    // Una pagina vale per i CONTATTI solo se nomina insieme struttura e comune.
    // Il gestore che corrisponde non basta: sul sito di un gruppo la homepage
    // nomina tutte le sedi, e i recapiti che riporta sono quelli della
    // direzione. È così che, nella prima prova, il centralino di Padova è
    // finito su strutture in provincia di Pavia.
    let confidenza = null;
    if (comuneOk && strutturaOk) confidenza = "alta";
    else if (gestoreMonostruttura && (strutturaOk || (gestoreOk && comuneOk))) confidenza = "media";

    if (!confidenza) continue;

    const punteggio = (confidenza === "alta" ? 2 : 1) + (/contatt/i.test(pagina.url) ? 0.5 : 0);
    if (!migliore || punteggio > migliore.punteggio) {
      migliore = { pagina, confidenza, punteggio, comuneOk, strutturaOk, gestoreOk };
    }
  }

  return migliore;
}

/**
 * Rete di sicurezza: se lo stesso numero verrebbe assegnato a strutture di
 * comuni diversi, è il recapito della sede e non della struttura. Si scarta.
 */
function scartaNumeriDiSede(proposte) {
  const comuniPerNumero = new Map();
  for (const p of proposte) {
    if (!p.telefono) continue;
    const cifre = p.telefono.replace(/\D/g, "").slice(-9);
    if (!comuniPerNumero.has(cifre)) comuniPerNumero.set(cifre, new Set());
    comuniPerNumero.get(cifre).add(p.struttura.comune);
  }

  const scartati = new Set();
  for (const [cifre, comuni] of comuniPerNumero) {
    if (comuni.size > 1) scartati.add(cifre);
  }

  for (const p of proposte) {
    if (!p.telefono) continue;
    if (scartati.has(p.telefono.replace(/\D/g, "").slice(-9))) {
      p.telefonoScartato = p.telefono;
      p.telefono = null;
    }
  }
  return scartati.size;
}

// --- Scrittura --------------------------------------------------------------

const RANGO = { struttura: 3, sito_ufficiale: 2, osm: 1, opendata_lombardia: 1 };

function vinceSuPrecedente(fonteAttuale) {
  if (!fonteAttuale) return true;
  return RANGO.sito_ufficiale > (RANGO[fonteAttuale.fonte ?? fonteAttuale] ?? 0);
}

const sovrascritti = [];

async function salva(proposta) {
  const { struttura, esito, telefono, email, pec, carta } = proposta;
  const oggi = new Date().toISOString().slice(0, 10);
  const fonti = { ...(struttura.fonte_contatti ?? {}) };
  const campi = {};
  const provenienza = { fonte: "sito_ufficiale", url: esito.pagina.url, il: oggi };

  const scrivi = (campo, nuovoValore) => {
    if (!nuovoValore) return;
    const attuale = struttura[campo];
    const fonteAttuale = fonti[campo];
    if (attuale && !vinceSuPrecedente(fonteAttuale)) return;
    if (attuale && fonteAttuale) {
      sovrascritti.push({
        slug: struttura.slug,
        campo,
        da: fonteAttuale.fonte ?? fonteAttuale,
        a: "sito_ufficiale",
        valorePrecedente: attuale,
      });
    }
    campi[campo] = nuovoValore;
    fonti[campo] = provenienza;
  };

  scrivi("telefono", telefono);
  scrivi("email", email);
  scrivi("sito_web", esito.pagina.url);
  if (pec && !struttura.pec_gestore) campi.pec_gestore = pec;
  if (carta && !struttura.url_carta_servizi) campi.url_carta_servizi = carta;

  if (Object.keys(campi).length === 0) return { scritto: false };

  campi.fonte_contatti = fonti;
  campi.contatti_aggiornati_il = new Date().toISOString();

  const { error } = await supabase.from("strutture").update(campi).eq("slug", struttura.slug);
  if (error) {
    console.log(`   errore su ${struttura.slug}: ${error.message}`);
    return { scritto: false };
  }
  return { scritto: true, campi };
}

// --- Avvio ------------------------------------------------------------------

const { data: strutture, error } = await supabase
  .from("strutture")
  .select("slug,nome,comune,provincia_sigla,telefono,email,sito_web,pec_gestore,url_carta_servizi,denominazione_gestore,partita_iva_gestore,fonte_contatti")
  .order("nome");

if (error) throw new Error(`Lettura strutture fallita: ${error.message}`);

const gestori = new Map();
for (const s of strutture) {
  const chiave = s.partita_iva_gestore ?? s.denominazione_gestore ?? s.slug;
  if (!gestori.has(chiave)) gestori.set(chiave, { nome: s.denominazione_gestore, strutture: [] });
  gestori.get(chiave).strutture.push(s);
}

// Chi ha gia contatti da sito ufficiale non viene rilavorato: risparmia
// query Brave e visite inutili quando lo script viene rilanciato.
const giaFatto = (s) => {
  const fonti = s.fonte_contatti ?? {};
  return (fonti.telefono?.fonte === "sito_ufficiale" || fonti.sito_web?.fonte === "sito_ufficiale");
};
for (const gestore of gestori.values()) {
  gestore.strutture = gestore.strutture.filter((s) => !giaFatto(s));
}
for (const [chiave, gestore] of gestori) if (!gestore.strutture.length) gestori.delete(chiave);

const ordinati = [...gestori.entries()].sort((a, b) => b[1].strutture.length - a[1].strutture.length);
const daLavorare = LIMITE ? ordinati.slice(0, LIMITE) : ordinati;

console.log("=== CONTATTI DAI SITI UFFICIALI ===");
console.log(`Strutture: ${strutture.length} | gestori distinti: ${gestori.size}`);
console.log(`Fasi attive: ${[...FASI].join(", ")}${LIMITE ? ` | limite: primi ${LIMITE} gestori` : ""}`);
console.log(`Senza sito oggi: ${strutture.filter((s) => !s.sito_web).length}`);
console.log("");
console.log("STIMA: fino a 9 tentativi di dominio per gestore (fase 1, solo HTTP),");
console.log(`       fino a ${daLavorare.length} query Brave (fase 2, ~$${(daLavorare.length * 0.005).toFixed(2)}),`);
console.log("       piu una query per struttura ancora scoperta (fase 3).");
console.log("");

if (!argomenti.includes("--conferma")) {
  console.log("Serve --conferma per procedere. Nessuna chiamata effettuata.");
  process.exit(0);
}

// --- Cascata ----------------------------------------------------------------

const esiti = { alta: 0, media: 0 };
const dubbi = [];
const scoperte = [];
let carteTrovate = 0;
let pecTrovate = 0;
let numeriDiSedeScartati = 0;
const campiRiempiti = { telefono: 0, email: 0, sito_web: 0 };

let contatore = 0;

async function lavoraGestore(gestore) {
  contatore++;
  const mono = gestore.strutture.length === 1;
  const etichetta = `[${contatore}/${daLavorare.length}] ${gestore.nome ?? "?"} (${gestore.strutture.length})`;

  let sito = null;
  let origine = null;

  const riconosce = (html) => {
    // Nome del gestore E settore: il nome da solo aggancia gli omonimi.
    if (!sembraSettore(html)) return false;
    const testo = testoDi(html).toLowerCase();
    const tokenGestore = token(gestore.nome);
    if (!tokenGestore.length) return false;
    return (
      tokenGestore.filter((t) => testo.includes(t)).length >=
      Math.max(1, Math.ceil(tokenGestore.length * 0.6))
    );
  };

  // Fase 1: dominio dedotto dal nome del gestore.
  if (FASI.has("1")) {
    for (const candidato of dominiCandidati(gestore.nome)) {
      const visitato = await visita(candidato);
      if (visitato.ok && riconosce(visitato.pagine[0].html)) {
        sito = visitato;
        origine = "dominio-dedotto";
        break;
      }
    }
  }

  // Fase 2: ricerca web sul gestore.
  if (!sito && FASI.has("2")) {
    for (const url of (await cerca(`"${gestore.nome}" RSA residenza anziani sito ufficiale`)).slice(0, 2)) {
      const visitato = await visita(url);
      if (visitato.ok && riconosce(visitato.pagine[0].html)) {
        sito = visitato;
        origine = "ricerca-gestore";
        break;
      }
    }
  }

  if (sito) console.log(`${etichetta}: sito via ${origine}`);

  const proposte = [];

  for (const struttura of gestore.strutture) {
    let pagine = [];

    if (sito) {
      if (mono) {
        pagine = sito.pagine;
      } else {
        // Gruppo: serve la pagina della singola struttura, non la homepage.
        const candidati = new Set();
        for (const pagina of sito.pagine) {
          for (const url of linkVersoStruttura(pagina.html, pagina.url, struttura.nome, struttura.comune)) {
            candidati.add(url);
          }
        }
        for (const url of [...candidati].slice(0, 2)) {
          const pagina = await scarica(url);
          if (pagina.ok) pagine.push({ url: pagina.urlFinale ?? url, html: pagina.html });
        }
      }
    }

    let esito = pagine.length ? valuta(pagine, struttura, gestore.nome, mono) : null;

    // Fase 3: ricerca sulla singola struttura, se ancora scoperta.
    if (!esito && FASI.has("3")) {
      for (const url of (await cerca(`"${struttura.nome}" ${struttura.comune} RSA contatti`)).slice(0, 2)) {
        const visitato = await visita(url);
        if (!visitato.ok) continue;
        if (!sembraSettore(visitato.pagine[0].html)) continue;
        esito = valuta(visitato.pagine, struttura, gestore.nome, true);
        if (esito) break;
      }
    }

    if (!esito) {
      scoperte.push({ slug: struttura.slug, nome: struttura.nome, comune: struttura.comune });
      continue;
    }

    const html = esito.pagina.html;
    const pecPagina = estraiPec(html);
    proposte.push({
      struttura,
      esito,
      telefono: estraiTelefoni(html, esito.pagina.url)[0] ?? null,
      email: estraiEmail(html).filter((e) => !pecPagina.includes(e))[0] ?? null,
      pec: pecPagina[0] ?? null,
      carta: trovaCartaServizi(html, esito.pagina.url),
    });
  }

  numeriDiSedeScartati += scartaNumeriDiSede(proposte);

  for (const proposta of proposte) {
    const salvato = await salva(proposta);
    if (!salvato.scritto) continue;

    esiti[proposta.esito.confidenza]++;
    for (const campo of ["telefono", "email", "sito_web"]) {
      if (salvato.campi[campo]) campiRiempiti[campo]++;
    }
    if (salvato.campi.url_carta_servizi) carteTrovate++;
    if (salvato.campi.pec_gestore) pecTrovate++;

    if (proposta.esito.confidenza === "media" || proposta.telefonoScartato) {
      dubbi.push({
        slug: proposta.struttura.slug,
        nome: proposta.struttura.nome,
        comune: proposta.struttura.comune,
        url: proposta.esito.pagina.url,
        confidenza: proposta.esito.confidenza,
        motivo: proposta.telefonoScartato
          ? `telefono ${proposta.telefonoScartato} scartato: ricorre su comuni diversi, e il numero della sede`
          : "gestore con una sola struttura, corrispondenza parziale",
        scritto: Object.keys(salvato.campi).filter((c) => !["fonte_contatti", "contatti_aggiornati_il"].includes(c)),
      });
    }
  }
}
// Pool: piu gestori in parallelo, ma sempre un dominio alla volta (la pausa
// per dominio e dentro scarica()).
const coda = daLavorare.map(([, gestore]) => gestore);
await Promise.all(
  Array.from({ length: GESTORI_IN_PARALLELO }, async () => {
    while (coda.length) {
      const gestore = coda.shift();
      try {
        await lavoraGestore(gestore);
      } catch (errore) {
        console.log(`   errore su ${gestore.nome}: ${errore.message}`);
      }
    }
  }),
);

// --- Report -----------------------------------------------------------------

writeFileSync(
  PERCORSO_REPORT,
  JSON.stringify(
    {
      eseguito_il: new Date().toISOString(),
      gestori_lavorati: daLavorare.length,
      query_brave: queryBrave,
      costo_stimato_usd: Number((queryBrave * 0.005).toFixed(3)),
      siti_per_confidenza: esiti,
      campi_riempiti: campiRiempiti,
      carte_servizi: carteTrovate,
      pec: pecTrovate,
      numeri_di_sede_scartati: numeriDiSedeScartati,
      sovrascritture: sovrascritti,
      da_rivedere_a_mano: dubbi,
      strutture_scoperte: scoperte.length,
      elenco_scoperte: scoperte.slice(0, 300),
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log("\n===== REPORT SITI UFFICIALI =====");
console.log(`Gestori lavorati:          ${daLavorare.length}`);
console.log(`Query Brave:               ${queryBrave} (~$${(queryBrave * 0.005).toFixed(2)})`);
console.log(`Contatti confidenza alta:  ${esiti.alta}`);
console.log(`Contatti confidenza media: ${esiti.media} (in revisione)`);
console.log(`Campi — telefono: ${campiRiempiti.telefono} | email: ${campiRiempiti.email} | sito: ${campiRiempiti.sito_web}`);
console.log(`Carte dei servizi:         ${carteTrovate}`);
console.log(`PEC trovate:               ${pecTrovate}`);
console.log(`Numeri di sede scartati:   ${numeriDiSedeScartati}`);
console.log(`Sovrascritture su OSM:     ${sovrascritti.length}`);
console.log(`Strutture scoperte:        ${scoperte.length}`);
console.log(`Da rivedere a mano:        ${dubbi.length} -> ${PERCORSO_REPORT}`);
