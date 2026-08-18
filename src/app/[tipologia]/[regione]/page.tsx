import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvvisoDemo } from "@/components/AvvisoDemo";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ElencoLuoghi } from "@/components/ElencoLuoghi";
import { percorsi } from "@/lib/percorsi";
import { conta, metadataPagina } from "@/lib/seo";
import {
  getCombinazioni,
  getNomeRegione,
  getProvince,
  isDatasetDemo,
} from "@/lib/strutture";
import { getTipologia } from "@/lib/tipologie";

type Parametri = { tipologia: string; regione: string };

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Parametri[]> {
  const combinazioni = await getCombinazioni();
  const viste = new Set<string>();
  const parametri: Parametri[] = [];

  for (const { tipologia, regione } of combinazioni) {
    const chiave = `${tipologia}/${regione}`;
    if (!viste.has(chiave)) {
      viste.add(chiave);
      parametri.push({ tipologia, regione });
    }
  }

  return parametri;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametri>;
}): Promise<Metadata> {
  const { tipologia, regione } = await params;
  const info = getTipologia(tipologia);
  const nomeRegione = await getNomeRegione(regione);
  if (!info || !nomeRegione) return {};

  const province = await getProvince(info.slug, regione);
  const totale = province.reduce((somma, provincia) => somma + provincia.conteggio, 0);

  return metadataPagina({
    titolo: `${info.plurale} in ${nomeRegione}: ${conta(totale, "struttura", "strutture")}`,
    descrizione: `Elenco ${info.articoloDi} ${info.pluraleInFrase} in ${nomeRegione}, provincia per provincia: ${conta(totale, "struttura", "strutture")} con indirizzo, contatti, posti letto e rette indicative.`,
    percorso: percorsi.regione(info.slug, regione),
  });
}

export default async function PaginaRegione({
  params,
}: {
  params: Promise<Parametri>;
}) {
  const { tipologia, regione } = await params;
  const info = getTipologia(tipologia);
  const nomeRegione = await getNomeRegione(regione);
  if (!info || !nomeRegione) notFound();

  const province = await getProvince(info.slug, regione);
  if (province.length === 0) notFound();

  const totale = province.reduce((somma, provincia) => somma + provincia.conteggio, 0);
  const demo = await isDatasetDemo();

  return (
    <div className="space-y-8">
      <Breadcrumb
        voci={[
          { nome: "Home", percorso: percorsi.home() },
          { nome: info.plurale, percorso: percorsi.tipologia(info.slug) },
          { nome: nomeRegione, percorso: percorsi.regione(info.slug, regione) },
        ]}
      />

      {demo && <AvvisoDemo />}

      <header>
        <h1 className="text-3xl font-bold text-slate-900">
          {info.plurale} in {nomeRegione}
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          {totale} {totale === 1 ? "struttura" : "strutture"} in {province.length}{" "}
          {province.length === 1 ? "provincia" : "province"}. Scegli la provincia per vedere
          l&apos;elenco dei comuni.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Province</h2>
        <div className="mt-4">
          <ElencoLuoghi
            nodi={province}
            href={(provincia) => percorsi.provincia(info.slug, regione, provincia.slug)}
          />
        </div>
      </section>
    </div>
  );
}
