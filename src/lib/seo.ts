import type { Metadata } from "next";
import type { Guida } from "./guide";
import { percorsi } from "./percorsi";
import type { Struttura } from "./types";

export const NOME_SITO = "GuidaRSA";

/** URL pubblica del sito; in locale ricade su localhost. */
export const URL_SITO = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export function urlAssoluta(percorso: string): string {
  return `${URL_SITO}${percorso}`;
}

/**
 * Metadata di pagina: title e description arrivano sempre dai dati, mai da
 * stringhe fisse, così nessuna pagina duplica un'altra (vedi CLAUDE.md).
 */
export function metadataPagina({
  titolo,
  descrizione,
  percorso,
  indicizzabile = true,
}: {
  titolo: string;
  descrizione: string;
  percorso: string;
  /**
   * false per le schede sotto la soglia di completezza: restano raggiungibili
   * e i loro link continuano a valere (`follow`), ma non entrano nell'indice.
   */
  indicizzabile?: boolean;
}): Metadata {
  return {
    title: titolo,
    description: descrizione,
    alternates: { canonical: percorso },
    robots: indicizzabile ? undefined : { index: false, follow: true },
    openGraph: {
      title: titolo,
      description: descrizione,
      url: urlAssoluta(percorso),
      siteName: NOME_SITO,
      locale: "it_IT",
      type: "website",
    },
  };
}

export interface VoceBreadcrumb {
  nome: string;
  percorso: string;
}

export function jsonLdBreadcrumb(voci: VoceBreadcrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: voci.map((voce, indice) => ({
      "@type": "ListItem",
      position: indice + 1,
      name: voce.nome,
      item: urlAssoluta(voce.percorso),
    })),
  };
}

export function jsonLdStruttura(struttura: Struttura) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: struttura.nome,
    description: struttura.descrizione,
    url: urlAssoluta(percorsi.struttura(struttura.slug)),
    telephone: struttura.telefono ?? undefined,
    email: struttura.email ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: struttura.indirizzo,
      postalCode: struttura.cap,
      addressLocality: struttura.comune,
      addressRegion: struttura.provincia_sigla,
      addressCountry: "IT",
    },
    geo:
      struttura.lat !== null && struttura.lng !== null
        ? {
            "@type": "GeoCoordinates",
            latitude: struttura.lat,
            longitude: struttura.lng,
          }
        : undefined,
    priceRange:
      struttura.prezzo_min !== null && struttura.prezzo_max !== null
        ? `${struttura.prezzo_min}-${struttura.prezzo_max} EUR`
        : undefined,
  };
}

export function jsonLdGuida(guida: Guida) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guida.titolo,
    description: guida.descrizione,
    datePublished: guida.pubblicataIl,
    dateModified: guida.aggiornataIl,
    inLanguage: "it-IT",
    mainEntityOfPage: urlAssoluta(percorsi.guida(guida.slug)),
    publisher: {
      "@type": "Organization",
      name: NOME_SITO,
      url: URL_SITO,
    },
  };
}

/** "1 struttura" / "3 strutture": evita i plurali sbagliati nei title. */
export function conta(numero: number, singolare: string, plurale: string): string {
  return `${numero} ${numero === 1 ? singolare : plurale}`;
}

/**
 * JSON-LD dell'organizzazione, emesso una volta sola nel layout.
 * Il logo e un PNG quadrato: i risultati arricchiti di Google non accettano SVG.
 */
export function jsonLdOrganizzazione() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: NOME_SITO,
    url: URL_SITO,
    logo: urlAssoluta("/marchio-512.png"),
    description:
      "Guida indipendente alle strutture per anziani in Italia: RSA, case di riposo, centri diurni e assistenza domiciliare.",
    email: "info@guidarsa.it",
    areaServed: { "@type": "Country", name: "Italia" },
  };
}
