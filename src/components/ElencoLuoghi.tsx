import Link from "next/link";
import type { NodoGeografico } from "@/lib/types";

/** Griglia di link verso il livello geografico successivo (regioni, province, comuni). */
export function ElencoLuoghi({
  nodi,
  href,
}: {
  nodi: NodoGeografico[];
  href: (nodo: NodoGeografico) => string;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {nodi.map((nodo) => (
        <li key={nodo.slug}>
          <Link
            href={href(nodo)}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-teal-300 hover:bg-teal-50"
          >
            <span className="font-medium text-slate-900">{nodo.nome}</span>
            <span className="text-sm text-slate-500">
              {nodo.conteggio} {nodo.conteggio === 1 ? "struttura" : "strutture"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
