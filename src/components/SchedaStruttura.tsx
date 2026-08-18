import Link from "next/link";
import { percorsi } from "@/lib/percorsi";
import type { Struttura } from "@/lib/types";

function formattaPrezzo(struttura: Struttura): string | null {
  if (struttura.prezzo_min === null || struttura.prezzo_max === null) return null;
  const unita = struttura.tipologia === "rsa" || struttura.tipologia === "casa-di-riposo";
  return unita
    ? `${struttura.prezzo_min}-${struttura.prezzo_max} € / mese`
    : `${struttura.prezzo_min}-${struttura.prezzo_max} € / giorno`;
}

/** Card usata nelle pagine lista dei comuni. */
export function SchedaStruttura({ struttura }: { struttura: Struttura }) {
  const prezzo = formattaPrezzo(struttura);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">
        <Link href={percorsi.struttura(struttura.slug)} className="hover:text-teal-700">
          {struttura.nome}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        {struttura.indirizzo}, {struttura.cap} {struttura.comune} ({struttura.provincia_sigla})
      </p>
      <p className="mt-3 text-sm text-slate-700">{struttura.descrizione}</p>

      <ul className="mt-4 flex flex-wrap gap-2 text-xs">
        {struttura.convenzionata && (
          <li className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">Convenzionata</li>
        )}
        {struttura.nucleo_alzheimer && (
          <li className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Nucleo Alzheimer</li>
        )}
        {struttura.posti_letto !== null && (
          <li className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {struttura.posti_letto} posti letto
          </li>
        )}
        {prezzo && (
          <li className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{prezzo}</li>
        )}
      </ul>
    </article>
  );
}
