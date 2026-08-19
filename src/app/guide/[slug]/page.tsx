import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JsonLd } from "@/components/JsonLd";
import { GUIDE, getGuida } from "@/lib/guide";
import { percorsi } from "@/lib/percorsi";
import { jsonLdGuida, metadataPagina } from "@/lib/seo";

type Parametri = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Parametri[] {
  return GUIDE.map((guida) => ({ slug: guida.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametri>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guida = getGuida(slug);
  if (!guida) return {};

  return metadataPagina({
    titolo: guida.titolo,
    descrizione: guida.descrizione,
    percorso: percorsi.guida(guida.slug),
  });
}

export default async function PaginaGuida({
  params,
}: {
  params: Promise<Parametri>;
}) {
  const { slug } = await params;
  const guida = getGuida(slug);
  if (!guida) notFound();

  return (
    <article className="space-y-8">
      <JsonLd dati={jsonLdGuida(guida)} />

      <Breadcrumb
        voci={[
          { nome: "Home", percorso: percorsi.home() },
          { nome: "Guide", percorso: percorsi.guide() },
          { nome: guida.titolo, percorso: percorsi.guida(guida.slug) },
        ]}
      />

      <header>
        <h1 className="text-3xl font-semibold text-inchiostro">{guida.titolo}</h1>
        <p className="mt-3 max-w-3xl text-inchiostro-medio">{guida.descrizione}</p>
        <p className="mt-2 text-sm text-inchiostro-tenue">
          Aggiornata il{" "}
          {new Date(guida.aggiornataIl).toLocaleDateString("it-IT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      <div className="space-y-6">
        {guida.paragrafi.map((paragrafo) => (
          <section key={paragrafo.titolo}>
            <h2 className="text-xl font-semibold text-inchiostro">{paragrafo.titolo}</h2>
            <p className="mt-2 max-w-3xl text-inchiostro-medio">{paragrafo.testo}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
