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
    <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {nodi.map((nodo) => (
        <li key={nodo.slug}>
          <Link
            href={href(nodo)}
            className="flex items-baseline justify-between gap-3 rounded-md border border-bordo bg-superficie px-4 py-3 transition-colors hover:border-verde"
          >
            <span className="font-medium text-inchiostro">{nodo.nome}</span>
            <span className="numeri shrink-0 text-sm text-inchiostro-tenue">
              {nodo.conteggio}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
