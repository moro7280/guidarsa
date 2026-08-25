import type { MetadataRoute } from "next";
import { indicizzabile } from "@/lib/completezza";
import { GUIDE } from "@/lib/guide";
import { percorsi } from "@/lib/percorsi";
import { urlAssoluta } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import { getCombinazioni, getStrutture, getTipologieDisponibili } from "@/lib/strutture";
import type { Struttura } from "@/lib/types";

/**
 * Sitemap generata dai dati, raggruppata per tipo di pagina:
 * home e hub, pagine geografiche, schede struttura, guide.
 * Contiene solo pagine effettivamente generate (nessuna pagina vuota).
 *
 * force-dynamic non è un vezzo: senza, Next tratta questo Route Handler come
 * cacheabile e tra una build e l'altra riusa la sitemap precedente. Dopo un
 * import il file resterebbe fermo ai dati vecchi — successo silenzioso, il
 * peggior tipo di errore per la SEO. I dati arrivano da un database esterno,
 * che Next non può sapere quando cambia: la sitemap si rigenera a ogni
 * richiesta, e con la lettura memoizzata costa una query per processo.
 */
export const dynamic = "force-dynamic";

/**
 * Data di ultima modifica per ogni tipo di pagina.
 *
 * Una pagina geografica non ha una data propria: e composta dalle strutture che
 * contiene, quindi cambia quando cambia la piu recente di quelle. Dichiararlo
 * serve a due cose. A Google, che usa `lastmod` per decidere cosa riscansionare
 * per primo — e con quasi duemila URL in coda, dirgli quali valgono il viaggio
 * conta piu del numero di URL. E a noi: una data ferma dopo un import e il
 * sintomo visibile che qualcosa non e arrivato in produzione.
 *
 * Le date sono vere o assenti: non si inventa un `lastmod` "oggi" per far
 * sembrare fresco cio che non lo e. La pagina statica della guida scaricabile
 * resta senza data proprio per questo — il suo contenuto e scritto a mano e non
 * ha una data nei dati.
 */
function piuRecente(date: (string | null | undefined)[]): Date | undefined {
  let massimo = 0;
  for (const valore of date) {
    if (!valore) continue;
    const istante = new Date(valore).getTime();
    if (Number.isFinite(istante) && istante > massimo) massimo = istante;
  }
  return massimo > 0 ? new Date(massimo) : undefined;
}

/**
 * Raggruppa le date di aggiornamento delle strutture per ogni livello
 * geografico, in una passata sola: la stessa struttura contribuisce alla sua
 * pagina comune, alla provincia, alla regione e alla tipologia.
 */
function aggiornamentiPerPercorso(strutture: Struttura[]): Map<string, string> {
  const massimi = new Map<string, string>();

  const segna = (percorso: string, quando: string | undefined) => {
    if (!quando) return;
    const attuale = massimi.get(percorso);
    if (!attuale || quando > attuale) massimi.set(percorso, quando);
  };

  for (const struttura of strutture) {
    const tipologia = struttura.tipologia;
    const regione = slugify(struttura.regione);
    const provincia = slugify(struttura.provincia);
    const comune = slugify(struttura.comune);
    const quando = struttura.updated_at;

    segna(percorsi.tipologia(tipologia), quando);
    segna(percorsi.regione(tipologia, regione), quando);
    segna(percorsi.provincia(tipologia, regione, provincia), quando);
    segna(percorsi.comune(tipologia, regione, provincia, comune), quando);
  }

  return massimi;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const combinazioni = await getCombinazioni();
  const strutture = await getStrutture();

  const aggiornamenti = aggiornamentiPerPercorso(strutture);
  const quando = (percorso: string) => piuRecente([aggiornamenti.get(percorso)]);

  // La home mostra i numeri complessivi e le guide in evidenza: cambia quando
  // cambia una delle due cose.
  const ultimaGuida = piuRecente(GUIDE.map((guida) => guida.aggiornataIl));
  const ultimoDato = piuRecente(strutture.map((struttura) => struttura.updated_at));

  const home: MetadataRoute.Sitemap = [
    {
      url: urlAssoluta(percorsi.home()),
      lastModified: piuRecente([ultimoDato?.toISOString(), ultimaGuida?.toISOString()]),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: urlAssoluta(percorsi.guide()),
      lastModified: ultimaGuida,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Solo le tipologie con strutture: un hub vuoto risponde 404 e in sitemap
  // sarebbe un errore di scansione.
  const hubTipologie: MetadataRoute.Sitemap = (await getTipologieDisponibili()).map((tipologia) => ({
    url: urlAssoluta(percorsi.tipologia(tipologia)),
    lastModified: quando(percorsi.tipologia(tipologia)),
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
        lastModified: quando(percorsoRegione),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    const percorsoProvincia = percorsi.provincia(tipologia, regione, provincia);
    if (!viste.has(percorsoProvincia)) {
      viste.add(percorsoProvincia);
      hubProvince.push({
        url: urlAssoluta(percorsoProvincia),
        lastModified: quando(percorsoProvincia),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    const percorsoComune = percorsi.comune(tipologia, regione, provincia, comune);
    comuni.push({
      url: urlAssoluta(percorsoComune),
      lastModified: quando(percorsoComune),
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  // Solo le schede sopra la soglia di completezza: chiedere a Google di
  // indicizzare una pagina che porta noindex e` una contraddizione, e riempire
  // la sitemap di schede povere abbassa la qualita` percepita del dominio.
  const schede: MetadataRoute.Sitemap = strutture
    .filter((struttura) => indicizzabile(struttura))
    .map((struttura) => ({
      url: urlAssoluta(percorsi.struttura(struttura.slug)),
      lastModified: new Date(struttura.updated_at),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  const guidaScaricabile: MetadataRoute.Sitemap = [
    {
      url: urlAssoluta("/guide/come-scegliere-rsa-7-passi/"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const guide: MetadataRoute.Sitemap = GUIDE.map((guida) => ({
    url: urlAssoluta(percorsi.guida(guida.slug)),
    lastModified: new Date(guida.aggiornataIl),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...home, ...hubTipologie, ...hubRegioni, ...hubProvince, ...comuni, ...schede, ...guide, ...guidaScaricabile];
}
