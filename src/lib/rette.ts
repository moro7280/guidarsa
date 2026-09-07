import { fonteRetta, chiaveRetta, type FonteRetta } from "./fonti.ts";
import { numero } from "./formato.ts";
import type { Struttura } from "./types";

/**
 * Le rette di una struttura, calcolate in un posto solo.
 *
 * Prima questo calcolo viveva dentro BloccoRette. Ora lo usano due consumatori
 * — il riquadro e la frase in prosa della scheda — e devono dire lo stesso
 * numero: due formattazioni separate sono due occasioni di divergere, e su un
 * prezzo la divergenza è un danno a chi legge.
 *
 * Le regole restano quelle di CLAUDE.md: privata e convenzionata sempre
 * distinte, mai sommate né mediate; ogni importo dichiara la fonte e l'anno;
 * oltre i due anni la tariffa diventa storica.
 */

const ANNI_PER_STORICA = 2;

export interface Importo {
  min: number;
  max: number | null;
  /** "2.400 €" oppure "2.100 - 2.400 €". */
  testo: string;
}

export interface RetteStruttura {
  privata: Importo | null;
  convenzionata: Importo | null;
  /** true se almeno una delle due c'è. */
  presenti: boolean;
  fonte: FonteRetta;
  anno: number | null;
  /** Il documento ha più di due anni. */
  storica: boolean;
  /** Il mensile è calcolato da una tariffa giornaliera dichiarata. */
  mensileCalcolato: boolean;
  /** Il valore come lo scrive la fonte, es. "115,00 €/giorno". */
  originale: string | null;
  /** La fonte non dice se l'importo sia privato o convenzionato. */
  regimeNonNoto: boolean;
}

function componi(min: number | null | undefined, max: number | null | undefined): Importo | null {
  const daMin = min ?? null;
  const daMax = max ?? null;
  if (daMin === null && daMax === null) return null;
  const valore = (daMin ?? daMax) as number;
  const testo =
    daMin !== null && daMax !== null && daMin !== daMax
      ? `${numero(daMin)} - ${numero(daMax)} €`
      : `${numero(valore)} €`;
  return { min: valore, max: daMin !== null && daMax !== null && daMin !== daMax ? daMax : null, testo };
}

export function retteDi(struttura: Struttura): RetteStruttura {
  const anno = struttura.carta_servizi_anno ?? null;
  const fonte = fonteRetta(chiaveRetta(struttura.fonte_dati));
  const privata = componi(struttura.prezzo_min, struttura.prezzo_max);
  const convenzionata = componi(
    struttura.retta_convenzionata_min ?? null,
    struttura.retta_convenzionata_max ?? null,
  );

  return {
    privata,
    convenzionata,
    presenti: Boolean(privata || convenzionata),
    fonte,
    anno,
    storica: anno !== null && new Date().getFullYear() - anno > ANNI_PER_STORICA,
    mensileCalcolato: fonte.mensileCalcolato,
    originale: struttura.retta_originale ?? null,
    regimeNonNoto: struttura.retta_regime === "non_specificato",
  };
}
