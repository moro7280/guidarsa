import type { Metadata } from "next";
import { numero } from "@/lib/formato";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttribuzioneOsm } from "@/components/AttribuzioneOsm";
import { BloccoRette } from "@/components/BloccoRette";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BarraMobile, CtaStruttura, PadPerBarra } from "@/components/Cta";
import { DisponibilitaPortale } from "@/components/DisponibilitaPortale";
import { JsonLd } from "@/components/JsonLd";
import { indicizzabile } from "@/lib/completezza";
import { percorsi } from "@/lib/percorsi";
import { jsonLdStruttura, metadataPagina } from "@/lib/seo";
import { slugify } from "@/lib/slug";
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
    // Sotto la soglia di completezza la scheda resta online ma fuori
    // dall indice: una pagina povera che si posiziona danneggia il dominio.
    indicizzabile: indicizzabile(struttura),
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
  const telefonoPulito = struttura.telefono?.replace(/\s/g, "");

  return (
    <div className="flex flex-col gap-9">
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

      <header className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.09em] text-verde">
          {info.singolare}
        </p>
        <h1 className="text-[1.95rem] font-semibold leading-[1.15] sm:text-4xl">
          {struttura.nome}
        </h1>
        <p className="text-lg text-inchiostro-medio">
          {struttura.indirizzo ? `${struttura.indirizzo}, ` : ""}
          {struttura.cap} {struttura.comune} ({struttura.provincia_sigla})
        </p>

        <ul className="mt-1 flex flex-wrap gap-2 text-sm">
          <li
            className={`rounded px-2.5 py-1 font-medium ${
              struttura.convenzionata === true
                ? "bg-verde-tenue text-verde"
                : "bg-carta text-inchiostro-medio"
            }`}
          >
            {/* null = la fonte non dichiara l accreditamento: non e un no. */}
            {struttura.convenzionata === null
              ? "Accreditamento non dichiarato"
              : struttura.convenzionata
                ? "Convenzionata"
                : "Non convenzionata"}
          </li>
          {struttura.nucleo_alzheimer === true && (
            <li className="rounded bg-indaco-tenue px-2.5 py-1 font-medium text-indaco">
              Nucleo Alzheimer
            </li>
          )}
          {struttura.posti_letto !== null && (
            <li className="numeri rounded bg-carta px-2.5 py-1 text-inchiostro-medio">
              {struttura.posti_letto} posti letto
            </li>
          )}
        </ul>
      </header>

      <section className="rounded-lg border border-bordo bg-superficie p-5">
        <h2 className="font-serif text-xl font-semibold">Contatti</h2>

        {telefonoPulito || struttura.email || struttura.sito_web ? (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              {telefonoPulito && (
                <a
                  href={`tel:${telefonoPulito}`}
                  className="numeri inline-flex items-center justify-center rounded-md bg-verde px-5 py-3 font-semibold text-carta transition-colors hover:bg-verde-scuro"
                >
                  Chiama {struttura.telefono}
                </a>
              )}
              {struttura.sito_web && (
                <a
                  href={struttura.sito_web}
                  className="inline-flex items-center justify-center rounded-md border border-bordo px-5 py-3 font-semibold text-inchiostro transition-colors hover:border-verde hover:text-verde"
                  rel="nofollow noopener"
                  target="_blank"
                >
                  Sito della struttura
                </a>
              )}
            </div>
            {struttura.email && (
              <p className="mt-3 text-[0.98rem] text-inchiostro-medio">
                Email:{" "}
                <a
                  href={`mailto:${struttura.email}`}
                  className="text-verde underline underline-offset-4"
                >
                  {struttura.email}
                </a>
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-[0.98rem] text-inchiostro-medio">
            Non abbiamo ancora un recapito verificato per questa struttura. Il comune di{" "}
            {struttura.comune} o l&apos;ATS di riferimento possono indicartelo.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-verde/25 bg-verde-tenue p-5">
        <h2 className="font-serif text-xl font-semibold">Non sai se è la struttura giusta?</h2>
        <p className="mt-2 max-w-2xl text-[0.97rem] leading-relaxed text-inchiostro-medio">
          Rispondi a cinque domande e ti aiutiamo a confrontarla con le altre della zona. Gratuito
          per le famiglie: i contatti qui sopra restano comunque a tua disposizione.
        </p>
        <div className="mt-4">
          <CtaStruttura slug={struttura.slug} />
        </div>
      </section>

      <BloccoRette struttura={struttura} />

      <DisponibilitaPortale struttura={struttura} />

      <section>
        <h2 className="font-serif text-xl font-semibold">La struttura</h2>
        <p className="mt-3 max-w-[65ch] leading-relaxed text-inchiostro-medio">
          {struttura.descrizione}
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold">Dati di dettaglio</h2>
        <dl className="mt-4 grid gap-px overflow-hidden rounded-lg border border-bordo bg-bordo sm:grid-cols-2">
          {[
            {
              voce: "Posti letto",
              valore:
                struttura.posti_letto !== null
                  ? numero(struttura.posti_letto)
                  : "Non disponibile",
            },
            {
              voce: "Convenzionata con il servizio sanitario",
              valore:
                struttura.convenzionata === null
                  ? "Informazione non disponibile"
                  : struttura.convenzionata
                    ? "Sì"
                    : "No",
            },
            {
              voce: "Nucleo Alzheimer",
              // null = la fonte non lo dice: non va mai reso come un "No".
              valore:
                struttura.nucleo_alzheimer === null
                  ? "Informazione non disponibile"
                  : struttura.nucleo_alzheimer
                    ? "Sì"
                    : "No",
            },
            {
              voce: "Gestore",
              valore: struttura.denominazione_gestore ?? "Non disponibile",
            },
          ].map((riga) => (
            <div key={riga.voce} className="bg-superficie px-4 py-3.5">
              <dt className="text-sm text-inchiostro-tenue">{riga.voce}</dt>
              <dd className="numeri mt-0.5 font-medium text-inchiostro">{riga.valore}</dd>
            </div>
          ))}
        </dl>
      </section>

      <AttribuzioneOsm struttura={struttura} />

      <p className="border-t border-bordo pt-6 text-[0.98rem]">
        <Link
          href={percorsoComune}
          className="font-medium text-verde underline-offset-4 hover:underline"
        >
          Vedi {info.tutti} {info.pluraleInFrase} a {struttura.comune}
        </Link>
      </p>

      <PadPerBarra />
      <BarraMobile slug={struttura.slug} />
    </div>
  );
}
