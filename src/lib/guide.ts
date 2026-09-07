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
    slug: "come-leggere-una-scheda",
    titolo: "Come leggere una scheda: da dove vengono i dati e cosa significano",
    descrizione:
      "Accreditata, convenzionata, nucleo protetto, retta indicativa: cosa vuol dire ogni voce di una scheda, da dove viene il dato e perché alcune schede ne hanno meno.",
    pubblicataIl: "2026-09-07",
    aggiornataIl: "2026-09-07",
    paragrafi: [
      {
        titolo: "Da dove vengono i dati",
        testo:
          "Partiamo dagli elenchi pubblici delle Regioni: sono i registri di autorizzazione e accreditamento, gli stessi che usano le aziende sanitarie. Da lì arrivano denominazione, indirizzo, posti letto e, dove la Regione lo dichiara, l'accreditamento. Su quella base cerchiamo il sito ufficiale della struttura e ne leggiamo i recapiti. Non compriamo elenchi e non copiamo da altre directory: ogni scheda dice da quale elenco viene, con il nome della Regione.",
      },
      {
        titolo: "Perché alcune schede hanno meno dati di altre",
        testo:
          "Perché le Regioni pubblicano cose diverse. La Toscana dichiara le tariffe struttura per struttura, la Lombardia no; il Friuli non dichiara l'accreditamento, la Campania non pubblica i recapiti. Dove un dato non ce l'abbiamo lo scriviamo, invece di riempire lo spazio con parole generiche. Una scheda corta e vera è più utile di una lunga e vaga.",
      },
      {
        titolo: "Accreditata, convenzionata: cosa cambia per la retta",
        testo:
          "Una struttura accreditata ha un rapporto con il servizio sanitario regionale: su un posto convenzionato una parte della retta è coperta dalla Regione e alla famiglia resta la quota alberghiera, che chiamiamo quota a carico dell'ospite. I posti convenzionati però sono contingentati e spesso hanno una lista d'attesa: conviene chiedere quanti ne ha quella struttura e quanti sono liberi. Sul posto privato la retta è interamente a carico della famiglia. Le due cifre non sono confrontabili fra loro, e per questo le teniamo sempre separate.",
      },
      {
        titolo: "Quando scriviamo che l'informazione non è disponibile",
        testo:
          "«Informazione non disponibile» non vuol dire «no». Se l'elenco regionale non dichiara l'accreditamento di una struttura, non scriviamo che non è accreditata: scriviamo che il dato non c'è, e va chiesto alla struttura o all'azienda sanitaria. Vale anche per il nucleo dedicato alle demenze, che alcuni elenchi non rilevano affatto.",
      },
      {
        titolo: "Le rette: perché diciamo «indicativa»",
        testo:
          "Pubblichiamo una retta solo quando la struttura la mette per iscritto, nella carta dei servizi o in un elenco regionale, e diciamo sempre da dove viene e di che anno è. Se il documento ha più di due anni la chiamiamo tariffa storica. Dove la fonte dichiara una tariffa al giorno, il valore mensile lo calcoliamo moltiplicando per 30,44 giorni medi e lo dichiariamo: è un conto nostro, non un prezzo della struttura. In ogni caso la cifra va verificata al momento del contatto, perché le rette cambiano e dipendono dal livello di assistenza.",
      },
      {
        titolo: "Unità dello stesso complesso",
        testo:
          "Molte strutture condividono l'indirizzo con altre: sono nuclei distinti dello stesso complesso, con posti letto e a volte tipologie diverse. Quando succede lo scriviamo e le colleghiamo fra loro, così si capisce che cosa si sta guardando. Il fatto che condividano l'indirizzo non significa che siano la stessa struttura: hanno autorizzazioni separate.",
      },
      {
        titolo: "Come segnalare una correzione",
        testo:
          "Se gestisci una struttura e un dato è sbagliato, scrivici: correggiamo citando la fonte. Non chiediamo nulla in cambio e non vendiamo posizioni: la scheda non cambia posto in elenco perché qualcuno paga.",
      },
    ],
  },
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
