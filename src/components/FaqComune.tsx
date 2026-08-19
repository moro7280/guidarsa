import { JsonLd } from "./JsonLd";
import type { Struttura } from "@/lib/types";

/**
 * FAQ generate dai dati reali del comune, con markup FAQPage.
 *
 * Nota di aspettativa: da agosto 2023 Google mostra i rich result FAQ solo a
 * siti governativi e sanitari autorevoli, quindi il markup non ci portera le
 * stelline nei risultati. Resta un dato strutturato corretto, e soprattutto le
 * domande servono davvero a chi legge — che e il motivo per cui ci sono.
 */

function fasciaPrezzi(strutture: Struttura[]): { min: number; max: number; quante: number } | null {
  const prezzi = strutture
    .flatMap((struttura) => [struttura.prezzo_min, struttura.prezzo_max])
    .filter((valore): valore is number => valore !== null && valore !== undefined);
  if (prezzi.length === 0) return null;
  return {
    min: Math.min(...prezzi),
    max: Math.max(...prezzi),
    quante: strutture.filter((struttura) => struttura.prezzo_min !== null).length,
  };
}

export function FaqComune({
  strutture,
  comune,
  tipologiaPlurale,
}: {
  strutture: Struttura[];
  comune: string;
  tipologiaPlurale: string;
}) {
  const convenzionate = strutture.filter((struttura) => struttura.convenzionata).length;
  const conAlzheimer = strutture.filter((struttura) => struttura.nucleo_alzheimer === true).length;
  const postiTotali = strutture.reduce(
    (somma, struttura) => somma + (struttura.posti_letto ?? 0),
    0,
  );
  const prezzi = fasciaPrezzi(strutture);

  const domande: { domanda: string; risposta: string }[] = [
    {
      domanda: `Quante ${tipologiaPlurale} ci sono a ${comune}?`,
      risposta: `A ${comune} risultano ${strutture.length} ${
        strutture.length === 1 ? "struttura censita" : "strutture censite"
      } negli elenchi pubblici regionali${
        postiTotali > 0 ? `, per un totale di ${postiTotali.toLocaleString("it-IT")} posti letto dichiarati` : ""
      }.`,
    },
    {
      domanda: `Quante sono convenzionate con il servizio sanitario?`,
      risposta:
        convenzionate > 0
          ? `${convenzionate} su ${strutture.length}. Nelle strutture convenzionate una parte della retta è coperta dal servizio sanitario regionale, ma i posti convenzionati sono limitati e spesso soggetti a lista d'attesa.`
          : `Nessuna delle strutture censite a ${comune} risulta convenzionata negli elenchi regionali: la retta è quindi interamente a carico dell'ospite o della famiglia.`,
    },
  ];

  domande.push({
    domanda: `Quanto costa una struttura per anziani a ${comune}?`,
    risposta: prezzi
      ? `Le rette che abbiamo documentato a ${comune} vanno da ${prezzi.min.toLocaleString(
          "it-IT",
        )} a ${prezzi.max.toLocaleString("it-IT")} euro al mese, su ${prezzi.quante} ${
          prezzi.quante === 1 ? "struttura" : "strutture"
        }. Sono tariffe prese dalle carte dei servizi pubblicate dalle strutture stesse, indicative e da verificare al momento del contatto.`
      : `Per le strutture di ${comune} non abbiamo ancora una retta documentata: la pubblichiamo solo quando la struttura la rende disponibile nella propria carta dei servizi, senza stimarla.`,
  });

  if (conAlzheimer > 0) {
    domande.push({
      domanda: `Ci sono strutture con un nucleo Alzheimer a ${comune}?`,
      risposta: `Sì: ${conAlzheimer} ${
        conAlzheimer === 1 ? "struttura dichiara" : "strutture dichiarano"
      } un nucleo dedicato alle demenze, spesso chiamato anche nucleo protetto. Dove il dato non compare significa che il documento non lo dice, non che il nucleo manchi.`,
    });
  }

  return (
    <section>
      <JsonLd
        dati={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: domande.map((voce) => ({
            "@type": "Question",
            name: voce.domanda,
            acceptedAnswer: { "@type": "Answer", text: voce.risposta },
          })),
        }}
      />

      <h2 className="font-serif text-xl font-semibold">Domande frequenti</h2>
      <div className="mt-4 divide-y divide-bordo overflow-hidden rounded-lg border border-bordo bg-superficie">
        {domande.map((voce) => (
          <details key={voce.domanda} className="group">
            <summary className="cursor-pointer list-none px-5 py-4 font-medium text-inchiostro marker:content-none hover:text-verde">
              <span className="flex items-start justify-between gap-4">
                {voce.domanda}
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-inchiostro-tenue transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </span>
            </summary>
            <p className="px-5 pb-4 leading-relaxed text-inchiostro-medio">{voce.risposta}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
