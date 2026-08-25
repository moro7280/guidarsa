import { FONTI_DIRETTE } from "@/lib/fonti";
import { numero } from "@/lib/formato";
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
    return `${numero(min)} - ${numero(max)} €`;
  }
  const valore = (min ?? max) as number;
  return `${numero(valore)} €`;
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
  const storica = anno !== null && new Date().getFullYear() - anno > ANNI_PER_STORICA;
  const controllo = dataItaliana(struttura.carta_servizi_scaricata_il);
  const regimeNonNoto = struttura.retta_regime === "non_specificato";
  const diretta = FONTI_DIRETTE[struttura.fonte_dati ?? ""] ?? null;

  return (
    <section className="overflow-hidden rounded-lg border border-sabbia bg-sabbia-tenue">
      <div className="p-5">
        <h2 className="font-serif text-xl font-semibold">Quanto costa</h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {privata && (
            <div className="rounded-md border border-sabbia bg-superficie p-4">
              <dt className="text-sm font-medium text-inchiostro-tenue">
                {regimeNonNoto ? "Retta a carico dell'ospite" : "Retta privata (solvente)"}
              </dt>
              <dd className="numeri mt-1 font-serif text-2xl font-semibold text-inchiostro">
                {privata}
                <span className="ml-1 font-sans text-base font-normal text-inchiostro-tenue">
                  al mese
                </span>
              </dd>
              <dd className="mt-1.5 text-sm leading-snug text-inchiostro-medio">
                {regimeNonNoto
                  ? "Il documento non specifica se sia tariffa privata o in convenzione."
                  : "Interamente a carico dell'ospite o della famiglia."}
              </dd>
            </div>
          )}

          {convenzionata && (
            <div className="rounded-md border border-sabbia bg-superficie p-4">
              <dt className="text-sm font-medium text-inchiostro-tenue">
                Quota in regime convenzionato
              </dt>
              <dd className="numeri mt-1 font-serif text-2xl font-semibold text-inchiostro">
                {convenzionata}
                <span className="ml-1 font-sans text-base font-normal text-inchiostro-tenue">
                  al mese
                </span>
              </dd>
              <dd className="mt-1.5 text-sm leading-snug text-inchiostro-medio">
                A carico dell&apos;ospite; la quota sanitaria è coperta dal servizio sanitario
                regionale.
              </dd>
            </div>
          )}
        </dl>

        {struttura.costi_extra && (
          <p className="mt-4 text-[0.95rem] text-inchiostro-medio">
            <strong className="font-semibold text-inchiostro">
              Costi aggiuntivi indicati nel documento:
            </strong>{" "}
            {struttura.costi_extra}
          </p>
        )}
      </div>

      <div
        className={`border-t px-5 py-4 text-sm leading-relaxed ${
          storica
            ? "border-ambra/30 bg-ambra-tenue text-inchiostro-medio"
            : "border-sabbia bg-superficie text-inchiostro-medio"
        }`}
      >
        <strong className={`font-semibold ${storica ? "text-ambra" : "text-inchiostro"}`}>
          {storica ? "Tariffa storica" : "Tariffa indicativa"}: verificare con la struttura.
        </strong>{" "}
        {storica &&
          "Il documento da cui proviene ha più di due anni e le tariffe possono essere cambiate. "}
        {diretta ? (
          <>
            Fonte: {diretta.nome}
            {controllo ? `, dato aggiornato il ${controllo}` : ""}
            {diretta.url && (
              <>
                {" — "}
                <a
                  href={diretta.url}
                  className="text-verde underline underline-offset-4"
                  rel="nofollow noopener"
                  target="_blank"
                >
                  elenco regionale
                </a>
              </>
            )}
            {/* Il punto sta dentro il ramo: fuori, JSX ci mette uno spazio davanti. */}
            {"."}
          </>
        ) : (
          <>
            Fonte: carta dei servizi{anno ? ` ${anno}` : ""}
            {controllo ? `, ultimo controllo ${controllo}` : ""}
            {struttura.url_carta_servizi && (
              <>
                {" — "}
                <a
                  href={struttura.url_carta_servizi}
                  className="text-verde underline underline-offset-4"
                  rel="nofollow noopener"
                  target="_blank"
                >
                  documento originale
                </a>
              </>
            )}
            {"."}
          </>
        )}
        {struttura.retta_originale &&
          ` ${
            diretta ? "Valori dichiarati alla Regione" : "Valore riportato nel documento"
          }: ${struttura.retta_originale}.`}
        {diretta &&
          " Gli importi mensili qui sopra sono calcolati dalle tariffe giornaliere, moltiplicate per 30,44 giorni medi."}
      </div>
    </section>
  );
}
