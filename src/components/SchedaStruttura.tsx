import Link from "next/link";
import { percorsi } from "@/lib/percorsi";
import type { Struttura } from "@/lib/types";

/**
 * Card usata nelle pagine lista.
 *
 * Le informazioni sono ordinate come le cerca una famiglia: dove si trova,
 * quanto costa, se e convenzionata, se ha un nucleo per le demenze, quanto e
 * grande. Gli attributi sono etichette e non icone: a colpo d'occhio si legge
 * la parola, non si decifra un simbolo.
 */

function fasciaPrezzo(struttura: Struttura): string | null {
  const { prezzo_min: min, prezzo_max: max } = struttura;
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) {
    return `${min.toLocaleString("it-IT")}-${max.toLocaleString("it-IT")} € al mese`;
  }
  return `${((min ?? max) as number).toLocaleString("it-IT")} € al mese`;
}

export function SchedaStruttura({ struttura }: { struttura: Struttura }) {
  const prezzo = fasciaPrezzo(struttura);
  const regimeNonNoto = struttura.retta_regime === "non_specificato";

  return (
    <article className="rounded-lg border border-bordo bg-superficie p-5 transition-colors hover:border-verde">
      <h3 className="font-serif text-xl font-semibold leading-snug">
        <Link
          href={percorsi.struttura(struttura.slug)}
          className="text-inchiostro underline-offset-4 hover:text-verde hover:underline"
        >
          {struttura.nome}
        </Link>
      </h3>

      <p className="mt-1.5 text-[0.95rem] text-inchiostro-tenue">
        {struttura.indirizzo ? `${struttura.indirizzo}, ` : ""}
        {struttura.cap} {struttura.comune} ({struttura.provincia_sigla})
      </p>

      <ul className="mt-3.5 flex flex-wrap gap-2 text-sm">
        {struttura.convenzionata && (
          <li className="rounded border border-verde-tenue bg-verde-tenue px-2.5 py-1 font-medium text-verde">
            Convenzionata
          </li>
        )}
        {struttura.nucleo_alzheimer === true && (
          <li className="rounded border border-indaco-tenue bg-indaco-tenue px-2.5 py-1 font-medium text-indaco">
            Nucleo Alzheimer
          </li>
        )}
        {struttura.posti_letto !== null && (
          <li className="numeri rounded border border-bordo-tenue bg-carta px-2.5 py-1 text-inchiostro-medio">
            {struttura.posti_letto} posti letto
          </li>
        )}
        {prezzo && (
          <li className="numeri rounded border border-sabbia bg-sabbia-tenue px-2.5 py-1 font-medium text-inchiostro">
            {prezzo}
            {regimeNonNoto ? " (regime non specificato)" : ""}
          </li>
        )}
      </ul>

      {(struttura.telefono || struttura.sito_web) && (
        <p className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.95rem]">
          {struttura.telefono && (
            <a
              href={`tel:${struttura.telefono.replace(/\s/g, "")}`}
              className="numeri font-medium text-verde underline-offset-4 hover:underline"
            >
              {struttura.telefono}
            </a>
          )}
          {struttura.sito_web && (
            <a
              href={struttura.sito_web}
              className="text-inchiostro-medio underline underline-offset-4 hover:text-verde"
              rel="nofollow noopener"
              target="_blank"
            >
              Sito della struttura
            </a>
          )}
        </p>
      )}
    </article>
  );
}
