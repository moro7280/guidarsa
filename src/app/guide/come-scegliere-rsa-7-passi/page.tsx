import type { Metadata } from "next";
import { numero } from "@/lib/formato";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ModuloIscrizione } from "@/components/ModuloIscrizione";
import { Segnavia } from "@/components/Logo";
import { conversioneAttiva } from "@/lib/conversione";
import { percorsi } from "@/lib/percorsi";
import { NOME_SITO, jsonLdBreadcrumb, metadataPagina } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { getStrutture } from "@/lib/strutture";

const PERCORSO = "/guide/come-scegliere-rsa-7-passi/";

export const metadata: Metadata = metadataPagina({
  titolo: "Come scegliere una RSA in 7 passi",
  descrizione:
    "Una guida pratica per le famiglie: cosa verificare, quanto costa davvero, quali domande fare durante la visita. Con i dati reali delle strutture censite in Lombardia.",
  percorso: PERCORSO,
});

function mediana(valori: number[]): number | null {
  const ordinati = valori.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (ordinati.length === 0) return null;
  const meta = Math.floor(ordinati.length / 2);
  return ordinati.length % 2
    ? ordinati[meta]
    : Math.round((ordinati[meta - 1] + ordinati[meta]) / 2);
}

export default async function GuidaSettePassi() {
  const strutture = await getStrutture();

  const convenzionate = strutture.filter((s) => s.convenzionata === true).length;
  const accreditamentoNoto = strutture.filter((s) => s.convenzionata !== null).length;
  const conRetta = strutture.filter((s) => s.prezzo_min !== null);
  const medianaPrivata = mediana(conRetta.map((s) => s.prezzo_min as number));
  const medianaConvenzionata = mediana(
    strutture
      .map((s) => s.retta_convenzionata_min)
      .filter((v): v is number => v !== null && v !== undefined),
  );
  const postiMedi = Math.round(
    strutture.reduce((somma, s) => somma + (s.posti_letto ?? 0), 0) /
      strutture.filter((s) => s.posti_letto !== null).length,
  );
  const comuni = new Set(strutture.map((s) => s.comune)).size;

  const euro = (valore: number) => `${numero(valore)} €`;

  const passi = [
    {
      titolo: "Stabilite di che assistenza c'è bisogno",
      testo:
        "È la domanda che decide tutte le altre. Se serve assistenza sanitaria continuativa, la strada è la RSA. Se la persona è ancora parzialmente autonoma, una casa di riposo può bastare. Se il bisogno è dare sollievo a chi assiste durante il giorno, il centro diurno costa molto meno e lascia la persona a casa la sera.",
      dato: `Su ${accreditamentoNoto} strutture per cui l'elenco regionale dichiara l'accreditamento, ${convenzionate} risultano accreditate con il servizio sanitario regionale.`,
    },
    {
      titolo: "Scegliete la zona pensando a chi andrà a trovarla",
      testo:
        "È l'errore più comune: si cerca la struttura migliore in assoluto e si trova a quaranta minuti di auto. Una struttura discreta a dieci minuti riceve visite tre volte più spesso di una eccellente lontana, e la frequenza delle visite incide sulla qualità della vita più di quasi ogni altro fattore.",
      dato: `Le strutture censite sono distribuite in ${comuni} comuni: nella maggior parte dei casi esiste più di un'opzione entro pochi chilometri.`,
    },
    {
      titolo: "Verificate accreditamento e posti convenzionati",
      testo:
        "Accreditata non significa che ci sia posto in convenzione. I posti a quota agevolata sono contingentati e spesso hanno una lista d'attesa, mentre i posti privati nella stessa struttura sono disponibili subito a un costo più alto. Chiedete quanti posti convenzionati ci sono, quanti sono liberi e quanto dura l'attesa media.",
      dato:
        medianaConvenzionata !== null
          ? `Nelle carte dei servizi che abbiamo letto, la quota a carico dell'ospite in regime convenzionato ha una mediana di ${euro(medianaConvenzionata)} al mese.`
          : "Le quote convenzionate variano molto: chiedetele sempre per iscritto.",
    },
    {
      titolo: "Fatevi dare la retta per iscritto, con cosa include",
      testo:
        "La cifra che vi dicono al telefono è quasi sempre la base. Chiedete cosa comprende e cosa no: camera singola, fisioterapia, podologia, parrucchiere, pannoloni, farmaci non a carico del servizio sanitario, trasporti per le visite. Chiedete anche cosa succede in caso di ricovero ospedaliero: molte strutture continuano ad addebitare la retta per tenere il posto.",
      dato:
        medianaPrivata !== null
          ? `Sulle ${conRetta.length} strutture di cui abbiamo la carta dei servizi, la mediana della retta è ${euro(medianaPrivata)} al mese.`
          : "Le rette documentate sono ancora poche: chiedete sempre la carta dei servizi.",
    },
    {
      titolo: "Visitate senza appuntamento, e a un orario qualsiasi",
      testo:
        "Una visita concordata mostra la struttura al suo meglio. Passate una seconda volta senza avvisare, possibilmente verso le 17 o durante un pasto. Guardate se gli ospiti sono vestiti e curati, se qualcuno parla con loro, se c'è odore di urina nei corridoi, se le persone sono lasciate davanti a un televisore acceso senza che nessuno le guardi.",
      dato: `La dimensione media delle strutture censite è di ${postiMedi} posti letto: nelle più grandi chiedete quanti operatori ci sono per nucleo, non sul totale.`,
    },
    {
      titolo: "Chiedete i numeri del personale, non le rassicurazioni",
      testo:
        "«Abbiamo personale qualificato» non vuol dire niente. Chiedete quanti operatori socio-sanitari ci sono per nucleo di notte, quanti infermieri sono presenti nelle 24 ore, se il medico è interno o a chiamata, e qual è il turnover del personale nell'ultimo anno. Un turnover alto è il segnale più affidabile di un problema organizzativo.",
      dato: `${strutture.filter((s) => s.nucleo_alzheimer === true).length} strutture censite dichiarano un nucleo dedicato alle demenze, spesso chiamato nucleo protetto.`,
    },
    {
      titolo: "Leggete il contratto prima di firmare, soprattutto le uscite",
      testo:
        "Verificate il preavviso per la disdetta, il deposito cauzionale e come viene restituito, cosa succede se le condizioni della persona cambiano e la struttura non è più adeguata, e con quale preavviso possono aumentare la retta. Chiedete una copia da portare a casa: chi non ve la dà vi sta già dicendo qualcosa.",
      dato: "La carta dei servizi è un documento pubblico: se la struttura non la pubblica, chiedetela e conservatela.",
    },
  ];

  const domandeVisita = [
    "Quanti operatori ci sono per nucleo, di giorno e di notte?",
    "Il medico è interno o a chiamata? In quali orari è presente?",
    "Quanti posti convenzionati avete e quanti sono liberi oggi?",
    "Qual è la retta esatta e cosa comprende? Cosa si paga a parte?",
    "Cosa succede alla retta se mio padre viene ricoverato in ospedale?",
    "Con quanto preavviso può aumentare la retta?",
    "Quali sono gli orari di visita? Ci sono limiti?",
    "Come vengono gestite le emergenze notturne?",
    "Che attività ci sono in una settimana normale? Chi le conduce?",
    "Posso parlare con un familiare di un altro ospite?",
  ];

  return (
    <article className="mx-auto flex max-w-[70ch] flex-col gap-8">
      <JsonLd
        dati={jsonLdBreadcrumb([
          { nome: "Home", percorso: percorsi.home() },
          { nome: "Guide", percorso: percorsi.guide() },
          { nome: "Come scegliere una RSA in 7 passi", percorso: PERCORSO },
        ])}
      />

      <div className="print:hidden">
        <Breadcrumb
          voci={[
            { nome: "Home", percorso: percorsi.home() },
            { nome: "Guide", percorso: percorsi.guide() },
            { nome: "Come scegliere una RSA in 7 passi", percorso: PERCORSO },
          ]}
        />
      </div>

      {/* Intestazione che compare solo sulla carta. */}
      <div className="hidden items-center gap-3 border-b border-bordo pb-4 print:flex">
        <Segnavia dimensione={28} colore="#1F5D4C" punto="#FFFFFF" />
        <span className="font-serif text-lg font-semibold">{NOME_SITO} — guidarsa.it</span>
      </div>

      <header className="flex flex-col gap-3">
        <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">
          Come scegliere una RSA in 7 passi
        </h1>
        <p className="text-lg text-inchiostro-medio">
          Cosa verificare davvero, quanto costa, quali domande fare durante la visita. I numeri di
          questa guida vengono dalle {strutture.length} strutture che abbiamo censito in Lombardia e
          dalle carte dei servizi che pubblicano.
        </p>
      </header>

      {conversioneAttiva() && <ModuloIscrizione origine={PERCORSO} />}

      <ol className="flex flex-col gap-8">
        {passi.map((passo, indice) => (
          <li key={passo.titolo} className="flex flex-col gap-2 break-inside-avoid">
            <h2 className="flex items-baseline gap-3 font-serif text-xl font-semibold">
              <span className="numeri text-verde">{indice + 1}.</span>
              {passo.titolo}
            </h2>
            <p className="leading-relaxed text-inchiostro-medio">{passo.testo}</p>
            <p className="border-l-2 border-verde bg-verde-tenue px-4 py-2 text-[0.95rem] text-inchiostro-medio print:bg-transparent">
              {passo.dato}
            </p>
          </li>
        ))}
      </ol>

      <section className="break-before-page">
        <h2 className="font-serif text-xl font-semibold">
          Le dieci domande da fare durante la visita
        </h2>
        <p className="mt-2 text-[0.97rem] text-inchiostro-medio">
          Stampate questa pagina e portatela con voi: c&apos;è spazio per annotare le risposte.
        </p>
        <ul className="mt-4 flex flex-col">
          {domandeVisita.map((domanda) => (
            <li
              key={domanda}
              className="flex flex-col gap-2 border-b border-bordo py-3 last:border-b-0"
            >
              <span className="font-medium text-inchiostro">{domanda}</span>
              <span
                aria-hidden="true"
                className="hidden h-8 border-b border-dotted border-bordo print:block"
              />
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[0.95rem] text-inchiostro-tenue print:mt-6">
        Fonte dei dati: elenchi pubblici di Regione Lombardia, carte dei servizi pubblicate dalle
        strutture, siti ufficiali. Le rette sono indicative e vanno verificate con la struttura.
        Aggiornata ad agosto 2026 — guidarsa.it
      </p>

      <div className="print:hidden">
        <Link
          href={percorsi.guide()}
          className="font-medium text-verde underline-offset-4 hover:underline"
        >
          Tutte le guide
        </Link>
      </div>
    </article>
  );
}
