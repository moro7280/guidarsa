import { STRUTTURE_DEMO } from "./mock-data";
import { slugify } from "./slug";
import { getSupabaseClient, supabaseConfigurato } from "./supabase";
import type { NodoGeografico, Struttura, Tipologia } from "./types";

/** Colonne lette dalla tabella `strutture`: corrispondono al type Struttura. */
const COLONNE =
  "nome,slug,tipologia,indirizzo,cap,comune,provincia,provincia_sigla,regione,lat,lng,telefono,email,sito_web,posti_letto,convenzionata,nucleo_alzheimer,prezzo_min,prezzo_max,descrizione,fonte_dati,updated_at";

/** PostgREST restituisce al massimo 1000 righe per richiesta. */
const PAGINA = 1000;

async function leggiDaSupabase(): Promise<Struttura[]> {
  const client = getSupabaseClient();
  const strutture: Struttura[] = [];

  for (let inizio = 0; ; inizio += PAGINA) {
    const { data, error } = await client
      .from("strutture")
      .select(COLONNE)
      .order("nome", { ascending: true })
      .range(inizio, inizio + PAGINA - 1);

    if (error) {
      // Nessun ripiego silenzioso sui dati demo: pubblicare dati finti
      // credendo di pubblicare dati reali è peggio di una build rotta.
      throw new Error(
        `Lettura della tabella "strutture" da Supabase fallita (${error.code ?? "?"}): ${error.message}`,
      );
    }

    const righe = (data ?? []) as unknown as Struttura[];
    strutture.push(...righe);
    if (righe.length < PAGINA) break;
  }

  return strutture;
}

/**
 * Unico punto di accesso ai dati delle strutture: Supabase quando le variabili
 * d'ambiente sono configurate, altrimenti i dati dimostrativi.
 *
 * Il risultato è memoizzato: durante la build ogni pagina chiama questa
 * funzione più volte e senza cache sarebbero decine di query identiche.
 */
let cache: Promise<Struttura[]> | null = null;

async function tutte(): Promise<Struttura[]> {
  if (!cache) {
    cache = supabaseConfigurato()
      ? leggiDaSupabase()
      : Promise.resolve(STRUTTURE_DEMO);
  }
  return cache;
}

export interface FiltroStrutture {
  tipologia?: Tipologia;
  regione?: string;
  provincia?: string;
  comune?: string;
}

function corrisponde(struttura: Struttura, filtro: FiltroStrutture): boolean {
  if (filtro.tipologia && struttura.tipologia !== filtro.tipologia) return false;
  if (filtro.regione && slugify(struttura.regione) !== filtro.regione) return false;
  if (filtro.provincia && slugify(struttura.provincia) !== filtro.provincia) return false;
  if (filtro.comune && slugify(struttura.comune) !== filtro.comune) return false;
  return true;
}

/** Strutture che corrispondono al filtro, ordinate per nome. */
export async function getStrutture(filtro: FiltroStrutture = {}): Promise<Struttura[]> {
  const strutture = await tutte();
  return strutture
    .filter((struttura) => corrisponde(struttura, filtro))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

export async function getStrutturaBySlug(slug: string): Promise<Struttura | null> {
  const strutture = await tutte();
  return strutture.find((struttura) => struttura.slug === slug) ?? null;
}

/** Aggrega le strutture per un livello geografico, scartando i nodi vuoti. */
function aggrega(
  strutture: Struttura[],
  chiave: (struttura: Struttura) => string,
): NodoGeografico[] {
  const conteggi = new Map<string, NodoGeografico>();
  for (const struttura of strutture) {
    const nome = chiave(struttura);
    const slug = slugify(nome);
    const nodo = conteggi.get(slug);
    if (nodo) {
      nodo.conteggio += 1;
    } else {
      conteggi.set(slug, { nome, slug, conteggio: 1 });
    }
  }
  return [...conteggi.values()].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

export async function getRegioni(tipologia?: Tipologia): Promise<NodoGeografico[]> {
  return aggrega(await getStrutture({ tipologia }), (s) => s.regione);
}

export async function getProvince(
  tipologia: Tipologia,
  regione: string,
): Promise<NodoGeografico[]> {
  return aggrega(await getStrutture({ tipologia, regione }), (s) => s.provincia);
}

export async function getComuni(
  tipologia: Tipologia,
  regione: string,
  provincia: string,
): Promise<NodoGeografico[]> {
  return aggrega(await getStrutture({ tipologia, regione, provincia }), (s) => s.comune);
}

/** Nome esteso della regione a partire dallo slug (per H1 e breadcrumb). */
export async function getNomeRegione(regione: string): Promise<string | null> {
  const strutture = await tutte();
  return strutture.find((s) => slugify(s.regione) === regione)?.regione ?? null;
}

export async function getNomeProvincia(provincia: string): Promise<string | null> {
  const strutture = await tutte();
  return strutture.find((s) => slugify(s.provincia) === provincia)?.provincia ?? null;
}

export async function getNomeComune(comune: string): Promise<string | null> {
  const strutture = await tutte();
  return strutture.find((s) => slugify(s.comune) === comune)?.comune ?? null;
}

/** Sigla della provincia a partire dallo slug del comune, es. "MI". */
export async function getSiglaProvinciaDiComune(comune: string): Promise<string | null> {
  const strutture = await tutte();
  return strutture.find((s) => slugify(s.comune) === comune)?.provincia_sigla ?? null;
}

/**
 * Tutte le combinazioni geografiche che contengono almeno una struttura.
 * Usato da `generateStaticParams`: nessuna pagina vuota viene generata.
 */
export async function getCombinazioni(): Promise<
  { tipologia: Tipologia; regione: string; provincia: string; comune: string }[]
> {
  const strutture = await tutte();
  const viste = new Set<string>();
  const combinazioni: {
    tipologia: Tipologia;
    regione: string;
    provincia: string;
    comune: string;
  }[] = [];

  for (const struttura of strutture) {
    const combinazione = {
      tipologia: struttura.tipologia,
      regione: slugify(struttura.regione),
      provincia: slugify(struttura.provincia),
      comune: slugify(struttura.comune),
    };
    const chiave = Object.values(combinazione).join("/");
    if (!viste.has(chiave)) {
      viste.add(chiave);
      combinazioni.push(combinazione);
    }
  }

  return combinazioni;
}

export async function getSlugStrutture(): Promise<string[]> {
  const strutture = await tutte();
  return strutture.map((struttura) => struttura.slug);
}

/** true se il dataset attuale contiene solo dati dimostrativi. */
export async function isDatasetDemo(): Promise<boolean> {
  const strutture = await tutte();
  return strutture.every((struttura) => struttura.fonte_dati === "demo");
}
