/**
 * Guide informative per le famiglie caregiver.
 *
 * TODO(contenuti): i testi definitivi saranno file MDX in /content/guide,
 * caricati qui al posto di questo array. Le pagine non dovranno cambiare.
 */
export interface Guida {
  slug: string;
  titolo: string;
  descrizione: string;
  pubblicataIl: string;
  aggiornataIl: string;
  paragrafi: { titolo: string; testo: string }[];
}

export const GUIDE: Guida[] = [
  {
    slug: "come-scegliere-una-rsa",
    titolo: "Come scegliere una RSA: la guida per le famiglie",
    descrizione:
      "I criteri da valutare prima di scegliere una residenza sanitaria assistenziale: accreditamento, personale, rette, visite e qualità della vita.",
    pubblicataIl: "2026-06-10",
    aggiornataIl: "2026-08-01",
    paragrafi: [
      {
        titolo: "Quando la RSA è la scelta giusta",
        testo:
          "La RSA è indicata quando l'anziano non è più autosufficiente e ha bisogno di assistenza sanitaria continuativa, difficile da garantire a domicilio. Prima di decidere vale la pena confrontare l'ipotesi residenziale con il centro diurno e con l'assistenza domiciliare.",
      },
      {
        titolo: "Cosa verificare durante la visita",
        testo:
          "Chiedete il rapporto tra operatori e ospiti, la presenza di un nucleo dedicato alle demenze, gli orari di visita dei familiari, il piano di assistenza individuale e cosa è incluso nella retta. Una visita non annunciata dice più di qualsiasi brochure.",
      },
      {
        titolo: "Accreditamento e convenzione",
        testo:
          "Una struttura accreditata e convenzionata con il servizio sanitario regionale applica rette calmierate, con una quota sanitaria a carico della Regione. I posti convenzionati sono però limitati e spesso soggetti a lista d'attesa.",
      },
    ],
  },
  {
    slug: "quanto-costa-una-rsa",
    titolo: "Quanto costa una RSA in Italia",
    descrizione:
      "Rette medie, differenza tra quota sanitaria e quota alberghiera, agevolazioni fiscali e contributi disponibili per le famiglie.",
    pubblicataIl: "2026-06-24",
    aggiornataIl: "2026-08-01",
    paragrafi: [
      {
        titolo: "Come è composta la retta",
        testo:
          "La retta si divide in quota sanitaria, a carico del servizio sanitario regionale nelle strutture convenzionate, e quota alberghiera, a carico dell'ospite o della famiglia. Nelle strutture private l'intera retta è a carico della famiglia.",
      },
      {
        titolo: "Differenze territoriali",
        testo:
          "I costi variano molto da regione a regione e tra grandi città e centri minori. Confrontate sempre più preventivi nello stesso territorio e chiedete quali servizi sono esclusi dalla retta base.",
      },
      {
        titolo: "Detrazioni e contributi",
        testo:
          "Una parte delle spese sanitarie sostenute in RSA è detraibile nella dichiarazione dei redditi. Alcuni comuni e regioni prevedono contributi legati all'ISEE: informatevi presso i servizi sociali del comune di residenza.",
      },
    ],
  },
  {
    slug: "rsa-o-assistenza-domiciliare",
    titolo: "RSA o assistenza domiciliare: come decidere",
    descrizione:
      "Un confronto pratico tra residenza, centro diurno e assistenza a casa, in base al livello di autonomia dell'anziano e alla rete familiare disponibile.",
    pubblicataIl: "2026-07-08",
    aggiornataIl: "2026-08-01",
    paragrafi: [
      {
        titolo: "Partire dal livello di autonomia",
        testo:
          "Se l'anziano è parzialmente autosufficiente e la casa è adeguata, l'assistenza domiciliare permette di mantenere abitudini e relazioni. Quando i bisogni sanitari diventano continuativi, la struttura residenziale offre una copertura che a casa è difficile replicare.",
      },
      {
        titolo: "La soluzione intermedia: il centro diurno",
        testo:
          "Il centro diurno accoglie l'anziano durante il giorno e lo riporta a casa la sera. È spesso la scelta migliore quando la famiglia lavora ma vuole evitare l'ingresso in struttura.",
      },
      {
        titolo: "Il carico sui familiari",
        testo:
          "La sostenibilità nel tempo del caregiver familiare va messa nel conto quanto il bisogno clinico: una scelta che regge sei mesi ma esaurisce la famiglia non è una buona scelta.",
      },
    ],
  },
];

export function getGuida(slug: string): Guida | null {
  return GUIDE.find((guida) => guida.slug === slug) ?? null;
}
