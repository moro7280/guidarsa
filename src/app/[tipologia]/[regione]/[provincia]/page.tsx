import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvvisoDemo } from "@/components/AvvisoDemo";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ElencoLuoghi } from "@/components/ElencoLuoghi";
import { FaqLuogo } from "@/components/FaqLuogo";
import { PanoramicaLuogo } from "@/components/PanoramicaLuogo";
import { comuneIndicizzabile, hubIndicizzabile, indicizzabile } from "@/lib/completezza";
import { domandeLuogo } from "@/lib/domande";
import { statistiche } from "@/lib/statistiche";
import { percorsi } from "@/lib/percorsi";
import { slugify } from "@/lib/slug";
import { conta, metadataPagina } from "@/lib/seo";
import {
  getCombinazioni,
  getComuni,
  getNomeProvincia,
  getNomeRegione,
  getStrutture,
  isDatasetDemo,
} from "@/lib/strutture";
import { getTipologia } from "@/lib/tipologie";

type Parametri = { tipologia: string; regione: string; provincia: string };

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Parametri[]> {
  const combinazioni = await getCombinazioni();
  const viste = new Set<string>();
  const parametri: Parametri[] = [];

  for (const { tipologia, regione, provincia } of combinazioni) {
    const chiave = `${tipologia}/${regione}/${provincia}`;
    if (!viste.has(chiave)) {
      viste.add(chiave);
      parametri.push({ tipologia, regione, provincia });
    }
  }

  return parametri;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametri>;
}): Promise<Metadata> {
  const { tipologia, regione, provincia } = await params;
  const info = getTipologia(tipologia);
  const nomeRegione = await getNomeRegione(regione);
  const nomeProvincia = await getNomeProvincia(provincia);
  if (!info || !nomeRegione || !nomeProvincia) return {};

  const comuni = await getComuni(info.slug, regione, provincia);
  const totale = comuni.reduce((somma, comune) => somma + comune.conteggio, 0);

  return metadataPagina({
    titolo: `${info.plurale} in provincia di ${nomeProvincia}: ${conta(totale, "struttura", "strutture")}`,
    descrizione: `Elenco ${info.articoloDi} ${info.pluraleInFrase} in provincia di ${nomeProvincia} (${nomeRegione}), comune per comune: ${conta(totale, "struttura", "strutture")} con contatti, servizi e rette indicative.`,
    percorso: percorsi.provincia(info.slug, regione, provincia),
    indicizzabile: hubIndicizzabile(await getStrutture({ tipologia: info.slug, regione, provincia })),
  });
}

export default async function PaginaProvincia({
  params,
}: {
  params: Promise<Parametri>;
}) {
  const { tipologia, regione, provincia } = await params;
  const info = getTipologia(tipologia);
  const nomeRegione = await getNomeRegione(regione);
  const nomeProvincia = await getNomeProvincia(provincia);
  if (!info || !nomeRegione || !nomeProvincia) notFound();

  const comuni = await getComuni(info.slug, regione, provincia);
  if (comuni.length === 0) notFound();

  const totale = comuni.reduce((somma, comune) => somma + comune.conteggio, 0);
  const demo = await isDatasetDemo();
  const strutture = await getStrutture({ tipologia: info.slug, regione, provincia });

  /**
   * Dove una pagina comune non entra nell'indice e sotto ha una sola scheda
   * indicizzabile, l'elenco punta direttamente a quella scheda: il passaggio
   * intermedio non aggiungerebbe niente a chi legge, e chiederebbe a Google di
   * seguire un link verso una pagina che gli abbiamo detto di non indicizzare.
   */
  const perComune = new Map<string, typeof strutture>();
  for (const s of strutture) {
    const chiave = slugify(s.comune);
    const elenco = perComune.get(chiave);
    if (elenco) elenco.push(s);
    else perComune.set(chiave, [s]);
  }
  const comuniConScorciatoia = comuni.map((comune) => {
    const dentro = perComune.get(comune.slug) ?? [];
    if (comuneIndicizzabile(dentro)) return comune;
    const indicizzabili = dentro.filter(indicizzabile);
    return indicizzabili.length === 1
      ? { ...comune, percorsoDiretto: percorsi.struttura(indicizzabili[0].slug) }
      : comune;
  });
  const stat = statistiche(strutture);
  const luogo = `in provincia di ${nomeProvincia}`;

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
        ]}
      />

      {demo && <AvvisoDemo />}

      <header>
        <h1 className="text-3xl font-semibold text-inchiostro">
          {info.plurale} in provincia di {nomeProvincia}
        </h1>
        <p className="mt-3 max-w-3xl text-inchiostro-medio">
          {totale} {totale === 1 ? "struttura" : "strutture"} in {comuni.length}{" "}
          {comuni.length === 1 ? "comune" : "comuni"} della provincia di {nomeProvincia}.
        </p>
      </header>

      <PanoramicaLuogo
        stat={stat}
        luogo={luogo}
        tipologiaInFrase={info.pluraleInFrase}
        livelloComuni="comuni"
        hrefComune={(slug) => percorsi.comune(info.slug, regione, provincia, slug)}
      />

      <section>
        <h2 className="text-xl font-semibold text-inchiostro">Comuni</h2>
        <div className="mt-4">
          <ElencoLuoghi
            nodi={comuniConScorciatoia}
            href={(comune) => percorsi.comune(info.slug, regione, provincia, comune.slug)}
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
