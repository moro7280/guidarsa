import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvvisoDemo } from "@/components/AvvisoDemo";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ElencoLuoghi } from "@/components/ElencoLuoghi";
import { FaqLuogo } from "@/components/FaqLuogo";
import { PanoramicaLuogo } from "@/components/PanoramicaLuogo";
import { domandeLuogo } from "@/lib/domande";
import { statistiche } from "@/lib/statistiche";
import { percorsi } from "@/lib/percorsi";
import { conta, metadataPagina } from "@/lib/seo";
import { getRegioni, getStrutture, isDatasetDemo } from "@/lib/strutture";
import { SLUG_TIPOLOGIE, getTipologia } from "@/lib/tipologie";

type Parametri = { tipologia: string };

export const dynamicParams = false;

export function generateStaticParams(): Parametri[] {
  return SLUG_TIPOLOGIE.map((tipologia) => ({ tipologia }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametri>;
}): Promise<Metadata> {
  const { tipologia } = await params;
  const info = getTipologia(tipologia);
  if (!info) return {};

  const regioni = await getRegioni(info.slug);
  const totale = regioni.reduce((somma, regione) => somma + regione.conteggio, 0);

  return metadataPagina({
    titolo: `${info.plurale} in Italia: elenco per regione`,
    descrizione: `${totale} ${info.pluraleInFrase} in ${conta(regioni.length, "regione", "regioni")}. Confronta strutture, servizi e rette e trova quella giusta nel tuo territorio.`,
    percorso: percorsi.tipologia(info.slug),
  });
}

export default async function PaginaTipologia({
  params,
}: {
  params: Promise<Parametri>;
}) {
  const { tipologia } = await params;
  const info = getTipologia(tipologia);
  if (!info) notFound();

  const regioni = await getRegioni(info.slug);
  // Mai pubblicare pagine vuote (CLAUDE.md).
  if (regioni.length === 0) notFound();

  const totale = regioni.reduce((somma, regione) => somma + regione.conteggio, 0);
  const demo = await isDatasetDemo();
  const strutture = await getStrutture({ tipologia: info.slug });
  const stat = statistiche(strutture);
  const luogo = "in Italia";

  return (
    <div className="space-y-8">
      <Breadcrumb
        voci={[
          { nome: "Home", percorso: percorsi.home() },
          { nome: info.plurale, percorso: percorsi.tipologia(info.slug) },
        ]}
      />

      {demo && <AvvisoDemo />}

      <header>
        <h1 className="text-3xl font-semibold text-inchiostro">{info.plurale} in Italia</h1>
        <p className="mt-3 max-w-3xl text-inchiostro-medio">{info.descrizione}</p>
        <p className="mt-2 text-sm text-inchiostro-medio">
          {totale} {totale === 1 ? "struttura censita" : "strutture censite"} in {regioni.length}{" "}
          {regioni.length === 1 ? "regione" : "regioni"}.
        </p>
      </header>

      <PanoramicaLuogo
        stat={stat}
        luogo={luogo}
        tipologiaInFrase={info.pluraleInFrase}
        livelloComuni="comuni"
      />

      <section>
        <h2 className="text-xl font-semibold text-inchiostro">Scegli la regione</h2>
        <div className="mt-4">
          <ElencoLuoghi
            nodi={regioni}
            href={(regione) => percorsi.regione(info.slug, regione.slug)}
          />
        </div>
      </section>

      <FaqLuogo
        domande={domandeLuogo(stat, {
          luogo,
          tipologiaPlurale: info.plurale,
          tipologiaInFrase: info.pluraleInFrase,
          livelloComuni: "comuni",
        })}
      />
    </div>
  );
}
