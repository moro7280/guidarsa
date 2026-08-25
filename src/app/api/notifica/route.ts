/**
 * Notifica di una nuova richiesta o iscrizione.
 *
 * Chi chiama questa rotta non e il browser: e il database. Supabase, a ogni
 * INSERT su `leads` o `iscritti`, invia qui il record tramite un Database
 * Webhook. La differenza non e teorica: se il visitatore chiude la scheda un
 * istante dopo l'invio, o la sua rete cade, la riga e comunque salvata e la
 * notifica parte lo stesso. Se dipendesse dal browser, quel lead lo perderemmo
 * senza saperlo.
 *
 * Nessun segreto sta nel client e la service role non serve: il record arriva
 * gia dentro la richiesta, autenticata da un header condiviso.
 */

export const dynamic = "force-dynamic";

interface Payload {
  type?: string;
  table?: string;
  record?: Record<string, unknown>;
}

function valore(record: Record<string, unknown>, campo: string): string {
  const dato = record[campo];
  if (dato === null || dato === undefined || dato === "") return "—";
  return String(dato);
}

/**
 * Link alla tabella nella dashboard di Supabase, ricavato dal riferimento del
 * progetto che sta gia nell'URL: `https://abcdefgh.supabase.co` -> `abcdefgh`.
 * `NOTIFICA_DASHBOARD_URL` lo sostituisce, se un giorno servisse puntare
 * altrove.
 */
function linkDashboard(tabella: string): string | null {
  const esplicito = process.env.NOTIFICA_DASHBOARD_URL;
  if (esplicito) return esplicito;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const riferimento = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  if (!riferimento) return null;
  return `https://supabase.com/dashboard/project/${riferimento}/editor?schema=public&table=${tabella}`;
}

/**
 * La notifica dice che e arrivata una richiesta e da dove: nient'altro.
 *
 * Telegram e un servizio di terzi, e i messaggi restano sul telefono, sui
 * server di Telegram e in ogni backup di quel telefono. Il recapito di una
 * persona, e a maggior ragione la combinazione di recapito, tipo di assistenza
 * cercata e budget, non ha ragione di finire li: e gia in una tabella con RLS,
 * e da li si legge. Il messaggio serve a sapere che bisogna aprirla, non a
 * sostituirla.
 */
function testoLead(record: Record<string, unknown>): string {
  const righe = [
    "🔔 Nuova richiesta su GuidaRSA",
    "",
    `Nome: ${valore(record, "nome")}`,
    `Zona: ${valore(record, "zona")}`,
  ];

  const link = linkDashboard("leads");
  if (link) {
    righe.push("", `Contatti e risposte: ${link}`);
  }
  righe.push("", `Riferimento riga: ${valore(record, "id")}`);

  return righe.join("\n");
}

function testoIscritto(record: Record<string, unknown>): string {
  const righe = [
    "📄 Nuova iscrizione alla guida",
    "",
    `Risorsa: ${valore(record, "risorsa")}`,
  ];

  const link = linkDashboard("iscritti");
  if (link) {
    righe.push("", `Indirizzo email: ${link}`);
  }
  righe.push("", `Riferimento riga: ${valore(record, "id")}`);

  return righe.join("\n");
}

async function inviaTelegram(testo: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return null;

  const risposta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: testo, disable_web_page_preview: true }),
  });

  return risposta.ok ? "inviata" : `errore ${risposta.status}`;
}

async function inviaEmail(oggetto: string, testo: string): Promise<string | null> {
  const chiave = process.env.RESEND_API_KEY;
  const a = process.env.NOTIFICA_EMAIL_A;
  const da = process.env.NOTIFICA_EMAIL_DA;
  if (!chiave || !a || !da) return null;

  const risposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chiave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: da, to: [a], subject: oggetto, text: testo }),
  });

  return risposta.ok ? "inviata" : `errore ${risposta.status}`;
}

export async function POST(richiesta: Request) {
  const segreto = process.env.NOTIFICA_SEGRETO;
  if (!segreto) {
    return Response.json({ errore: "NOTIFICA_SEGRETO non configurato" }, { status: 500 });
  }
  if (richiesta.headers.get("x-guidarsa-segreto") !== segreto) {
    return Response.json({ errore: "non autorizzato" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await richiesta.json()) as Payload;
  } catch {
    return Response.json({ errore: "corpo non leggibile" }, { status: 400 });
  }

  const record = payload.record;
  if (payload.type !== "INSERT" || !record) {
    // Non e un errore: ignoriamo aggiornamenti e cancellazioni.
    return Response.json({ ignorato: true });
  }

  const isLead = payload.table === "leads";
  const testo = isLead ? testoLead(record) : testoIscritto(record);
  const oggetto = isLead
    ? `Nuova richiesta: ${valore(record, "nome")} — ${valore(record, "zona")}`
    : `Nuova iscrizione alla guida: ${valore(record, "email")}`;

  const [telegram, email] = await Promise.all([
    inviaTelegram(testo).catch(() => "eccezione"),
    inviaEmail(oggetto, testo).catch(() => "eccezione"),
  ]);

  // Se nessun canale e configurato lo diciamo con un errore: un webhook che
  // risponde "va tutto bene" mentre non avvisa nessuno e peggio di uno rotto,
  // perche nei log di Supabase sembra funzionante.
  if (telegram === null && email === null) {
    return Response.json({ errore: "nessun canale di notifica configurato" }, { status: 500 });
  }

  return Response.json({ telegram, email });
}
