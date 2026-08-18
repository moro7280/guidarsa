import Link from "next/link";
import { AvvisoDemo } from "@/components/AvvisoDemo";
import { GUIDE } from "@/lib/guide";
import { percorsi } from "@/lib/percorsi";
import { getRegioni, isDatasetDemo } from "@/lib/strutture";
import { SLUG_TIPOLOGIE, TIPOLOGIE } from "@/lib/tipologie";

export default async function Home() {
  const regioni = await getRegioni();
  const demo = await isDatasetDemo();

  return (
    <div className="space-y-10">
      {demo && <AvvisoDemo />}

      <section>
        <h1 className="text-3xl font-bold text-slate-900">
          Strutture per anziani in Italia: RSA, case di riposo, centri diurni
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Cerca la struttura giusta comune per comune e confronta rette, posti letto e servizi.
          Le guide spiegano come scegliere, quanto costa e quali agevolazioni esistono.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Cerca per tipologia</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {SLUG_TIPOLOGIE.map((slug) => (
            <li key={slug}>
              <Link
                href={percorsi.tipologia(slug)}
                className="block h-full rounded-lg border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <span className="text-lg font-semibold text-slate-900">
                  {TIPOLOGIE[slug].plurale}
                </span>
                <span className="mt-2 block text-sm text-slate-600">
                  {TIPOLOGIE[slug].descrizione}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Regioni coperte</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {regioni.map((regione) => (
            <li key={regione.slug}>
              <Link
                href={percorsi.regione("rsa", regione.slug)}
                className="inline-block rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-teal-300 hover:text-teal-800"
              >
                {regione.nome}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Guide per le famiglie</h2>
        <ul className="mt-4 space-y-3">
          {GUIDE.map((guida) => (
            <li key={guida.slug}>
              <Link
                href={percorsi.guida(guida.slug)}
                className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <span className="font-medium text-slate-900">{guida.titolo}</span>
                <span className="mt-1 block text-sm text-slate-600">{guida.descrizione}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
