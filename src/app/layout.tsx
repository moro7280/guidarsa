import type { Metadata } from "next";
import Link from "next/link";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/JsonLd";
import { Logo } from "@/components/Logo";
import { percorsi } from "@/lib/percorsi";
import { NOME_SITO, URL_SITO, jsonLdOrganizzazione } from "@/lib/seo";
import { getTipologieDisponibili } from "@/lib/strutture";
import { TIPOLOGIE } from "@/lib/tipologie";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITO),
  title: {
    default: `${NOME_SITO} — RSA e case di riposo, comune per comune`,
    template: `%s | ${NOME_SITO}`,
  },
  description:
    "Guida alle strutture per anziani in Italia: RSA, case di riposo, centri diurni e assistenza domiciliare, con contatti, posti letto e rette documentate.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Solo le tipologie che hanno strutture: linkare un hub vuoto significa
  // linkare un 404 (CLAUDE.md, regole SEO).
  const tipologie = await getTipologieDisponibili();

  return (
    <html lang="it" className={`${sourceSans.variable} ${sourceSerif.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <JsonLd dati={jsonLdOrganizzazione()} />

        <a
          href="#contenuto"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-verde focus:px-4 focus:py-2 focus:text-carta"
        >
          Vai al contenuto
        </a>

        <header className="border-b border-bordo bg-superficie">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5">
            <Link href={percorsi.home()} aria-label={`${NOME_SITO}, torna alla home`}>
              <Logo />
            </Link>
            <nav aria-label="Navigazione principale">
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.95rem]">
                {tipologie.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={percorsi.tipologia(slug)}
                      className="text-inchiostro-medio underline-offset-4 hover:text-verde hover:underline"
                    >
                      {TIPOLOGIE[slug].plurale}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={percorsi.guide()}
                    className="text-inchiostro-medio underline-offset-4 hover:text-verde hover:underline"
                  >
                    Guide
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main id="contenuto" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
          {children}
        </main>

        <footer className="mt-4 bg-inchiostro text-[#C6D2CC]">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-3">
              <Logo variante="scuro" dimensione={30} />
              <p className="max-w-xs text-[0.95rem] leading-relaxed">
                <strong className="font-semibold text-carta">GuidaRSA è gratuito per le famiglie.</strong>{" "}
                Non gestiamo strutture e non vendiamo posti letto: mettiamo in chiaro i dati per
                aiutare le famiglie a scegliere.
              </p>
              <p className="max-w-xs text-[0.95rem] leading-relaxed">
                Come verifichiamo: partiamo dagli elenchi pubblici regionali, controlliamo i
                contatti sui siti ufficiali delle strutture e pubblichiamo una retta solo quando la
                struttura la mette per iscritto nella propria carta dei servizi. Dove un dato non ce
                l&apos;abbiamo, lo scriviamo.
              </p>
            </div>

            <div>
              <h2 className="font-sans text-xs font-bold uppercase tracking-[0.09em] text-[#8AA79C]">
                Da dove vengono i dati
              </h2>
              <ul className="mt-3 space-y-2 text-[0.95rem]">
                <li>Open data di Regione Lombardia, elenco delle RSA accreditate</li>
                <li>Siti ufficiali delle strutture e carte dei servizi pubblicate</li>
                <li>
                  OpenStreetMap —{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    className="underline underline-offset-4 hover:text-carta"
                    rel="noopener"
                    target="_blank"
                  >
                    © OpenStreetMap contributors
                  </a>
                  , ODbL
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-sans text-xs font-bold uppercase tracking-[0.09em] text-[#8AA79C]">
                Contatti
              </h2>
              <ul className="mt-3 space-y-2 text-[0.95rem]">
                <li>
                  Scrivici:{" "}
                  <a
                    href="mailto:info@guidarsa.it"
                    className="underline underline-offset-4 hover:text-carta"
                  >
                    info@guidarsa.it
                  </a>
                </li>
                <li>
                  Gestisci una struttura e vuoi correggere i tuoi dati? Segnalacelo e li aggiorniamo
                  citando la fonte.
                </li>
                <li>
                  <Link href="/privacy/" className="underline underline-offset-4 hover:text-carta">
                    Informativa privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#243933]">
            <p className="mx-auto max-w-5xl px-4 py-5 text-sm text-[#8AA79C]">
              {NOME_SITO} — le informazioni pubblicate hanno scopo informativo e non sostituiscono
              il contatto diretto con la struttura.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
