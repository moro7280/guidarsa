import { slugify } from "./slug";
import type { Struttura } from "./types";

/**
 * Statistiche aggregate di un insieme di strutture.
 *
 * Servono alle pagine hub — regione, provincia, tipologia — che finora erano
 * elenchi di link con duecento parole: pagine che chiedono a Google di
 * posizionarsi su "RSA provincia di Brescia" senza dire niente su quella
 * provincia. Tutto quello che c'e qui viene dai dati, niente e scritto a mano.
 */

export interface Statistiche {
  strutture: number;
  comuni: number;
  postiTotali: number;
  postiMedi: number | null;
  convenzionate: number;
  conNucleo: number;
  conContatto: number;
  conRetta: number;
  rettaMin: number | null;
  rettaMax: number | null;
  rettaMediana: number | null;
  convenzionataMediana: number | null;
  /** Comuni con piu strutture, per l'internal linking. */
  topComuni: { nome: string; slug: string; conteggio: number }[];
}

export function mediana(valori: number[]): number | null {
  const ordinati = valori.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (ordinati.length === 0) return null;
  const meta = Math.floor(ordinati.length / 2);
  return ordinati.length % 2
    ? ordinati[meta]
    : Math.round((ordinati[meta - 1] + ordinati[meta]) / 2);
}

export function statistiche(strutture: Struttura[]): Statistiche {
  const perComune = new Map<string, { nome: string; slug: string; conteggio: number }>();
  for (const struttura of strutture) {
    const slug = slugify(struttura.comune);
    const voce = perComune.get(slug);
    if (voce) voce.conteggio += 1;
    else perComune.set(slug, { nome: struttura.comune, slug, conteggio: 1 });
  }

  const conPosti = strutture.filter((s) => s.posti_letto !== null);
  const postiTotali = conPosti.reduce((somma, s) => somma + (s.posti_letto ?? 0), 0);
  const prezzi = strutture
    .map((s) => s.prezzo_min)
    .filter((v): v is number => v !== null && v !== undefined);
  const prezziMax = strutture
    .map((s) => s.prezzo_max)
    .filter((v): v is number => v !== null && v !== undefined);
  const convenzionate = strutture
    .map((s) => s.retta_convenzionata_min)
    .filter((v): v is number => v !== null && v !== undefined);

  return {
    strutture: strutture.length,
    comuni: perComune.size,
    postiTotali,
    postiMedi: conPosti.length ? Math.round(postiTotali / conPosti.length) : null,
    convenzionate: strutture.filter((s) => s.convenzionata).length,
    conNucleo: strutture.filter((s) => s.nucleo_alzheimer === true).length,
    conContatto: strutture.filter((s) => s.telefono || s.email || s.sito_web).length,
    conRetta: prezzi.length,
    rettaMin: prezzi.length ? Math.min(...prezzi) : null,
    rettaMax: prezziMax.length ? Math.max(...prezziMax) : null,
    rettaMediana: mediana(prezzi),
    convenzionataMediana: mediana(convenzionate),
    topComuni: [...perComune.values()]
      .sort((a, b) => b.conteggio - a.conteggio || a.nome.localeCompare(b.nome, "it"))
      .slice(0, 6),
  };
}
