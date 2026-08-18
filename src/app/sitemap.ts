import type { MetadataRoute } from "next";
import { GUIDE } from "@/lib/guide";
import { percorsi } from "@/lib/percorsi";
import { urlAssoluta } from "@/lib/seo";
import { getCombinazioni, getStrutture } from "@/lib/strutture";
import { SLUG_TIPOLOGIE } from "@/lib/tipologie";

/**
 * Sitemap generata dai dati, raggruppata per tipo di pagina:
 * home e hub, pagine geografiche, schede struttura, guide.
 * Contiene solo pagine effettivamente generate (nessuna pagina vuota).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const combinazioni = await getCombinazioni();
  const strutture = await getStrutture();

  const home: MetadataRoute.Sitemap = [
    { url: urlAssoluta(percorsi.home()), changeFrequency: "weekly", priority: 1 },
    { url: urlAssoluta(percorsi.guide()), changeFrequency: "monthly", priority: 0.6 },
  ];

  const hubTipologie: MetadataRoute.Sitemap = SLUG_TIPOLOGIE.map((tipologia) => ({
    url: urlAssoluta(percorsi.tipologia(tipologia)),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const viste = new Set<string>();
  const hubRegioni: MetadataRoute.Sitemap = [];
  const hubProvince: MetadataRoute.Sitemap = [];
  const comuni: MetadataRoute.Sitemap = [];

  for (const { tipologia, regione, provincia, comune } of combinazioni) {
    const percorsoRegione = percorsi.regione(tipologia, regione);
    if (!viste.has(percorsoRegione)) {
      viste.add(percorsoRegione);
      hubRegioni.push({
        url: urlAssoluta(percorsoRegione),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    const percorsoProvincia = percorsi.provincia(tipologia, regione, provincia);
    if (!viste.has(percorsoProvincia)) {
      viste.add(percorsoProvincia);
      hubProvince.push({
        url: urlAssoluta(percorsoProvincia),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    comuni.push({
      url: urlAssoluta(percorsi.comune(tipologia, regione, provincia, comune)),
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  const schede: MetadataRoute.Sitemap = strutture.map((struttura) => ({
    url: urlAssoluta(percorsi.struttura(struttura.slug)),
    lastModified: new Date(struttura.updated_at),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const guide: MetadataRoute.Sitemap = GUIDE.map((guida) => ({
    url: urlAssoluta(percorsi.guida(guida.slug)),
    lastModified: new Date(guida.aggiornataIl),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...home, ...hubTipologie, ...hubRegioni, ...hubProvince, ...comuni, ...schede, ...guide];
}
