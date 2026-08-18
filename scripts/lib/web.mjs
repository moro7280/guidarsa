// Fetch educato di pagine web, condiviso dagli script di arricchimento.
//
// Regole non negoziabili (CLAUDE.md):
// - robots.txt letto e onorato prima di ogni richiesta a un dominio nuovo
// - un dominio alla volta, con pausa fra una pagina e l'altra
// - User-Agent che dice chi siamo e come farci smettere
// - si leggono solo dati fattuali di contatto, mai testi descrittivi

export const USER_AGENT =
  "DirectoryRSAItaliaBot/0.1 (+https://directory-rsa.it/bot; contatto: pascucci.moreno3@gmail.com)";

const PAUSA_STESSO_DOMINIO_MS = 2000;
const TIMEOUT_MS = 15000;

const robotsPerDominio = new Map();
const ultimaRichiesta = new Map();

export const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Parser robots.txt minimale: raccoglie le regole di User-agent: * e del
 * nostro bot, piu` l'eventuale Crawl-delay.
 */
function analizzaRobots(testo) {
  const regole = { disallow: [], allow: [], crawlDelay: 0 };
  let inGruppoValido = false;

  for (const riga of testo.split(/\r?\n/)) {
    const pulita = riga.replace(/#.*$/, "").trim();
    if (!pulita) continue;
    const [campoGrezzo, ...resto] = pulita.split(":");
    const campo = campoGrezzo.trim().toLowerCase();
    const valore = resto.join(":").trim();

    if (campo === "user-agent") {
      const agente = valore.toLowerCase();
      inGruppoValido = agente === "*" || USER_AGENT.toLowerCase().includes(agente);
    } else if (inGruppoValido && campo === "disallow" && valore) {
      regole.disallow.push(valore);
    } else if (inGruppoValido && campo === "allow" && valore) {
      regole.allow.push(valore);
    } else if (inGruppoValido && campo === "crawl-delay") {
      const secondi = Number.parseFloat(valore);
      if (Number.isFinite(secondi)) regole.crawlDelay = Math.max(regole.crawlDelay, secondi * 1000);
    }
  }
  return regole;
}

async function regoleRobots(origine) {
  if (robotsPerDominio.has(origine)) return robotsPerDominio.get(origine);

  let regole = { disallow: [], allow: [], crawlDelay: 0 };
  try {
    const risposta = await fetch(`${origine}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // 404 significa "nessuna restrizione"; un 5xx invece e` incerto e
    // in caso di dubbio ci si astiene.
    if (risposta.ok) regole = analizzaRobots(await risposta.text());
    else if (risposta.status >= 500) regole = { disallow: ["/"], allow: [], crawlDelay: 0 };
  } catch {
    // Irraggiungibile: non insistiamo.
    regole = { disallow: ["/"], allow: [], crawlDelay: 0 };
  }

  robotsPerDominio.set(origine, regole);
  return regole;
}

/** true se il percorso e` consentito: la regola piu` lunga vince, Allow batte Disallow. */
export function consentito(percorso, regole) {
  const corrisponde = (schema) =>
    percorso.startsWith(schema.replace(/\*$/, "")) ? schema.length : 0;

  const pesoDisallow = Math.max(0, ...regole.disallow.map(corrisponde));
  const pesoAllow = Math.max(0, ...regole.allow.map(corrisponde));
  return pesoAllow >= pesoDisallow;
}

/**
 * Scarica una pagina rispettando robots.txt e la pausa per dominio.
 * Restituisce { ok, stato, html, motivo }.
 */
export async function scarica(url) {
  let indirizzo;
  try {
    indirizzo = new URL(url);
  } catch {
    return { ok: false, motivo: "url non valida" };
  }
  if (!/^https?:$/.test(indirizzo.protocol)) {
    return { ok: false, motivo: "protocollo non http(s)" };
  }

  const origine = indirizzo.origin;
  const regole = await regoleRobots(origine);
  if (!consentito(indirizzo.pathname, regole)) {
    return { ok: false, motivo: "vietato da robots.txt" };
  }

  const scorsa = ultimaRichiesta.get(origine) ?? 0;
  const pausa = Math.max(PAUSA_STESSO_DOMINIO_MS, regole.crawlDelay);
  const daAspettare = scorsa + pausa - Date.now();
  if (daAspettare > 0) await attesa(daAspettare);
  ultimaRichiesta.set(origine, Date.now());

  try {
    const risposta = await fetch(indirizzo.href, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    if (!risposta.ok) return { ok: false, stato: risposta.status, motivo: `HTTP ${risposta.status}` };

    const tipo = risposta.headers.get("content-type") ?? "";
    if (!tipo.includes("html")) return { ok: false, motivo: `contenuto non HTML (${tipo})` };

    return { ok: true, stato: risposta.status, html: await risposta.text(), urlFinale: risposta.url };
  } catch (errore) {
    return { ok: false, motivo: `richiesta fallita: ${errore.name}` };
  }
}
