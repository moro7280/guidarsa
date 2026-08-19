import type { Domanda } from "@/components/FaqLuogo";
import { euro, numero } from "./formato";
import type { Statistiche } from "./statistiche";

/**
 * Domande frequenti generate dai dati di un territorio.
 *
 * Sono le domande che una famiglia digita davvero — "quante RSA ci sono a…",
 * "quanto costa…", "quante sono convenzionate" — con risposte che vengono dal
 * database. Se un dato non ce l'abbiamo, la risposta lo dice invece di girarci
 * intorno: e la stessa regola che vale per le schede.
 */
export function domandeLuogo(
  stat: Statistiche,
  {
    luogo,
    tipologiaPlurale,
    tipologiaInFrase,
    livelloComuni,
  }: {
    /** "in Lombardia", "in provincia di Bergamo", "in Italia". */
    luogo: string;
    tipologiaPlurale: string;
    tipologiaInFrase: string;
    livelloComuni: string;
  },
): Domanda[] {
  const domande: Domanda[] = [
    {
      domanda: `Quante ${tipologiaInFrase} ci sono ${luogo}?`,
      risposta: `${luogo.charAt(0).toUpperCase() + luogo.slice(1)} risultano ${numero(
        stat.strutture,
      )} ${tipologiaInFrase} negli elenchi pubblici regionali, distribuite in ${numero(
        stat.comuni,
      )} ${livelloComuni}${
        stat.postiTotali > 0
          ? `, per un totale di ${numero(stat.postiTotali)} posti letto dichiarati`
          : ""
      }.`,
    },
    {
      domanda: `Quanto costa una struttura per anziani ${luogo}?`,
      risposta:
        stat.rettaMediana !== null
          ? `Le rette documentate vanno da ${euro(stat.rettaMin as number)} a ${euro(
              stat.rettaMax as number,
            )} al mese, con un valore mediano di ${euro(stat.rettaMediana)}, su ${numero(
              stat.conRetta,
            )} strutture di cui abbiamo la carta dei servizi.${
              stat.convenzionataMediana !== null
                ? ` In regime convenzionato la quota a carico dell'ospite ha una mediana di ${euro(
                    stat.convenzionataMediana,
                  )} al mese.`
                : ""
            } Sono tariffe indicative, da verificare con la struttura al momento del contatto.`
          : `Non abbiamo ancora rette documentate per questo territorio: pubblichiamo un prezzo solo quando la struttura lo rende disponibile nella propria carta dei servizi, senza stimarlo.`,
    },
    {
      domanda: `Quante ${tipologiaInFrase} sono convenzionate ${luogo}?`,
      // Le strutture con accreditamento ignoto escono dal denominatore: contarle
      // fra le non accreditate significherebbe affermare un dato che non abbiamo.
      risposta:
        stat.convenzionate > 0
          ? `${numero(stat.convenzionate)} su ${numero(
              stat.strutture - stat.accreditamentoIgnoto,
            )} per cui l'elenco regionale dichiara l'accreditamento risultano accreditate con il servizio sanitario regionale. Nelle strutture accreditate una parte della retta è coperta dalla Regione, ma i posti convenzionati sono contingentati: conviene chiedere quanti ne ha la singola struttura, quanti sono liberi e quanto dura l'attesa media.${
              stat.accreditamentoIgnoto > 0
                ? ` Per le altre ${numero(stat.accreditamentoIgnoto)} l'informazione non è disponibile negli open data regionali.`
                : ""
            }`
          : stat.accreditamentoIgnoto === stat.strutture
            ? `L'elenco regionale non dichiara l'accreditamento di queste strutture: è un dato da chiedere alla struttura stessa o all'azienda sanitaria di riferimento, perché cambia molto la retta a carico della famiglia.`
            : `Nessuna delle strutture censite risulta accreditata negli elenchi regionali: la retta è quindi interamente a carico dell'ospite o della famiglia.`,
    },
  ];

  if (stat.conNucleo > 0) {
    domande.push({
      domanda: `Ci sono strutture con nucleo Alzheimer ${luogo}?`,
      risposta: `Sì: ${numero(stat.conNucleo)} ${
        stat.conNucleo === 1 ? "struttura dichiara" : "strutture dichiarano"
      } un nucleo dedicato alle demenze, che nei documenti compare spesso con il nome di «nucleo protetto». Dove il dato non compare significa che il documento non lo dice, non che il nucleo manchi: conviene chiederlo direttamente.`,
    });
  }

  if (stat.topComuni.length > 1) {
    const elenco = stat.topComuni
      .slice(0, 5)
      .map((c) => `${c.nome} (${c.conteggio})`)
      .join(", ");
    domande.push({
      domanda: `In quali comuni si concentrano le ${tipologiaPlurale.toLowerCase()}?`,
      risposta: `I comuni con più strutture censite sono: ${elenco}. Vale però la pena considerare anche i comuni limitrofi: la vicinanza a chi andrà in visita incide sulla frequenza delle visite più di quanto si pensi.`,
    });
  }

  return domande;
}
