import type { Metadata } from "next";
import {
  TESTO_CONSENSO_CONDIVISIONE,
  TESTO_CONSENSO_CONTATTO,
  VERSIONE_INFORMATIVA,
} from "@/lib/conversione";
import { metadataPagina } from "@/lib/seo";

export const metadata: Metadata = metadataPagina({
  titolo: "Informativa privacy",
  descrizione:
    "Come GuidaRSA tratta i dati personali di chi visita il sito e di chi invia una richiesta di informazioni.",
  percorso: "/privacy/",
});

const AGGIORNAMENTO = "19 agosto 2026";

export default function PaginaPrivacy() {
  return (
    <article className="mx-auto flex max-w-[68ch] flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-[1.9rem] font-semibold leading-tight sm:text-[2.2rem]">
          Informativa privacy
        </h1>
        <p className="text-inchiostro-tenue">
          Versione <span className="numeri">{VERSIONE_INFORMATIVA}</span> — aggiornata al{" "}
          {AGGIORNAMENTO}
        </p>
      </header>

      <p className="rounded-md border border-ambra/40 bg-ambra-tenue px-4 py-3 text-[0.97rem] leading-relaxed text-inchiostro-medio">
        <strong className="font-semibold text-ambra">Bozza.</strong> Questo testo è una bozza
        preparata internamente e non è ancora stata rivista da un professionista. Serve a
        documentare cosa facciamo davvero con i dati; prima che il modulo di richiesta informazioni
        sia attivo, il testo va verificato da chi ha competenza legale.
      </p>

      <Sezione titolo="Titolare del trattamento">
        <p>
          Il titolare è GuidaRSA. Per qualsiasi questione relativa ai dati personali puoi scrivere a{" "}
          <a href="mailto:info@guidarsa.it" className="text-verde underline underline-offset-4">
            info@guidarsa.it
          </a>
          .
        </p>
      </Sezione>

      <Sezione titolo="Quali dati raccogliamo">
        <p>
          <strong>Se ti limiti a navigare</strong>, non raccogliamo dati personali: il sito non usa
          cookie di profilazione e non ha strumenti di tracciamento pubblicitario.
        </p>
        <p>
          <strong>Se invii una richiesta di informazioni</strong>, raccogliamo: nome, telefono ed
          email (almeno uno dei due recapiti), il comune di ricerca, per chi stai cercando, il tipo
          di assistenza cercata, i tempi e la fascia di budget indicata, oltre alla pagina da cui è
          partita la richiesta e alla struttura eventualmente collegata.
        </p>
        <p>
          <strong>Non chiediamo dati sulla salute.</strong> Le opzioni sul tipo di assistenza
          descrivono un servizio, non una condizione clinica, e nel modulo non esiste un campo a
          testo libero proprio per evitare che vengano inseriti spontaneamente dati sanitari. Se ce
          ne comunichi ugualmente per iscritto, li cancelliamo.
        </p>
      </Sezione>

      <Sezione titolo="Perché li trattiamo e con quale base giuridica">
        <p>
          La base giuridica è il <strong>tuo consenso</strong> (art. 6.1.a GDPR), raccolto con due
          caselle distinte, entrambe non preselezionate:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Contatto</strong> — «{TESTO_CONSENSO_CONTATTO}» È necessario: senza, non
            possiamo risponderti.
          </li>
          <li>
            <strong>Condivisione</strong> — «{TESTO_CONSENSO_CONDIVISIONE}» È facoltativo, e
            lasciarlo vuoto non limita in alcun modo la risposta che ricevi da noi.
          </li>
        </ul>
        <p>
          Conserviamo la versione esatta del testo che hai accettato e la data, così è sempre
          ricostruibile a cosa avevi acconsentito.
        </p>
      </Sezione>

      <Sezione titolo="A chi comunichiamo i dati">
        <p>
          I dati sono conservati su Supabase, il fornitore che ospita il nostro database, e sul
          servizio di hosting Vercel. Entrambi agiscono come responsabili del trattamento.
        </p>
        <p>
          I dati vengono comunicati a una struttura per anziani <strong>solo</strong> se hai
          spuntato il consenso facoltativo alla condivisione. Non vendiamo dati a nessuno e non
          riceviamo compensi per il singolo contatto.
        </p>
      </Sezione>

      <Sezione titolo="Per quanto tempo li conserviamo">
        <p>
          Ventiquattro mesi dall&apos;invio della richiesta, o meno se ci chiedi prima la
          cancellazione. Le richieste chiuse senza esito vengono eliminate entro dodici mesi.
        </p>
      </Sezione>

      <Sezione titolo="I tuoi diritti">
        <p>
          Puoi chiedere in qualsiasi momento di <strong>accedere</strong> ai tuoi dati,{" "}
          <strong>rettificarli</strong>, <strong>cancellarli</strong>, limitarne il trattamento,
          opporti al trattamento e riceverli in formato leggibile (artt. 15-22 GDPR). Puoi{" "}
          <strong>revocare il consenso</strong> quando vuoi: la revoca non intacca la liceità di
          quanto fatto prima.
        </p>
        <p>
          Basta scrivere a{" "}
          <a href="mailto:info@guidarsa.it" className="text-verde underline underline-offset-4">
            info@guidarsa.it
          </a>
          . Hai inoltre diritto di reclamo al Garante per la protezione dei dati personali.
        </p>
      </Sezione>

      <Sezione titolo="Dati delle strutture pubblicati sul sito">
        <p>
          Le informazioni sulle strutture provengono da elenchi pubblici regionali, dai siti
          ufficiali delle strutture, dalle carte dei servizi che pubblicano e da OpenStreetMap. Non
          sono dati personali: riguardano organizzazioni. Se gestisci una struttura e vuoi correggere
          o far rimuovere un dato, scrivici e interveniamo citando la fonte.
        </p>
      </Sezione>
    </article>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-xl font-semibold">{titolo}</h2>
      <div className="flex flex-col gap-3 leading-relaxed text-inchiostro-medio">{children}</div>
    </section>
  );
}
