import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BloccoGuidaScaricabile } from "@/components/BloccoGuidaScaricabile";
import { conversioneAttiva } from "@/lib/conversione";
import { GUIDE } from "@/lib/guide";
import { percorsi } from "@/lib/percorsi";

/**
 * Pagina di conferma. Fuori dall'indice: non ha valore per chi cerca, e
 * indicizzarla significherebbe farla comparire a chi non ha inviato nulla.
 */
export const metadata: Metadata = {
  title: "Richiesta inviata",
  robots: { index: false, follow: false },
};

export default function PaginaGrazie() {
  if (!conversioneAttiva()) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-[1.9rem] font-semibold leading-tight sm:text-[2.3rem]">
          Richiesta ricevuta
        </h1>
        <p className="text-lg text-inchiostro-medio">
          Grazie. Abbiamo registrato la tua richiesta e ti ricontattiamo noi.
        </p>
      </header>

      <section className="rounded-lg border border-bordo bg-superficie p-5">
        <h2 className="font-serif text-xl font-semibold">Cosa succede adesso</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {[
            {
              titolo: "Ti scriviamo o ti chiamiamo noi",
              testo:
                "Di solito entro due giorni lavorativi. Se hai lasciato solo l'email, la risposta arriva lì: controlla anche la posta indesiderata.",
            },
            {
              titolo: "Ti proponiamo le strutture che corrispondono",
              testo:
                "In base a zona, tipo di assistenza e budget che ci hai indicato. Se in quella zona non c'è nulla di adatto, te lo diciamo: non ti mandiamo altrove per riempire un elenco.",
            },
            {
              titolo: "Contatti tu la struttura, quando vuoi",
              testo:
                "I recapiti sono già sul sito e restano tuoi. Condividiamo i tuoi dati con una struttura solo se ci hai dato il consenso apposito.",
            },
          ].map((passo, indice) => (
            <li key={passo.titolo} className="flex gap-3">
              <span className="numeri shrink-0 font-serif text-lg font-semibold text-verde">
                {indice + 1}.
              </span>
              <div>
                <h3 className="font-semibold">{passo.titolo}</h3>
                <p className="mt-0.5 text-[0.97rem] leading-relaxed text-inchiostro-medio">
                  {passo.testo}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <BloccoGuidaScaricabile />

      <section>
        <h2 className="font-serif text-xl font-semibold">Nel frattempo</h2>
        <p className="mt-2 text-[0.98rem] text-inchiostro-medio">
          Queste tre guide rispondono alle domande che tornano più spesso mentre si aspetta.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {GUIDE.map((guida) => (
            <li key={guida.slug}>
              <Link
                href={percorsi.guida(guida.slug)}
                className="block rounded-lg border border-bordo bg-superficie p-4 transition-colors hover:border-verde"
              >
                <span className="font-serif text-lg font-semibold">{guida.titolo}</span>
                <span className="mt-1 block text-[0.95rem] text-inchiostro-medio">
                  {guida.descrizione}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[0.95rem] text-inchiostro-tenue">
        Hai cambiato idea? Scrivi a{" "}
        <a href="mailto:info@guidarsa.it" className="text-verde underline underline-offset-4">
          info@guidarsa.it
        </a>{" "}
        e cancelliamo la richiesta e i tuoi dati.
      </p>
    </div>
  );
}
