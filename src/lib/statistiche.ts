import { chiaveRetta, fonteRetta, type FonteRetta } from "./fonti";
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

/** Rette di un'unica popolazione tariffaria: stessa fonte, stesso concetto. */
export interface RettePerFonte {
  fonte: FonteRetta;
  /** Strutture con almeno una retta di questa fonte. */
  strutture: number;
  privataN: number;
  privataMin: number | null;
  privataMax: number | null;
  privataMediana: number | null;
  convenzionataN: number;
  convenzionataMediana: number | null;
}

export interface Statistiche {
  strutture: number;
  comuni: number;
  postiTotali: number;
  postiMedi: number | null;
  convenzionate: number;
  /** Strutture per cui la fonte non dichiara l accreditamento. */
  accreditamentoIgnoto: number;
  conNucleo: number;
  conContatto: number;
  conRetta: number;
  /**
   * Le rette divise per popolazione tariffaria. Piu di una voce significa che
   * su queste strutture convivono concetti di prezzo diversi: e la sola forma
   * in cui si possono pubblicare, perche una mediana unica li mescolerebbe.
   */
  rettePerFonte: RettePerFonte[];
  /**
   * Sintesi valida solo quando la popolazione e omogenea, cioe quando
   * `rettePerFonte` ha una voce sola. Altrimenti sono `null` per costruzione:
   * vedi la regola sui prezzi in CLAUDE.md.
   */
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

function numeri(valori: (number | null | undefined)[]): number[] {
  return valori.filter((v): v is number => v !== null && v !== undefined);
}

/**
 * Raggruppa le rette per popolazione tariffaria.
 *
 * Il raggruppamento e per concetto di prezzo, non per regione: le rette
 * lombarde e quelle friulane vengono entrambe dalle carte dei servizi e stanno
 * insieme, mentre quelle toscane nascono giornaliere sul portale regionale e
 * restano a parte anche se un giorno arrivassero altre regioni con lo stesso
 * meccanismo — quelle avrebbero una chiave loro.
 */
function retteRaggruppate(strutture: Struttura[]): RettePerFonte[] {
  const gruppi = new Map<string, Struttura[]>();
  for (const struttura of strutture) {
    if (struttura.prezzo_min === null && (struttura.retta_convenzionata_min ?? null) === null) {
      continue;
    }
    const chiave = chiaveRetta(struttura.fonte_dati);
    const gruppo = gruppi.get(chiave);
    if (gruppo) gruppo.push(struttura);
    else gruppi.set(chiave, [struttura]);
  }

  return [...gruppi.entries()]
    .map(([chiave, righe]) => {
      const privata = numeri(righe.map((s) => s.prezzo_min));
      const privataMax = numeri(righe.map((s) => s.prezzo_max));
      const convenzionata = numeri(righe.map((s) => s.retta_convenzionata_min));
      return {
        fonte: fonteRetta(chiave),
        strutture: righe.length,
        privataN: privata.length,
        privataMin: privata.length ? Math.min(...privata) : null,
        privataMax: privataMax.length ? Math.max(...privataMax) : null,
        privataMediana: mediana(privata),
        convenzionataN: convenzionata.length,
        convenzionataMediana: mediana(convenzionata),
      };
    })
    .sort((a, b) => b.strutture - a.strutture || a.fonte.breve.localeCompare(b.fonte.breve, "it"));
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
  const rettePerFonte = retteRaggruppate(strutture);

  // La sintesi esiste solo su una popolazione omogenea. Con piu fonti in gioco
  // resta `null` e le pagine mostrano la scomposizione: mediare un mensile da
  // carta dei servizi con un mensile calcolato da una tariffa giornaliera
  // produrrebbe un numero che non descrive nessuna delle due popolazioni.
  const omogenea = rettePerFonte.length === 1 ? rettePerFonte[0] : null;

  return {
    strutture: strutture.length,
    comuni: perComune.size,
    postiTotali,
    postiMedi: conPosti.length ? Math.round(postiTotali / conPosti.length) : null,
    convenzionate: strutture.filter((s) => s.convenzionata === true).length,
    accreditamentoIgnoto: strutture.filter((s) => s.convenzionata === null).length,
    conNucleo: strutture.filter((s) => s.nucleo_alzheimer === true).length,
    conContatto: strutture.filter((s) => s.telefono || s.email || s.sito_web).length,
    conRetta: numeri(strutture.map((s) => s.prezzo_min)).length,
    rettePerFonte,
    rettaMin: omogenea?.privataMin ?? null,
    rettaMax: omogenea?.privataMax ?? null,
    rettaMediana: omogenea?.privataMediana ?? null,
    convenzionataMediana: omogenea?.convenzionataMediana ?? null,
    topComuni: [...perComune.values()]
      .sort((a, b) => b.conteggio - a.conteggio || a.nome.localeCompare(b.nome, "it"))
      .slice(0, 6),
  };
}
