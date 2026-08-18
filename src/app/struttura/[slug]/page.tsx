import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvvisoDemo } from "@/components/AvvisoDemo";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JsonLd } from "@/components/JsonLd";
import { percorsi } from "@/lib/percorsi";
import { slugify } from "@/lib/slug";
import { jsonLdStruttura, metadataPagina } from "@/lib/seo";
import { getSlugStrutture, getStrutturaBySlug } from "@/lib/strutture";
import { TIPOLOGIE } from "@/lib/tipologie";

type Parametri = { slug: string };

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Parametri[]> {
  const slug = await getSlugStrutture();
  return slug.map((valore) => ({ slug: valore }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametri>;
}): Promise<Metadata> {
  const { slug } = await params;
  const struttura = await getStrutturaBySlug(slug);
  if (!struttura) return {};

  const info = TIPOLOGIE[struttura.tipologia];

  return metadataPagina({
    titolo: `${struttura.nome} — ${info.singolare} a ${struttura.comune} (${struttura.provincia_sigla})`,
    descrizione: `${struttura.nome}: ${info.singolare} a ${struttura.comune}, ${struttura.indirizzo}. Contatti, posti letto, convenzione e rette indicative.`,
    percorso: percorsi.struttura(struttura.slug),
  });
}

export default async function PaginaStruttura({
  params,
}: {
  params: Promise<Parametri>;
}) {
  const { slug } = await params;
  const struttura = await getStrutturaBySlug(slug);
  if (!struttura) notFound();

  const info = TIPOLOGIE[struttura.tipologia];
  const regione = slugify(struttura.regione);
  const provincia = slugify(struttura.provincia);
  const comune = slugify(struttura.comune);
  const percorsoComune = percorsi.comune(info.slug, regione, provincia, comune);

  return (
    <div className="space-y-8">
      <JsonLd dati={jsonLdStruttura(struttura)} />

      <Breadcrumb
        voci={[
          { nome: "Home", percorso: percorsi.home() },
          { nome: info.plurale, percorso: percorsi.tipologia(info.slug) },
          { nome: struttura.regione, percorso: percorsi.regione(info.slug, regione) },
          {
            nome: struttura.provincia,
            percorso: percorsi.provincia(info.slug, regione, provincia),
          },
          { nome: struttura.comune, percorso: percorsoComune },
          { nome: struttura.nome, percorso: percorsi.struttura(struttura.slug) },
        ]}
      />

      {struttura.fonte_dati === "demo" && <AvvisoDemo />}

      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
          {info.singolare}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{struttura.nome}</h1>
        <p className="mt-2 text-slate-700">
          {struttura.indirizzo}, {struttura.cap} {struttura.comune} (
          {struttura.provincia_sigla}) — {struttura.regione}
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Descrizione</h2>
        <p className="mt-3 max-w-3xl text-slate-700">{struttura.descrizione}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Servizi e caratteristiche</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <dt className="text-sm text-slate-500">Posti letto</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {struttura.posti_letto ?? "Non disponibile"}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <dt className="text-sm text-slate-500">Convenzionata</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {struttura.convenzionata ? "Sì" : "No"}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <dt className="text-sm text-slate-500">Nucleo Alzheimer</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {struttura.nucleo_alzheimer ? "Sì" : "No"}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <dt className="text-sm text-slate-500">Retta indicativa</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {struttura.prezzo_min !== null && struttura.prezzo_max !== null
                ? `${struttura.prezzo_min}-${struttura.prezzo_max} €`
                : "Non disponibile"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Contatti</h2>
        <ul className="mt-3 space-y-2 text-slate-700">
          <li>Telefono: {struttura.telefono ?? "non disponibile"}</li>
          <li>Email: {struttura.email ?? "non disponibile"}</li>
          <li>
            Sito web:{" "}
            {struttura.sito_web ? (
              <a
                href={struttura.sito_web}
                className="text-teal-700 underline"
                rel="nofollow noopener"
                target="_blank"
              >
                {struttura.sito_web}
              </a>
            ) : (
              "non disponibile"
            )}
          </li>
        </ul>
      </section>

      <p className="text-sm text-slate-600">
        <Link href={percorsoComune} className="text-teal-700 hover:underline">
          Vedi {info.tutti} {info.pluraleInFrase} a {struttura.comune}
        </Link>
      </p>
    </div>
  );
}
