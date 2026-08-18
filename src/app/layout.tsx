import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";
import { percorsi } from "@/lib/percorsi";
import { NOME_SITO, URL_SITO } from "@/lib/seo";
import { SLUG_TIPOLOGIE, TIPOLOGIE } from "@/lib/tipologie";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITO),
  title: {
    default: `${NOME_SITO} — strutture per anziani in tutta Italia`,
    template: `%s | ${NOME_SITO}`,
  },
  description:
    "Directory delle strutture per anziani in Italia: RSA, case di riposo, centri diurni e assistenza domiciliare, comune per comune.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
            <Link href={percorsi.home()} className="text-lg font-semibold text-teal-800">
              {NOME_SITO}
            </Link>
            <nav aria-label="Navigazione principale">
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {SLUG_TIPOLOGIE.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={percorsi.tipologia(slug)}
                      className="text-slate-700 hover:text-teal-700 hover:underline"
                    >
                      {TIPOLOGIE[slug].plurale}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={percorsi.guide()}
                    className="text-slate-700 hover:text-teal-700 hover:underline"
                  >
                    Guide
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-600">
            <p>
              {NOME_SITO} — informazioni sulle strutture per anziani in Italia. Il sito è in
              costruzione e i dati mostrati sono dimostrativi.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
