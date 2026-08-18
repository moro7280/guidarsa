import { STRUTTURE_DEMO } from "./mock-data";
import { slugify } from "./slug";
import type { NodoGeografico, Struttura, Tipologia } from "./types";

/**
 * Unico punto di accesso ai dati delle strutture.
 *
 * TODO(dati reali): sostituire `STRUTTURE_DEMO` con le query a Supabase
 * (tabella `strutture`, vedi src/lib/supabase.ts). Le firme delle funzioni
 * sono già asincrone: le pagine non dovranno cambiare.
 */
async function tutte(): Promise<Struttura[]> {
  return STRUTTURE_DEMO;
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
