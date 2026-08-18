import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { jsonLdBreadcrumb, type VoceBreadcrumb } from "@/lib/seo";

/** Breadcrumb visibile + BreadcrumbList JSON-LD, sempre in coppia. */
export function Breadcrumb({ voci }: { voci: VoceBreadcrumb[] }) {
  return (
    <>
      <JsonLd dati={jsonLdBreadcrumb(voci)} />
      <nav aria-label="Percorso di navigazione" className="text-sm text-slate-600">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {voci.map((voce, indice) => {
            const ultima = indice === voci.length - 1;
            return (
              <li key={voce.percorso} className="flex items-center gap-2">
                {ultima ? (
                  <span aria-current="page" className="text-slate-900">
                    {voce.nome}
                  </span>
                ) : (
                  <Link href={voce.percorso} className="hover:text-teal-700 hover:underline">
                    {voce.nome}
                  </Link>
                )}
                {!ultima && <span aria-hidden="true">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
