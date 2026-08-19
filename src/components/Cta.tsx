import Link from "next/link";
import { conversioneAttiva } from "@/lib/conversione";

/**
 * Punti di ingresso alla richiesta informazioni.
 *
 * Tutti passano da `conversioneAttiva()`: con l'interruttore spento non viene
 * reso nulla, cosi il codice puo stare in produzione prima che l'informativa
 * privacy sia stata rivista.
 */

function percorsoRichiesta(struttura?: string, comune?: string): string {
  const parametri = new URLSearchParams();
  if (struttura) parametri.set("struttura", struttura);
  if (comune) parametri.set("comune", comune);
  const query = parametri.toString();
  return `/richiedi-informazioni/${query ? `?${query}` : ""}`;
}

/** CTA principale, per hero e blocchi di chiusura. */
export function CtaPrimaria({
  testo = "Trova la struttura giusta",
  comune,
  className = "",
}: {
  testo?: string;
  comune?: string;
  className?: string;
}) {
  if (!conversioneAttiva()) return null;
  return (
    <Link
      href={percorsoRichiesta(undefined, comune)}
      className={`inline-flex items-center justify-center rounded-md bg-verde px-6 py-3.5 text-lg font-semibold text-carta transition-colors hover:bg-verde-scuro ${className}`}
    >
      {testo}
    </Link>
  );
}

/** CTA secondaria da card e scheda struttura. */
export function CtaStruttura({ slug, compatta = false }: { slug: string; compatta?: boolean }) {
  if (!conversioneAttiva()) return null;
  return (
    <Link
      href={percorsoRichiesta(slug)}
      className={
        compatta
          ? "inline-flex items-center justify-center rounded-md border border-verde px-4 py-2 text-[0.95rem] font-semibold text-verde transition-colors hover:bg-verde-tenue"
          : "inline-flex items-center justify-center rounded-md bg-verde px-5 py-3 font-semibold text-carta transition-colors hover:bg-verde-scuro"
      }
    >
      Richiedi informazioni
    </Link>
  );
}

/**
 * Barra fissa in basso, solo su schermi piccoli.
 * Il padding compensativo sul contenuto sta in `PadPerBarra`, altrimenti la
 * barra coprirebbe le ultime righe della pagina e il footer.
 */
export function BarraMobile({ slug, comune }: { slug?: string; comune?: string }) {
  if (!conversioneAttiva()) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-bordo bg-superficie/95 p-3 backdrop-blur sm:hidden">
      <Link
        href={percorsoRichiesta(slug, comune)}
        className="flex w-full items-center justify-center rounded-md bg-verde px-5 py-3 font-semibold text-carta"
      >
        Richiedi informazioni
      </Link>
    </div>
  );
}

/** Spazio in fondo alla pagina quando la barra fissa e presente. */
export function PadPerBarra() {
  if (!conversioneAttiva()) return null;
  return <div aria-hidden="true" className="h-20 sm:hidden" />;
}

/** Blocco di chiusura per le guide. */
export function BloccoCta({ comune }: { comune?: string }) {
  if (!conversioneAttiva()) return null;
  return (
    <section className="rounded-lg border border-verde/25 bg-verde-tenue p-6">
      <h2 className="font-serif text-xl font-semibold text-inchiostro">
        Vuoi un aiuto a restringere la ricerca?
      </h2>
      <p className="mt-2 max-w-2xl text-[0.98rem] leading-relaxed text-inchiostro-medio">
        Cinque domande, due minuti: zona, tipo di assistenza, tempi e budget. Il servizio è
        gratuito per le famiglie, e rette e contatti restano visibili sul sito senza compilare
        nulla.
      </p>
      <div className="mt-4">
        <CtaPrimaria testo="Inizia la richiesta" comune={comune} />
      </div>
    </section>
  );
}
