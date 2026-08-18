import type { Tipologia } from "./types";

/**
 * Costruzione delle URL del sito. La struttura è definita in CLAUDE.md e non
 * va cambiata senza aggiornare anche sitemap, breadcrumb e internal linking.
 * Le URL terminano con "/" (next.config.ts: trailingSlash).
 */

export const percorsi = {
  home: () => "/",
  tipologia: (tipologia: Tipologia) => `/${tipologia}/`,
  regione: (tipologia: Tipologia, regione: string) => `/${tipologia}/${regione}/`,
  provincia: (tipologia: Tipologia, regione: string, provincia: string) =>
    `/${tipologia}/${regione}/${provincia}/`,
  comune: (
    tipologia: Tipologia,
    regione: string,
    provincia: string,
    comune: string,
  ) => `/${tipologia}/${regione}/${provincia}/${comune}/`,
  struttura: (slug: string) => `/struttura/${slug}/`,
  guide: () => "/guide/",
  guida: (slug: string) => `/guide/${slug}/`,
};
