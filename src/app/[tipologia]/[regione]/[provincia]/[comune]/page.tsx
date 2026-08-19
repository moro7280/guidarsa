import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvvisoDemo } from "@/components/AvvisoDemo";
import { BarraMobile, BloccoCta, PadPerBarra } from "@/components/Cta";
import { FaqComune } from "@/components/FaqComune";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SchedaStruttura } from "@/components/SchedaStruttura";
import { GUIDE } from "@/lib/guide";
import { percorsi } from "@/lib/percorsi";
import { conta, metadataPagina } from "@/lib/seo";
import {
  getCombinazioni,
  getNomeComune,
  getNomeProvincia,
  getNomeRegione,
  getSiglaProvinciaDiComune,
  getStrutture,
  isDatasetDemo,
} from "@/lib/strutture";
import { TIPOLOGIE, getTipologia } from "@/lib/tipologie";
import type { Tipologia } from "@/lib/types";

type Parametri = {
  tipologia: string;
  regione: string;
  provincia: string;
  comune: string;
};

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Parametri[]> {
  return getCombinazioni();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametri>;
}): Promise<Metadata> {
  const { tipologia, regione, provincia, comune } = await params;
  const info = getTipologia(tipologia);
  const nomeComune = await getNomeComune(comune);
  const sigla = await getSiglaProvinciaDiComune(comune);
  if (!info || !nomeComune) return {};

  const strutture = await getStrutture({
    tipologia: info.slug,
    regione,
    provincia,
    comune,
  });
  if (strutture.length === 0) return {};

  return metadataPagina({
    titolo: `${info.plurale} a ${nomeComune} (${sigla}): ${conta(strutture.length, "struttura", "strutture")}`,
    descrizione: `${info.plurale} a ${nomeComune}: ${conta(strutture.length, "struttura", "strutture")} con indirizzo, contatti, posti letto, convenzione e rette indicative.`,
    percorso: percorsi.comune(info.slug, regione, provincia, comune),
  });
}

export default async function PaginaComune({
  params,
}: {
  params: Promise<Parametri>;
}) {
  const { tipologia, regione, provincia, comune } = await params;
  const info = getTipologia(tipologia);
  const nomeRegione = await getNomeRegione(regione);
  const nomeProvincia = await getNomeProvincia(provincia);
  const nomeComune = await getNomeComune(comune);
  const sigla = await getSiglaProvinciaDiComune(comune);
  if (!info || !nomeRegione || !nomeProvincia || !nomeComune) notFound();

  const strutture = await getStrutture({
    tipologia: info.slug,
    regione,
    provincia,
    comune,
  });
  // Mai pubblicare pagine vuote (CLAUDE.md).
  if (strutture.length === 0) notFound();

  // Internal linking: le altre tipologie disponibili nello stesso comune.
  const nelComune = await getStrutture({ regione, provincia, comune });
  const altreTipologie = [
    ...new Set(nelComune.map((struttura) => struttura.tipologia)),
  ].filter((slug): slug is Tipologia => slug !== info.slug);

  const convenzionate = strutture.filter((struttura) => struttura.convenzionata).length;
  const conAlzheimer = strutture.filter((struttura) => struttura.nucleo_alzheimer).length;
  const demo = await isDatasetDemo();

  return (
    <div className="space-y-8">
      <Breadcrumb
        voci={[
          { nome: "Home", percorso: percorsi.home() },
          { nome: info.plurale, percorso: percorsi.tipologia(info.slug) },
          { nome: nomeRegione, percorso: percorsi.regione(info.slug, regione) },
          {
            nome: nomeProvincia,
            percorso: percorsi.provincia(info.slug, regione, provincia),
          },
          {
            nome: nomeComune,
            percorso: percorsi.comune(info.slug, regione, provincia, comune),
          },
        ]}
      />

      {demo && <AvvisoDemo />}

      <header>
        <h1 className="text-3xl font-semibold text-inchiostro">
          {info.plurale} a {nomeComune} ({sigla})
        </h1>
        <p className="mt-3 max-w-3xl text-inchiostro-medio">
          {strutture.length} {strutture.length === 1 ? "struttura" : "strutture"} a {nomeComune}
          {convenzionate > 0 && `, di cui ${convenzionate} convenzionate`}
          {conAlzheimer > 0 && ` e ${conAlzheimer} con nucleo Alzheimer`}. Confronta contatti,
          posti letto e rette indicative.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-inchiostro">
          Elenco {info.articoloDi} {info.pluraleInFrase} a {nomeComune}
        </h2>
        {strutture.map((struttura) => (
          <SchedaStruttura key={struttura.slug} struttura={struttura} />
        ))}
      </section>

      {altreTipologie.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-inchiostro">
            Altri servizi per anziani a {nomeComune}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {altreTipologie.map((slug) => (
              <li key={slug}>
                <Link
                  href={percorsi.comune(slug, regione, provincia, comune)}
                  className="inline-block rounded-full border border-bordo bg-superficie px-4 py-2 text-sm text-inchiostro-medio transition hover:border-verde hover:text-verde"
                >
                  {TIPOLOGIE[slug].plurale} a {nomeComune}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FaqComune
        strutture={strutture}
        comune={nomeComune}
        tipologiaPlurale={info.pluraleInFrase}
      />

      <BloccoCta comune={`${nomeComune} (${sigla})`} />

      <section>
        <h2 className="text-xl font-semibold text-inchiostro">Guide utili prima di scegliere</h2>
        <ul className="mt-4 space-y-3">
          {GUIDE.map((guida) => (
            <li key={guida.slug}>
              <Link
                href={percorsi.guida(guida.slug)}
                className="block rounded-lg border border-bordo bg-superficie p-4 transition hover:border-verde hover:bg-verde-tenue"
              >
                <span className="font-medium text-inchiostro">{guida.titolo}</span>
                <span className="mt-1 block text-sm text-inchiostro-medio">{guida.descrizione}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <PadPerBarra />
      <BarraMobile comune={`${nomeComune} (${sigla})`} />
    </div>
  );
}
