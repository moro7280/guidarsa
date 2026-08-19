/**
 * Strato di conversione: wizard, CTA, consensi.
 *
 * Tutto passa da qui perche tutto e dietro un interruttore: finche
 * NEXT_PUBLIC_CONVERSIONE_ATTIVA non vale "1", le CTA non vengono rese e
 * /richiedi-informazioni/ risponde 404. Il codice puo stare in produzione
 * spento, in attesa che l'informativa privacy sia rivista da un professionista:
 * raccogliere dati personali con un'informativa incompleta e una violazione,
 * non un dettaglio da sistemare dopo.
 */
export function conversioneAttiva(): boolean {
  return process.env.NEXT_PUBLIC_CONVERSIONE_ATTIVA === "1";
}

/**
 * Versione dell'informativa accettata, salvata su ogni lead.
 * Va cambiata ogni volta che il testo del consenso cambia: e cio che permette,
 * fra due anni, di sapere a cosa esattamente una persona aveva detto sì.
 */
export const VERSIONE_INFORMATIVA = "informativa-2026-08-19";

export const TESTO_CONSENSO_CONTATTO =
  "Acconsento al trattamento dei miei dati di contatto da parte di GuidaRSA per essere ricontattato in merito alla mia richiesta.";

export const TESTO_CONSENSO_CONDIVISIONE =
  "Acconsento alla condivisione dei miei dati di contatto con le strutture pertinenti alla mia richiesta, quando il servizio sarà attivo.";

export interface Opzione {
  valore: string;
  etichetta: string;
  aiuto?: string;
}

export const RELAZIONI: Opzione[] = [
  { valore: "genitore", etichetta: "Per un genitore" },
  { valore: "coniuge", etichetta: "Per mio marito o mia moglie" },
  { valore: "altro_familiare", etichetta: "Per un altro familiare" },
  { valore: "me_stesso", etichetta: "Per me stesso" },
];

/**
 * Servizio cercato, non condizione clinica: sono opzioni di servizio, e
 * qualificano la richiesta senza raccogliere un dato sanitario.
 */
export const TIPI_ASSISTENZA: Opzione[] = [
  {
    valore: "continuativa",
    etichetta: "Assistenza continuativa, giorno e notte",
    aiuto: "È il servizio tipico di una RSA.",
  },
  {
    valore: "supporto_quotidiano",
    etichetta: "Supporto quotidiano, ma con margini di autonomia",
    aiuto: "Di solito una casa di riposo o una residenza assistita.",
  },
  {
    valore: "solo_giorno",
    etichetta: "Solo durante il giorno",
    aiuto: "Il centro diurno accoglie la persona di giorno e la riporta a casa.",
  },
  {
    valore: "non_so",
    etichetta: "Non lo so ancora",
    aiuto: "Va benissimo: serve proprio a orientarsi.",
  },
];

export const URGENZE: Opzione[] = [
  { valore: "subito", etichetta: "Il prima possibile" },
  { valore: "entro_un_mese", etichetta: "Entro un mese" },
  { valore: "entro_tre_mesi", etichetta: "Nei prossimi tre mesi" },
  { valore: "mi_informo", etichetta: "Mi sto solo informando" },
];

export const BUDGET: Opzione[] = [
  { valore: "fino_1500", etichetta: "Fino a 1.500 € al mese" },
  { valore: "1500_2500", etichetta: "Tra 1.500 e 2.500 € al mese" },
  { valore: "2500_3500", etichetta: "Tra 2.500 e 3.500 € al mese" },
  { valore: "oltre_3500", etichetta: "Oltre 3.500 € al mese" },
  { valore: "non_so", etichetta: "Non so ancora, dipende dai servizi" },
];

/** Risorsa scaricabile: la guida in sette passi. */
export const RISORSA_GUIDA = "guida-7-passi";

export const TESTO_CONSENSO_ISCRIZIONE =
  "Acconsento al trattamento della mia email da parte di GuidaRSA per ricevere la guida e, occasionalmente, aggiornamenti sulle strutture per anziani. Posso disiscrivermi in qualsiasi momento.";
