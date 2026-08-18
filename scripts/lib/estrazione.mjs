// Estrazione dei soli dati fattuali di contatto da una pagina HTML.
// Niente testi descrittivi: non servono e sono protetti da diritto d'autore.

/** Testo grezzo della pagina, senza script, stili e marcatori. */
export function testoDi(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Coppie [testo, href] di tutti i link della pagina. */
export function linkDi(html, urlBase) {
  const link = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let assoluto;
    try {
      assoluto = new URL(m[1], urlBase).href;
    } catch {
      continue;
    }
    link.push({ href: assoluto, testo: testoDi(m[2]).toLowerCase() });
  }
  return link;
}

const RUMORE_EMAIL = /(esempio|example|tuonome|nome@|@sentry|@wixpress|\.png|\.jpg|\.webp)/i;

/**
 * Email presenti nella pagina, scartando i falsi positivi tipici.
 *
 * La regex vuole un TLD alfabetico e nessun punto doppio: con una regex
 * larga, frammenti CSS come `font-variation-settings: "wght" 100..900`
 * finiscono in tabella come indirizzi email. È successo davvero.
 */
export function estraiEmail(html) {
  const trovate = new Set();
  for (const m of `${html}`.matchAll(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi)) {
    const email = m[0].toLowerCase().replace(/\.$/, "");
    const [locale, dominio] = email.split("@");
    if (RUMORE_EMAIL.test(email)) continue;
    if (/^\d+$/.test(locale)) continue;
    if (dominio.includes("..")) continue;
    trovate.add(email);
  }
  return [...trovate];
}

/** PEC: si riconoscono dal dominio o dal contesto della pagina. */
export function estraiPec(html) {
  return estraiEmail(html).filter((e) => /(^|[.@])pec\.|@.*\bpec\b|legalmail|postecert|@pec\./i.test(e));
}

/**
 * Numeri di telefono italiani. Si prendono prima quelli dichiarati in
 * `tel:` (inequivocabili), poi quelli nel testo con prefisso plausibile.
 */
export function estraiTelefoni(html, urlBase) {
  const numeri = new Set();

  for (const { href } of linkDi(html, urlBase)) {
    if (href.toLowerCase().startsWith("tel:")) {
      const numero = decodeURIComponent(href.slice(4)).replace(/[^\d+]/g, "");
      if (numero.replace(/\D/g, "").length >= 8) numeri.add(numero);
    }
  }

  const testo = testoDi(html);
  const schema = /(?:\+39[\s.]?)?0\d{1,3}[\s./-]?\d{5,8}|(?:\+39[\s.]?)?3\d{2}[\s./-]?\d{6,7}/g;
  for (const m of testo.matchAll(schema)) {
    const numero = m[0].trim();
    const cifre = numero.replace(/\D/g, "");
    if (cifre.length < 9 || cifre.length > 13) continue;

    // Una partita IVA e` una sequenza di 11 cifre attaccate e comincia spesso
    // per 0: senza questo controllo finisce in tabella come numero di telefono.
    // Un telefono scritto per essere chiamato ha quasi sempre un separatore.
    const haSeparatore = /[\s./-]/.test(numero);
    if (!haSeparatore && cifre.replace(/^39/, "").length >= 11) continue;

    numeri.add(numero.replace(/\s+/g, " "));
  }

  return [...numeri];
}

const PAROLE_CARTA = /carta\s+(dei\s+)?servizi/i;

/** URL della carta dei servizi, se la pagina la linka. */
export function trovaCartaServizi(html, urlBase) {
  for (const { href, testo } of linkDi(html, urlBase)) {
    if (PAROLE_CARTA.test(testo) || PAROLE_CARTA.test(decodeURIComponent(href))) return href;
  }
  return null;
}

/**
 * Link che puntano alla pagina di una singola struttura dentro il sito di un
 * gruppo: si riconoscono dal nome della struttura o dal comune nel testo del
 * link o nel percorso. Senza questo, da un sito di gruppo si finisce per
 * leggere i recapiti della sede centrale e attribuirli a ogni struttura.
 */
export function linkVersoStruttura(html, urlBase, nomeStruttura, comune) {
  const normalizza = (v) =>
    v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

  const tokenNome = normalizza(nomeStruttura).split(" ").filter((t) => t.length > 3);
  const comuneNorm = normalizza(comune);
  const trovati = [];

  for (const { href, testo } of linkDi(html, urlBase)) {
    if (!href.startsWith(new URL(urlBase).origin)) continue;
    const contesto = normalizza(`${testo} ${decodeURIComponent(new URL(href).pathname)}`);
    const perComune = comuneNorm.length > 3 && contesto.includes(comuneNorm);
    const perNome =
      tokenNome.length > 0 &&
      tokenNome.filter((t) => contesto.includes(t)).length >= Math.ceil(tokenNome.length * 0.6);
    if (perComune || perNome) trovati.push({ href, punteggio: (perNome ? 2 : 0) + (perComune ? 1 : 0) });
  }

  return [...new Map(trovati.map((t) => [t.href, t])).values()]
    .sort((a, b) => b.punteggio - a.punteggio)
    .slice(0, 2)
    .map((t) => t.href);
}

const PAROLE_CONTATTI = /(contatt|dove[\s-]siamo|come[\s-]raggiungerci|struttur|sede|recapit|informazioni)/i;

/** Pagine interne che valgono la pena di essere visitate, in ordine di utilita`. */
export function paginePromettenti(html, urlBase, massimo = 3) {
  const origine = new URL(urlBase).origin;
  const viste = new Set();
  const candidate = [];

  for (const { href, testo } of linkDi(html, urlBase)) {
    if (!href.startsWith(origine)) continue;
    const percorso = decodeURIComponent(new URL(href).pathname);
    if (viste.has(percorso)) continue;
    if (PAROLE_CONTATTI.test(testo) || PAROLE_CONTATTI.test(percorso)) {
      viste.add(percorso);
      // I "contatti" veri e propri valgono piu` di "la struttura".
      const priorita = /contatt/i.test(testo + percorso) ? 0 : 1;
      candidate.push({ href, priorita });
    }
  }

  return candidate.sort((a, b) => a.priorita - b.priorita).slice(0, massimo).map((c) => c.href);
}
