"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  BUDGET,
  RELAZIONI,
  TESTO_CONSENSO_CONDIVISIONE,
  TESTO_CONSENSO_CONTATTO,
  TIPI_ASSISTENZA,
  URGENZE,
  VERSIONE_INFORMATIVA,
  type Opzione,
} from "@/lib/conversione";
import { getSupabaseClient } from "@/lib/supabase";
import type { VoceComune } from "./RicercaComune";

/**
 * Richiesta informazioni in sei schermate.
 *
 * La frizione e voluta: chi arriva in fondo ha risposto a cinque domande, e
 * quello che chiediamo serve davvero a orientare la risposta. Ma il prezzo
 * resta visibile ovunque sul sito senza compilare niente: la frizione qualifica,
 * non ricatta.
 *
 * Nessun campo a testo libero, per scelta: e li che le persone scrivono
 * spontaneamente diagnosi e condizioni di salute, che non vogliamo raccogliere.
 */

const PASSI = [
  "Per chi cerchi",
  "Che tipo di assistenza",
  "Dove",
  "Quando",
  "Budget",
  "Contatti",
] as const;

interface Risposte {
  relazione: string;
  tipo_assistenza: string;
  zona: string;
  tempistiche: string;
  budget: string;
  nome: string;
  telefono: string;
  email: string;
}

const VUOTE: Risposte = {
  relazione: "",
  tipo_assistenza: "",
  zona: "",
  tempistiche: "",
  budget: "",
  nome: "",
  telefono: "",
  email: "",
};

