import { nomeFonte } from "./fonti.ts";
import { numero } from "./formato.ts";
import { retteDi } from "./rette.ts";
import { getTipologia } from "./tipologie.ts";
import type { Struttura } from "./types";

/**
 * Il testo della scheda, composto dai campi al momento del render.
 *
 * Non viene dal database. Il campo `descrizione` è scritto una volta sola
 * all'import e non sa niente di quello che succede dopo: oggi 438 descrizioni
 * dichiarano "non includono recapiti telefonici" su strutture che il telefono
 * ce l'hanno, e 54 dicono "non includono le rette" su strutture con la retta.
 * Comporre qui significa che la pagina dice sempre quello che i dati dicono
 * adesso, e che si aggiorna da sola a ogni arricchimento.
 *
 * Regole, le stesse di CLAUDE.md: ogni frase si scrive solo se il dato c'è;
 * `null` non è `false`; nessun aggettivo; privata e convenzionata mai mescolate.
 */

// ---------------------------------------------------------------------------
// Unità sorelle
// ---------------------------------------------------------------------------

const ABBREVIAZIONI: [RegExp, string][] = [
  [/\bv\.le\b/g, "viale"],
  [/\bv\.lo\b/g, "vicolo"],
  [/\bp\.zza\b/g, "piazza"],
  [/\bp\.za\b/g, "piazza"],
  [/\bp\.le\b/g, "piazzale"],
  [/\bc\.so\b/g, "corso"],
  [/\bl\.go\b/g, "largo"],
  [/\bloc\.\b/g, "localita"],
  [/\bfraz\.\b/g, "frazione"],
  [/\bc\.da\b/g, "contrada"],
  [/\bv\.\s*/g, "via "],
  [/\bs\.\s*/g, "san "],
];

/**
 * Chiave di confronto di un indirizzo. "Via Brescia, 207" e "V. Brescia 207"
 * sono lo stesso posto, e senza questa normalizzazione sarebbero due complessi
 * diversi.
 *
 * `snc` sparisce: significa "senza numero civico", non è un dato. I civici con
 * lettera si uniformano, perché la stessa porta compare come "45/A", "45 A" e
 * "45a" a seconda di chi ha compilato l'elenco.
 */
