"use client";

import Link from "next/link";
import { useState } from "react";
import {
  RISORSA_GUIDA,
  TESTO_CONSENSO_ISCRIZIONE,
  VERSIONE_INFORMATIVA,
} from "@/lib/conversione";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Email in cambio della versione stampabile della guida.
 *
 * La guida resta leggibile per intero sulla pagina, senza dare niente: dietro
 * l'iscrizione c'e solo la versione da stampare o salvare in PDF. Nascondere
 * il contenuto sarebbe il trucco che abbiamo deciso di non usare, e in piu
 * toglierebbe alla pagina tutto il suo valore per chi cerca su Google.
 */
export function ModuloIscrizione({ origine }: { origine: string }) {
  const [email, setEmail] = useState("");
  const [consenso, setConsenso] = useState(false);
  const [esca, setEsca] = useState("");
  const [stato, setStato] = useState<"fermo" | "corso" | "fatto" | "errore">("fermo");

  async function iscrivi(evento: React.FormEvent) {
    evento.preventDefault();
    if (!consenso) return;
    setStato("corso");

    // Trappola per i bot: campo invisibile che un umano non compila mai.
    if (esca.trim() !== "") {
      setStato("fatto");
      return;
    }

    const { error } = await getSupabaseClient().from("iscritti").insert({
      email: email.trim().toLowerCase(),
      origine,
      risorsa: RISORSA_GUIDA,
      consenso: true,
      consenso_testo_versione: VERSIONE_INFORMATIVA,
      consenso_il: new Date().toISOString(),
    });

    // 23505 = email gia iscritta a questa risorsa: per chi legge non e un
    // errore, ha gia diritto al documento.
    if (error && error.code !== "23505") {
      setStato("errore");
      return;
    }
    setStato("fatto");
  }

  if (stato === "fatto") {
    return (
      <div className="rounded-lg border border-verde/30 bg-verde-tenue p-5 print:hidden">
        <h2 className="font-serif text-xl font-semibold text-inchiostro">Ecco la guida</h2>
        <p className="mt-2 text-[0.97rem] leading-relaxed text-inchiostro-medio">
          Puoi stamparla o salvarla in PDF: nella finestra di stampa scegli
          &laquo;Salva come PDF&raquo; come destinazione. È già impaginata per la carta, senza menu
          né pulsanti.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-verde px-6 py-3 font-semibold text-carta transition-colors hover:bg-verde-scuro"
        >
          Stampa o salva in PDF
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={iscrivi}
      className="rounded-lg border border-verde/30 bg-verde-tenue p-5 print:hidden"
    >
      <h2 className="font-serif text-xl font-semibold text-inchiostro">
        Vuoi portartela dietro in visita?
      </h2>
      <p className="mt-2 max-w-2xl text-[0.97rem] leading-relaxed text-inchiostro-medio">
        Lascia la tua email e sblocchi subito la versione stampabile, con le domande da fare
        raccolte in una pagina da compilare durante la visita. La guida qui sopra resta comunque
        leggibile per intero.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">La tua email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            placeholder="La tua email"
            autoComplete="email"
            className="w-full rounded-md border border-bordo bg-superficie px-4 py-3 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={!consenso || stato === "corso"}
          className="rounded-md bg-verde px-6 py-3 font-semibold text-carta transition-colors hover:bg-verde-scuro disabled:cursor-not-allowed disabled:opacity-50"
        >
          {stato === "corso" ? "Un attimo…" : "Sblocca la guida"}
        </button>
      </div>

      {/* Esca per i bot. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label>
          Non compilare
          <input
            tabIndex={-1}
            autoComplete="off"
            value={esca}
            onChange={(evento) => setEsca(evento.target.value)}
          />
        </label>
      </div>

      <label className="mt-4 flex items-start gap-3 text-[0.95rem] text-inchiostro-medio">
        <input
          type="checkbox"
          checked={consenso}
          onChange={(evento) => setConsenso(evento.target.checked)}
          className="mt-1 h-4 w-4 shrink-0"
        />
        <span>{TESTO_CONSENSO_ISCRIZIONE}</span>
      </label>

      <p className="mt-3 text-sm text-inchiostro-tenue">
        Titolare: GuidaRSA. Nessuna cessione a terzi. Dettagli nell&apos;
        <Link href="/privacy/" className="text-verde underline underline-offset-4">
          informativa privacy
        </Link>
        .
      </p>

      {stato === "errore" && (
        <p role="alert" className="mt-3 text-[0.95rem] text-ambra">
          Non siamo riusciti a registrare l&apos;iscrizione. Riprova, oppure scrivici a
          info@guidarsa.it e ti mandiamo la guida a mano.
        </p>
      )}
    </form>
  );
}
