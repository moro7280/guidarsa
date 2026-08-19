import type { Struttura } from "@/lib/types";

/**
 * Rette in pagina. Regole permanenti (CLAUDE.md):
 * - ogni retta dichiara fonte, anno della carta e data dell'ultimo controllo,
 *   con link al documento originale sul sito della struttura
 * - dicitura fissa "tariffa indicativa"; oltre i 2 anni diventa "tariffa storica"
 * - convenzionata e privata sempre distinte, mai mescolate
 */

const ANNI_PER_STORICA = 2;

function formatta(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) {
    return `${min.toLocaleString("it-IT")} - ${max.toLocaleString("it-IT")} € al mese`;
  }
  const valore = (min ?? max) as number;
  return `${valore.toLocaleString("it-IT")} € al mese`;
}

function dataItaliana(valore: string | null | undefined): string | null {
  if (!valore) return null;
  const data = new Date(valore);
  return Number.isNaN(data.getTime())
    ? null
    : data.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export function BloccoRette({ struttura }: { struttura: Struttura }) {
  const privata = formatta(struttura.prezzo_min, struttura.prezzo_max);
  const convenzionata = formatta(
    struttura.retta_convenzionata_min ?? null,
    struttura.retta_convenzionata_max ?? null,
  );

  if (!privata && !convenzionata) return null;

  const anno = struttura.carta_servizi_anno ?? null;
  const annoCorrente = new Date().getFullYear();
  const storica = anno !== null && annoCorrente - anno > ANNI_PER_STORICA;
  const controllo = dataItaliana(struttura.carta_servizi_scaricata_il);

  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">Rette</h2>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {privata && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <dt className="text-sm text-slate-500">Retta privata (solvente)</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">{privata}</dd>
            <dd className="mt-1 text-sm text-slate-600">
              Interamente a carico dell&apos;ospite o della famiglia.
            </dd>
          </div>
        )}
        {convenzionata && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <dt className="text-sm text-slate-500">Quota in regime convenzionato</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">{convenzionata}</dd>
            <dd className="mt-1 text-sm text-slate-600">
              A carico dell&apos;ospite; la quota sanitaria è coperta dal servizio sanitario
              regionale.
            </dd>
          </div>
        )}
      </dl>

      {struttura.costi_extra && (
        <p className="mt-3 text-sm text-slate-700">
          <strong>Costi aggiuntivi indicati nel documento:</strong> {struttura.costi_extra}
        </p>
      )}

      <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <strong>{storica ? "Tariffa storica" : "Tariffa indicativa"}: verificare con la struttura.</strong>{" "}
        {storica && "Il documento da cui proviene ha più di due anni e le tariffe possono essere cambiate. "}
        Fonte: carta dei servizi{anno ? ` ${anno}` : ""}
        {controllo ? `, ultimo controllo ${controllo}` : ""}
        {struttura.url_carta_servizi && (
          <>
            {" — "}
            <a
              href={struttura.url_carta_servizi}
              className="text-teal-700 underline"
              rel="nofollow noopener"
              target="_blank"
            >
              documento originale
            </a>
          </>
        )}
        .
        {struttura.retta_originale && (
          <>
            {" "}
            Valore riportato nel documento: {struttura.retta_originale}.
          </>
        )}
      </p>
    </section>
  );
}
