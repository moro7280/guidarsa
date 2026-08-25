import type { Struttura } from "@/lib/types";

/**
 * Rimando al portale regionale per i dati che cambiano ogni giorno.
 *
 * I posti liberi li abbiamo deliberatamente lasciati fuori dal database: una
 * pagina statica che dice "3 posti disponibili" mentre non ce ne sono piu fa
 * perdere tempo a una famiglia in un momento difficile. Il portale della
 * Regione quel dato lo tiene aggiornato, quindi la cosa utile e mandarcele.
 *
 * Il portale non ha un indirizzo per singola struttura — l'applicazione non
 * legge parametri dall'URL — quindi il link porta alla ricerca e il testo dice
 * cosa cercare una volta arrivati.
 */

const PORTALI: Record<string, { nome: string; url: string; regione: string }> = {
  portale_rsa_toscana: {
    nome: "Portale RSA di Regione Toscana",
    url: "https://servizi.toscana.it/RT/RSA/",
    regione: "Toscana",
  },
};

export function DisponibilitaPortale({ struttura }: { struttura: Struttura }) {
  const portale = PORTALI[struttura.fonte_dati ?? ""];
  if (!portale) return null;

  return (
    <section className="rounded-lg border border-bordo bg-superficie p-5">
      <h2 className="font-serif text-xl font-semibold">Posti disponibili oggi</h2>
      <p className="mt-2 max-w-2xl text-[0.97rem] leading-relaxed text-inchiostro-medio">
        La disponibilità cambia di settimana in settimana e noi non la pubblichiamo, per non
        mostrarti un dato vecchio. La Regione {portale.regione} la tiene aggiornata sul proprio
        portale, struttura per struttura.
      </p>
      <p className="mt-4">
        <a
          href={portale.url}
          className="inline-flex items-center justify-center rounded-md border border-bordo px-5 py-3 font-semibold text-inchiostro transition-colors hover:border-verde hover:text-verde"
          rel="nofollow noopener"
          target="_blank"
        >
          Verifica la disponibilità aggiornata sul portale della Regione {portale.regione}
        </a>
      </p>
      <p className="mt-2 text-sm text-inchiostro-tenue">
        Sul portale scegli il comune di {struttura.comune}: {struttura.nome} compare nell&apos;elenco
        con i posti liberi del momento.
      </p>
    </section>
  );
}