export function indirizzoNormalizzato(valore: string | null | undefined): string {
  let testo = String(valore ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  for (const [cerca, sostituisci] of ABBREVIAZIONI) testo = testo.replace(cerca, sostituisci);
  return testo
    .replace(/\bsnc\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/(\d+)\s*([a-z])\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Un indirizzo senza numero civico non basta a fare un complesso: due strutture
 * sulla stessa via possono essere due edifici distinti a chilometri di
 * distanza. In quel caso non si dice niente, che è meglio di dire una cosa
 * falsa con sicurezza.
 */
function indirizzoUtile(normalizzato: string): boolean {
  return normalizzato.length > 0 && /\d/.test(normalizzato);
}

/** Massimo oltre il quale il gruppo va guardato da una persona prima di pubblicarlo. */
export const MASSIMO_UNITA_PER_COMPLESSO = 8;

export function chiaveComplesso(struttura: Struttura): string | null {
  const indirizzo = indirizzoNormalizzato(struttura.indirizzo);
  if (!indirizzoUtile(indirizzo)) return null;
  const comune = String(struttura.comune ?? "").toLowerCase().trim();
  if (!comune) return null;
  return `${indirizzo}|${comune}`;
}

/** Le altre unità allo stesso indirizzo e nello stesso comune. */
export function unitaSorelle(struttura: Struttura, tutte: Struttura[]): Struttura[] {
  const chiave = chiaveComplesso(struttura);
  if (!chiave) return [];
  const gruppo = tutte.filter((altra) => chiaveComplesso(altra) === chiave);
  // Un gruppo troppo grande è quasi sempre un indirizzo civico usato come
  // recapito amministrativo, non un complesso: si segnala e non si pubblica.
  if (gruppo.length > MASSIMO_UNITA_PER_COMPLESSO) return [];
  return gruppo.filter((altra) => altra.slug !== struttura.slug);
}

// ---------------------------------------------------------------------------
// Le frasi
// ---------------------------------------------------------------------------

const haPosti = (s: Struttura) => typeof s.posti_letto === "number" && s.posti_letto > 0;

/**
 * "da" + "l'elenco open data" = "dall'elenco open data". Senza questo si legge
 * "vengono da l'elenco", che e la spia piu evidente di un testo generato male.
 */
function conDa(nome: string): string {
  if (nome.startsWith("l'")) return `dall'${nome.slice(2)}`;
  if (nome.startsWith("la ")) return `dalla ${nome.slice(3)}`;
  if (nome.startsWith("il ")) return `dal ${nome.slice(3)}`;
  if (nome.startsWith("i ")) return `dai ${nome.slice(2)}`;
  return `da ${nome}`;
}

function nomeTipologia(struttura: Struttura): string {
  return getTipologia(struttura.tipologia)?.singolareInFrase ?? "una struttura per anziani";
}

export interface TestiScheda {
  /** I paragrafi già composti, da rendere uno per <p>. */
  paragrafi: string[];
  /** La provenienza va in fondo, dopo il paragrafo con i link alle sorelle. */
  provenienza: string;
  /** Le sorelle, per il paragrafo con i link. */
  sorelle: Struttura[];
  /** Quali frasi sono state scritte: serve al report. */
  frasi: string[];
}

export function testiScheda(struttura: Struttura, tutte: Struttura[]): TestiScheda {
  const frasi: string[] = [];
  const sorelle = unitaSorelle(struttura, tutte);
  const complesso = [struttura, ...sorelle];

  // --- paragrafo 1: identità, dimensione, scala ---------------------------
  const primo: string[] = [];
  primo.push(
    `${struttura.nome} è ${nomeTipologia(struttura)} a ${struttura.comune} (${struttura.provincia_sigla}).`,
  );
  frasi.push("F1");

  if (haPosti(struttura)) {
    primo.push(`Dispone di ${numero(struttura.posti_letto as number)} posti letto.`);
    frasi.push("F2");
  }

  // La scala si può dire solo se il confronto è possibile su tutte: con un
  // posto letto ignoto, "la più grande" non è verificabile.
  if (sorelle.length > 0 && complesso.every(haPosti)) {
    const posti = complesso.map((s) => s.posti_letto as number);
    const mio = struttura.posti_letto as number;
    const massimo = Math.max(...posti);
    const minimo = Math.min(...posti);
    const quante = complesso.length;
    if (mio === massimo && massimo !== minimo) {
      primo.push(`È la più grande delle ${numero(quante)} unità di questo indirizzo.`);
    } else if (mio === minimo && massimo !== minimo) {
      primo.push(`È la più piccola delle ${numero(quante)} unità di questo indirizzo.`);
    } else {
      primo.push(`È una delle ${numero(quante)} unità di questo indirizzo.`);
    }
    frasi.push("F3");
  }

  // --- paragrafo 2: nucleo, accreditamento, gestore ------------------------
  const secondo: string[] = [];
  if (struttura.nucleo_alzheimer === true) {
    secondo.push("Dichiara un nucleo dedicato alle demenze.");
    frasi.push("F4-true");
  } else if (struttura.nucleo_alzheimer === false) {
    // La fonte si nomina per esteso: "l'elenco regionale" non dice a chi
    // chiedere se il dato fosse sbagliato.
    secondo.push(`${nomeFonte(struttura.fonte_dati)} non indica un nucleo dedicato alle demenze.`);
    frasi.push("F4-false");
  }

  if (struttura.convenzionata === true) {
    secondo.push(
      "Risulta accreditata con il servizio sanitario regionale: una parte della retta è coperta dalla Regione, mentre la quota alberghiera resta alla famiglia.",
    );
    frasi.push("F4b");
  } else if (struttura.convenzionata === false) {
    secondo.push(
      "Non risulta accreditata negli elenchi regionali: la retta è interamente a carico dell'ospite o della famiglia.",
    );
    frasi.push("F4b");
  }

  if (struttura.denominazione_gestore) {
    secondo.push(`È gestita da ${struttura.denominazione_gestore}.`);
    frasi.push("F4c");
  }

  // --- paragrafo 3: rette --------------------------------------------------
  const terzo: string[] = [];
  const rette = retteDi(struttura);
  if (rette.presenti) {
    const introduzione = rette.fonte.chiave === "carta_servizi"
      ? `La carta dei servizi${rette.anno ? ` ${rette.anno}` : ""} indica`
      : `${nomeFonte(struttura.fonte_dati).replace(/^l'/, "L'").replace(/^il /, "Il ")} riporta`;

    const pezzi: string[] = [];
    if (rette.privata) {
      pezzi.push(
        rette.regimeNonNoto
          ? `${rette.privata.testo} al mese per la retta a carico dell'ospite`
          : `${rette.privata.testo} al mese per la retta privata`,
      );
    }
    if (rette.convenzionata) {
      pezzi.push(`${rette.convenzionata.testo} al mese per la quota a carico dell'ospite in regime convenzionato`);
    }
    terzo.push(`${introduzione} ${pezzi.join(" e ")}.`);

    if (rette.mensileCalcolato && rette.originale) {
      terzo.push(
        `Gli importi mensili sono calcolati dalle tariffe giornaliere dichiarate — ${rette.originale} — moltiplicate per 30,44 giorni medi.`,
      );
    } else if (rette.originale) {
      terzo.push(`Il documento riporta ${rette.originale}.`);
    }
    if (rette.storica) {
      terzo.push("Il documento ha più di due anni: la tariffa va considerata storica e verificata con la struttura.");
    }
    frasi.push("F5");
  }

  // --- paragrafo 4: provenienza, calcolata sui campi veri ------------------
  const mancanti: string[] = [];
  if (!struttura.telefono && !struttura.sito_web && !struttura.email) mancanti.push("i recapiti");
  if (!rette.presenti) mancanti.push("le rette");
  const provenienza =
    mancanti.length > 0
      ? `I dati vengono ${conDa(nomeFonte(struttura.fonte_dati))} e non includono ${mancanti.join(" né ")}.`
      : `I dati vengono ${conDa(nomeFonte(struttura.fonte_dati))}.`;
  frasi.push("F7");

  return {
    paragrafi: [primo.join(" "), secondo.join(" "), terzo.join(" ")].filter(Boolean),
    provenienza,
    sorelle,
    frasi,
  };
}

// ---------------------------------------------------------------------------
// Title e description
// ---------------------------------------------------------------------------

const LIMITE_DESCRIPTION = 155;

/**
 * La description specifica, con i dati che distinguono questa scheda dalle
 * altre. Comune e tipologia restano sempre: sono le parole che si cercano.
 *
 * Sulla retta la distinzione è obbligatoria e non cosmetica: "retta da 1.936
 * euro" su una quota convenzionata farebbe credere a chi legge che quello sia
 * il costo pieno, quando è la parte a carico della famiglia dopo il contributo
 * della Regione.
 */
export function descrizioneScheda(struttura: Struttura): string {
  const info = getTipologia(struttura.tipologia);
  const testa = `${struttura.nome}, ${info?.singolare ?? "struttura per anziani"} a ${struttura.comune} (${struttura.provincia_sigla})`;

  const dettagli: string[] = [];
  if (haPosti(struttura)) dettagli.push(`${numero(struttura.posti_letto as number)} posti letto`);
  if (struttura.nucleo_alzheimer === true) dettagli.push("nucleo per le demenze");

  const rette = retteDi(struttura);
  if (rette.privata) {
    dettagli.push(
      rette.regimeNonNoto
        ? `retta a carico dell'ospite da ${rette.privata.testo} al mese`
        : `retta privata da ${rette.privata.testo} al mese`,
    );
  } else if (rette.convenzionata) {
    dettagli.push(`quota convenzionata da ${rette.convenzionata.testo} al mese`);
  }

  const coda = dettagli.length ? `: ${dettagli.join(", ")}. Contatti e servizi.` : `, ${struttura.indirizzo}. Contatti, posti letto, convenzione e rette indicative.`;
  const testo = `${testa}${coda}`;
  if (testo.length <= LIMITE_DESCRIPTION) return testo;

  // Si taglia su una frase intera, mai a metà parola.
  const ridotto = `${testa}: ${dettagli.slice(0, 2).join(", ")}.`;
  return ridotto.length <= LIMITE_DESCRIPTION ? ridotto : `${testa}.`;
}
