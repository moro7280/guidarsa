import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { GUIDE } from "@/lib/guide";
import { percorsi } from "@/lib/percorsi";
import { metadataPagina } from "@/lib/seo";

export const metadata: Metadata = metadataPagina({
  titolo: "Guide per le famiglie: scegliere una struttura per anziani",
  descrizione:
    "Come scegliere una RSA, quanto costa, quali agevolazioni esistono e come orientarsi tra residenza, centro diurno e assistenza domiciliare.",
  percorso: percorsi.guide(),
});

export default function PaginaGuide() {
  return (
    <div className="space-y-8">
      <Breadcrumb
        voci={[
          { nome: "Home", percorso: percorsi.home() },
          { nome: "Guide", percorso: percorsi.guide() },
        ]}
      />

      <header>
        <h1 className="text-3xl font-semibold text-inchiostro">Guide per le famiglie</h1>
        <p className="mt-3 max-w-3xl text-inchiostro-medio">
          Le informazioni essenziali per accompagnare un familiare anziano nella scelta della
          struttura o del servizio più adatto.
        </p>
      </header>

      <ul className="space-y-4">
        {GUIDE.map((guida) => (
          <li key={guida.slug}>
            <Link
              href={percorsi.guida(guida.slug)}
              className="block rounded-lg border border-bordo bg-superficie p-5 transition hover:border-verde hover:bg-verde-tenue"
            >
              <h2 className="text-lg font-semibold text-inchiostro">{guida.titolo}</h2>
              <p className="mt-2 text-sm text-inchiostro-medio">{guida.descrizione}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
