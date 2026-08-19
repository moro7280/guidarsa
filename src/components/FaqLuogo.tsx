import { JsonLd } from "./JsonLd";

export interface Domanda {
  domanda: string;
  risposta: string;
}

/**
 * FAQ con markup FAQPage, condivisa da comuni, province e regioni.
 *
 * Aspettativa da tenere onesta: dal 2023 Google riserva i rich result FAQ ai
 * siti governativi e sanitari autorevoli, quindi il markup non porta le
 * stelline nei risultati. Restano dati strutturati corretti e, soprattutto,
 * risposte che servono a chi legge — che e il motivo per cui ci sono.
 *
 * L'apertura usa <details>: nessun JavaScript, funziona anche mentre la pagina
 * si sta ancora caricando, e il testo resta nel DOM per i motori di ricerca.
 */
export function FaqLuogo({ domande, titolo = "Domande frequenti" }: { domande: Domanda[]; titolo?: string }) {
  if (domande.length === 0) return null;

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

      <h2 className="font-serif text-xl font-semibold">{titolo}</h2>
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
