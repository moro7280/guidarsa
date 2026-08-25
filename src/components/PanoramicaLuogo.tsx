import Link from "next/link";
import { euro, numero } from "@/lib/formato";
import type { RettePerFonte, Statistiche } from "@/lib/statistiche";

/**
 * Panoramica di un territorio: numeri, testo che li spiega, e i comuni dove si
 * concentra l'offerta.
 *
 * Il testo e composto dai dati, non scritto a mano: quando cambiano le rette o
 * arriva una struttura nuova, cambia anche la pagina. È l'unico modo per avere
 * contenuto vero su centinaia di pagine senza inventarne una riga.
 */
export function PanoramicaLuogo({
  stat,
  luogo,
  tipologiaInFrase,
  livelloComuni,
  hrefComune,
}: {
  stat: Statistiche;
  /** "in Lombardia", "in provincia di Bergamo". */
  luogo: string;
  tipologiaInFrase: string;
  /** Etichetta del livello inferiore: "comuni" o "province". */
  livelloComuni: string;
  hrefComune?: (slug: string) => string;
}) {
  const numeri = [
    { valore: numero(stat.strutture), etichetta: "strutture censite" },
    { valore: numero(stat.comuni), etichetta: livelloComuni },
    ...(stat.postiTotali > 0
      ? [{ valore: numero(stat.postiTotali), etichetta: "posti letto dichiarati" }]
      : []),
    { valore: numero(stat.convenzionate), etichetta: "accreditate" },
  ];

  return (
    <section className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-bordo bg-bordo sm:grid-cols-4">
        {numeri.map((dato) => (
          <div key={dato.etichetta} className="bg-superficie px-4 py-4">
            <dt className="numeri font-serif text-2xl font-semibold text-verde">{dato.valore}</dt>
            <dd className="mt-0.5 text-sm leading-snug text-inchiostro-tenue">{dato.etichetta}</dd>
          </div>
        ))}
      </dl>

      {/* Le frasi sono composte come stringhe, non interlacciando JSX e numeri:
          fra un nodo di testo e un'espressione React inserisce uno spazio, e in
          pagina si leggeva "60 comuni , per un totale" con lo spazio prima della
          virgola. In italiano è un errore tipografico che si nota. */}
      <div className="flex max-w-[68ch] flex-col gap-3 leading-relaxed text-inchiostro-medio">
        <p>{frasePanoramica(stat, luogo, tipologiaInFrase, livelloComuni)}</p>
        <Rette stat={stat} />
        {fraseContatti(stat) && <p>{fraseContatti(stat)}</p>}
      </div>

      {hrefComune && stat.topComuni.length > 1 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-inchiostro">
            Dove si concentra l&apos;offerta
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {stat.topComuni.map((comune) => (
              <li key={comune.slug}>
                <Link
                  href={hrefComune(comune.slug)}
                  className="inline-flex items-baseline gap-2 rounded-full border border-bordo bg-superficie px-4 py-2 text-sm transition-colors hover:border-verde"
                >
                  <span className="font-medium text-inchiostro">{comune.nome}</span>
                  <span className="numeri text-inchiostro-tenue">{comune.conteggio}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function maiuscola(testo: string): string {
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

function frasePanoramica(
  stat: Statistiche,
  luogo: string,
  tipologiaInFrase: string,
  livelloComuni: string,
): string {
  const parti = [
    `${maiuscola(luogo)} risultano ${numero(stat.strutture)} ${tipologiaInFrase} distribuite in ${numero(stat.comuni)} ${livelloComuni}`,
  ];

  if (stat.postiTotali > 0) {
    parti.push(`, per un totale di ${numero(stat.postiTotali)} posti letto dichiarati`);
    if (stat.postiMedi !== null) {
      parti.push(` e una dimensione media di ${numero(stat.postiMedi)} posti`);
    }
  }
  parti.push(". ");

  // Le strutture con accreditamento ignoto non vanno mai descritte come non
  // accreditate: l'elenco di origine semplicemente non lo dice.
  const noto = stat.strutture - stat.accreditamentoIgnoto;
  if (stat.convenzionate > 0) {
    parti.push(
      `${numero(stat.convenzionate)} sono accreditate con il servizio sanitario regionale: in queste una parte della retta è coperta dalla Regione, ma i posti convenzionati sono contingentati e spesso soggetti a lista d'attesa.`,
    );
    if (stat.accreditamentoIgnoto > 0) {
      parti.push(
        ` Per altre ${numero(stat.accreditamentoIgnoto)} l'elenco regionale non dichiara l'accreditamento: è un dato da chiedere alla struttura.`,
      );
    }
  } else if (noto === 0) {
    parti.push(
      "L'elenco regionale non dichiara l'accreditamento di queste strutture: conviene chiederlo direttamente a loro o all'azienda sanitaria di riferimento.",
    );
  } else {
    parti.push(
      "Nessuna risulta accreditata negli elenchi regionali: la retta è quindi interamente a carico dell'ospite o della famiglia.",
    );
  }

  return parti.join("");
}

/**
 * Le rette del territorio.
 *
 * Con una sola fonte si riassumono in una frase. Con piu fonti no: la regola
 * sui prezzi in CLAUDE.md vieta la mediana unica, perche un mensile letto in
 * una carta dei servizi e un mensile calcolato da una tariffa giornaliera
 * dichiarata alla Regione non misurano la stessa cosa. In quel caso la pagina
 * mostra le popolazioni separate e dice perche.
 */
function Rette({ stat }: { stat: Statistiche }) {
  if (stat.rettePerFonte.length === 0) {
    return (
      <p>
        Per queste strutture non abbiamo ancora rette documentate: le pubblichiamo solo quando la
        fonte le rende disponibili, senza stimarle.
      </p>
    );
  }

  if (stat.rettePerFonte.length === 1) {
    return <p>{fraseFonteUnica(stat.rettePerFonte[0])}</p>;
  }

  const totale = stat.rettePerFonte.reduce((somma, voce) => somma + voce.strutture, 0);

  return (
    <>
      <p>
        {`Abbiamo rette documentate per ${numero(totale)} strutture, da fonti che non misurano la stessa cosa: restano separate, perché una mediana unica confonderebbe due grandezze diverse.`}
      </p>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        {stat.rettePerFonte.map((voce) => (
          <li key={voce.fonte.chiave}>{fraseVoce(voce)}</li>
        ))}
      </ul>
      <p>
        {`Il valore di sintesi si legge sulle pagine regionali, dove la fonte è una sola.${notaMetodo(stat.rettePerFonte)}`}
      </p>
    </>
  );
}

function fraseFonteUnica(voce: RettePerFonte): string {
  const parti: string[] = [];

  if (voce.privataMediana !== null) {
    parti.push(
      `Abbiamo la retta documentata per ${numero(voce.privataN)} ${voce.privataN === 1 ? "struttura" : "strutture"}: va da ${euro(voce.privataMin as number)} a ${euro(voce.privataMax as number)} al mese, con un valore mediano di ${euro(voce.privataMediana)}.`,
    );
  }

  if (voce.convenzionataMediana !== null) {
    parti.push(
      `${parti.length ? " " : ""}La quota a carico dell'ospite in regime convenzionato ha una mediana di ${euro(voce.convenzionataMediana)} al mese, su ${numero(voce.convenzionataN)} ${voce.convenzionataN === 1 ? "struttura" : "strutture"}.`,
    );
  }

  parti.push(
    ` Sono tariffe ${voce.fonte.inFrase}: indicative, da verificare al momento del contatto.`,
  );
  if (voce.fonte.mensileCalcolato) {
    parti.push(
      " Gli importi mensili sono calcolati dalle tariffe giornaliere dichiarate, moltiplicate per 30,44 giorni medi.",
    );
  }

  return parti.join("");
}

function fraseVoce(voce: RettePerFonte): string {
  const parti = [`${maiuscola(voce.fonte.breve)}, ${numero(voce.strutture)} strutture: `];

  if (voce.privataMediana !== null) {
    parti.push(
      `retta a carico dell'ospite da ${euro(voce.privataMin as number)} a ${euro(voce.privataMax as number)} al mese, mediana ${euro(voce.privataMediana)}`,
    );
  } else {
    parti.push("nessuna tariffa privata dichiarata");
  }

  if (voce.convenzionataMediana !== null) {
    parti.push(
      `; in regime convenzionato la mediana è ${euro(voce.convenzionataMediana)} al mese su ${numero(voce.convenzionataN)} strutture`,
    );
  }
  parti.push(".");

  return parti.join("");
}

/** Perche le popolazioni non si sommano: si dice, non si lascia intuire. */
function notaMetodo(voci: RettePerFonte[]): string {
  const calcolate = voci.filter((voce) => voce.fonte.mensileCalcolato);
  if (calcolate.length === 0) return "";
  const nomi = calcolate.map((voce) => voce.fonte.nome).join(" e ");
  return ` Le tariffe che arrivano dagli elenchi regionali (${nomi}) nascono giornaliere e qui sono moltiplicate per 30,44 giorni medi, mentre le carte dei servizi dichiarano importi già mensili, che comprendono voci diverse.`;
}

function fraseContatti(stat: Statistiche): string | null {
  const parti: string[] = [];

  if (stat.conContatto > 0) {
    parti.push(
      `Di ${numero(stat.strutture)} strutture, ${numero(stat.conContatto)} hanno almeno un recapito verificato sul sito ufficiale.`,
    );
  }
  if (stat.conNucleo > 0) {
    parti.push(
      `${numero(stat.conNucleo)} dichiarano un nucleo dedicato alle demenze, che nei documenti compare spesso come «nucleo protetto»: dove il dato manca significa che il documento non lo dice, non che il nucleo non ci sia.`,
    );
  }

  return parti.length ? parti.join(" ") : null;
}