export function Wizard({
  comuni,
  strutturaId,
  strutturaNome,
  comunePrecompilato,
  paginaOrigine,
}: {
  comuni: VoceComune[];
  strutturaId?: string | null;
  strutturaNome?: string | null;
  comunePrecompilato?: string | null;
  paginaOrigine: string;
}) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [risposte, setRisposte] = useState<Risposte>({
    ...VUOTE,
    zona: comunePrecompilato ?? "",
  });
  const [consensoContatto, setConsensoContatto] = useState(false);
  const [consensoCondivisione, setConsensoCondivisione] = useState(false);
  const [esca, setEsca] = useState("");
  const [dettaglio, setDettaglio] = useState<string | null>(null);
  // Istante di apertura del modulo: un invio in meno di due secondi non è
  // umano. È il controllo antibot che nessun gestore di password può falsare,
  // ed è il motivo per cui l'esca non deve più portare tutto il peso.
  const [apertoIl] = useState(() => Date.now());
  const [invio, setInvio] = useState<"fermo" | "corso" | "errore">("fermo");

  const aggiorna = (campo: keyof Risposte, valore: string) =>
    setRisposte((precedenti) => ({ ...precedenti, [campo]: valore }));

  function avanti(campo: keyof Risposte, valore: string) {
    aggiorna(campo, valore);
    setPasso((p) => Math.min(p + 1, PASSI.length - 1));
  }

  async function invia(evento: React.FormEvent) {
    evento.preventDefault();
    if (!consensoContatto) return;
    setInvio("corso");

    // Due controlli antibot, entrambi silenziosi: esca compilata oppure invio
    // in meno di due secondi. Fingiamo il successo senza scrivere nulla, così
    // il bot non impara cosa lo ha fermato.
    if (esca.trim() !== "" || Date.now() - apertoIl < 2000) {
      router.push("/grazie/");
      return;
    }

    // Il try/catch non e ridondante rispetto a `error`: se la rete cade o il
    // client lancia, la promise viene rifiutata e senza cattura lo stato
    // resterebbe su "corso" per sempre, con il pulsante disabilitato e
    // "Invio in corso…" a schermo. Le risposte restano nello stato, quindi
    // dopo l'errore si riprova senza ricompilare niente.
    try {
      const { error } = await getSupabaseClient()
        .from("leads")
        .insert({
          nome: risposte.nome.trim(),
          email: risposte.email.trim() || null,
          telefono: risposte.telefono.trim() || null,
          zona: risposte.zona.trim() || null,
          budget: risposte.budget || null,
          tempistiche: risposte.tempistiche || null,
          relazione: risposte.relazione || null,
          tipo_assistenza: risposte.tipo_assistenza || null,
          struttura_id: strutturaId ?? null,
          pagina_origine: paginaOrigine,
          consenso_contatto: true,
          consenso_condivisione: consensoCondivisione,
          consenso_testo_versione: VERSIONE_INFORMATIVA,
          consenso_il: new Date().toISOString(),
        });

      if (error) {
        setDettaglio(`${error.code ?? "?"}: ${error.message}`);
        setInvio("errore");
        return;
      }
    } catch (eccezione) {
      setDettaglio(eccezione instanceof Error ? eccezione.message : String(eccezione));
      setInvio("errore");
      return;
    }

    router.push("/grazie/");
  }

  const percentuale = Math.round(((passo + 1) / PASSI.length) * 100);
  const contattoValido =
    risposte.nome.trim().length > 1 &&
    (risposte.telefono.trim().length > 5 || risposte.email.trim().includes("@"));

  return (
    <div className="rounded-lg border border-bordo bg-superficie p-5 sm:p-7">
      <div className="mb-6">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-inchiostro">{PASSI[passo]}</span>
          <span className="numeri text-inchiostro-tenue">
            Passo {passo + 1} di {PASSI.length}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-carta"
          role="progressbar"
          aria-valuenow={percentuale}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avanzamento della richiesta"
        >
          <div className="h-full bg-verde transition-all" style={{ width: `${percentuale}%` }} />
        </div>
      </div>

      {strutturaNome && passo === 0 && (
        <p className="mb-5 rounded-md bg-verde-tenue px-4 py-3 text-[0.95rem] text-verde">
          Richiesta riferita a <strong>{strutturaNome}</strong>.
        </p>
      )}

      {passo === 0 && (
        <Domanda
          titolo="Per chi stai cercando assistenza?"
          aiuto="Serve a capire chi ci parlerà e con quale ruolo: cambia il tipo di informazioni utili."
          opzioni={RELAZIONI}
          scelto={risposte.relazione}
          onScelta={(valore) => avanti("relazione", valore)}
        />
      )}

      {passo === 1 && (
        <Domanda
          titolo="Che tipo di assistenza serve?"
          aiuto="Rispondi con quello che sai oggi. Non chiediamo condizioni di salute: solo il tipo di servizio."
          opzioni={TIPI_ASSISTENZA}
          scelto={risposte.tipo_assistenza}
          onScelta={(valore) => avanti("tipo_assistenza", valore)}
        />
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-4">
          <Intestazione
            titolo="In quale comune?"
            aiuto="Puoi indicare il comune della persona assistita o quello dove vi è più comodo andare a trovarla: la vicinanza a chi visita conta più di quanto si pensi."
          />
          <input
            list="comuni-wizard"
            value={risposte.zona}
            onChange={(evento) => aggiorna("zona", evento.target.value)}
            placeholder="Per esempio: Bergamo"
            autoComplete="off"
            className="w-full rounded-md border border-bordo px-4 py-3 text-base"
          />
          <datalist id="comuni-wizard">
            {comuni.map((comune) => (
              <option key={comune.percorso} value={`${comune.nome} (${comune.provincia})`} />
            ))}
          </datalist>
          <Navigazione
            indietro={() => setPasso(1)}
            avanti={() => setPasso(3)}
            abilitato={risposte.zona.trim().length > 1}
          />
        </div>
      )}

      {passo === 3 && (
        <Domanda
          titolo="Entro quando servirebbe?"
          aiuto="Non è un impegno. Serve a capire se cercare posti disponibili subito o se c'è tempo per valutare con calma."
          opzioni={URGENZE}
          scelto={risposte.tempistiche}
          onScelta={(valore) => avanti("tempistiche", valore)}
          indietro={() => setPasso(2)}
        />
      )}

      {passo === 4 && (
        <Domanda
          titolo="Che budget mensile avete in mente?"
          aiuto="In Lombardia la retta mediana documentata è di 2.070 € al mese. Se non lo sai ancora, dillo: è la risposta più comune."
          opzioni={BUDGET}
          scelto={risposte.budget}
          onScelta={(valore) => avanti("budget", valore)}
          indietro={() => setPasso(3)}
        />
      )}

      {passo === 5 && (
        <form onSubmit={invia} className="flex flex-col gap-4">
          <Intestazione
            titolo="Come possiamo ricontattarti?"
            aiuto="Bastano il nome e un recapito. Ti rispondiamo noi: non giriamo il tuo numero a nessuno senza il tuo consenso esplicito."
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.95rem] font-medium">Nome e cognome</span>
            <input
              required
              value={risposte.nome}
              onChange={(evento) => aggiorna("nome", evento.target.value)}
              autoComplete="name"
              className="rounded-md border border-bordo px-4 py-3 text-base"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.95rem] font-medium">Telefono</span>
              <input
                type="tel"
                value={risposte.telefono}
                onChange={(evento) => aggiorna("telefono", evento.target.value)}
                autoComplete="tel"
                className="rounded-md border border-bordo px-4 py-3 text-base"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.95rem] font-medium">Email</span>
              <input
                type="email"
                value={risposte.email}
                onChange={(evento) => aggiorna("email", evento.target.value)}
                autoComplete="email"
                className="rounded-md border border-bordo px-4 py-3 text-base"
              />
            </label>
          </div>
          <p className="-mt-1 text-sm text-inchiostro-tenue">
            Almeno uno dei due: senza recapito non possiamo risponderti.
          </p>

          {/* Esca per i bot. Il nome non richiama niente che un gestore di
              password voglia riempire — nessun "user", "mail", "tel", "nome" —
              ed è marcata con gli attributi che 1Password e LastPass rispettano.
              Non possiamo permetterci di perdere chi usa un password manager. */}
          <div aria-hidden="true" className="absolute left-[-9999px] top-0">
            <label htmlFor="riferimento-interno">Riferimento interno</label>
            <input
              id="riferimento-interno"
              name="riferimento-interno"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              value={esca}
              onChange={(evento) => setEsca(evento.target.value)}
            />
          </div>

          <fieldset className="mt-2 flex flex-col gap-3 rounded-md border border-bordo bg-carta p-4">
            <legend className="px-1 text-sm font-semibold">Consensi</legend>

            <label className="flex items-start gap-3 text-[0.95rem]">
              <input
                type="checkbox"
                checked={consensoContatto}
                onChange={(evento) => setConsensoContatto(evento.target.checked)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                {TESTO_CONSENSO_CONTATTO}{" "}
                <span className="text-inchiostro-tenue">(necessario per rispondere)</span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-[0.95rem]">
              <input
                type="checkbox"
                checked={consensoCondivisione}
                onChange={(evento) => setConsensoCondivisione(evento.target.checked)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                {TESTO_CONSENSO_CONDIVISIONE}{" "}
                <span className="text-inchiostro-tenue">(facoltativo)</span>
              </span>
            </label>

            <p className="text-sm text-inchiostro-tenue">
              Titolare del trattamento: GuidaRSA. Puoi revocare il consenso e chiedere la
              cancellazione in qualsiasi momento scrivendo a info@guidarsa.it. Dettagli
              nell&apos;
              <Link href="/privacy/" className="text-verde underline underline-offset-4">
                informativa privacy
              </Link>
              .
            </p>
          </fieldset>

          {invio === "errore" && (
            <div role="alert" className="rounded-md bg-ambra-tenue px-4 py-3 text-[0.95rem] text-ambra">
              <p>
                Non siamo riusciti a inviare la richiesta. Le tue risposte sono salvate: riprova fra
                un momento, oppure scrivici a info@guidarsa.it.
              </p>
              {/* Dettaglio tecnico solo in sviluppo: in produzione non deve mai
                  comparire, ma in fase di test fa risparmiare mezz'ora di diagnosi. */}
              {process.env.NODE_ENV !== "production" && dettaglio && (
                <p className="mt-2 border-t border-ambra/30 pt-2 font-mono text-xs">
                  [solo in sviluppo] {dettaglio}
                </p>
              )}
            </div>
          )}

          <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setPasso(4)}
              className="rounded-md border border-bordo px-5 py-3 font-medium text-inchiostro-medio hover:border-verde"
            >
              Indietro
            </button>
            <button
              type="submit"
              disabled={!consensoContatto || !contattoValido || invio === "corso"}
              className="rounded-md bg-verde px-6 py-3 font-semibold text-carta transition-colors hover:bg-verde-scuro disabled:cursor-not-allowed disabled:opacity-50"
            >
              {invio === "corso" ? "Invio in corso…" : "Invia la richiesta"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Intestazione({ titolo, aiuto }: { titolo: string; aiuto: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-xl font-semibold sm:text-2xl">{titolo}</h2>
      <p className="text-[0.98rem] leading-relaxed text-inchiostro-medio">{aiuto}</p>
    </div>
  );
}

function Domanda({
  titolo,
  aiuto,
  opzioni,
  scelto,
  onScelta,
  indietro,
}: {
  titolo: string;
  aiuto: string;
  opzioni: Opzione[];
  scelto: string;
  onScelta: (valore: string) => void;
  indietro?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Intestazione titolo={titolo} aiuto={aiuto} />
      <ul className="flex flex-col gap-2.5">
        {opzioni.map((opzione) => (
          <li key={opzione.valore}>
            <button
              type="button"
              onClick={() => onScelta(opzione.valore)}
              aria-pressed={scelto === opzione.valore}
              className={`w-full rounded-md border px-4 py-3.5 text-left transition-colors ${
                scelto === opzione.valore
                  ? "border-verde bg-verde-tenue"
                  : "border-bordo hover:border-verde"
              }`}
            >
              <span className="block font-medium text-inchiostro">{opzione.etichetta}</span>
              {opzione.aiuto && (
                <span className="mt-0.5 block text-sm text-inchiostro-tenue">{opzione.aiuto}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {indietro && (
        <button
          type="button"
          onClick={indietro}
          className="self-start rounded-md border border-bordo px-5 py-2.5 font-medium text-inchiostro-medio hover:border-verde"
        >
          Indietro
        </button>
      )}
    </div>
  );
}

function Navigazione({
  indietro,
  avanti,
  abilitato,
}: {
  indietro: () => void;
  avanti: () => void;
  abilitato: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={indietro}
        className="rounded-md border border-bordo px-5 py-3 font-medium text-inchiostro-medio hover:border-verde"
      >
        Indietro
      </button>
      <button
        type="button"
        onClick={avanti}
        disabled={!abilitato}
        className="rounded-md bg-verde px-6 py-3 font-semibold text-carta hover:bg-verde-scuro disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continua
      </button>
    </div>
  );
}
