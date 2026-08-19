"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface VoceComune {
  nome: string;
  provincia: string;
  percorso: string;
}

/**
 * Ricerca per comune: un campo con elenco nativo, nessuna libreria.
 *
 * `<datalist>` fa il lavoro di completamento con il widget del sistema
 * operativo — su telefono e piu affidabile e piu accessibile di un menu
 * costruito a mano, e non costa un solo kilobyte di JavaScript in piu.
 */
export function RicercaComune({ comuni }: { comuni: VoceComune[] }) {
  const router = useRouter();
  const [valore, setValore] = useState("");
  const [errore, setErrore] = useState<string | null>(null);

  const indice = useMemo(() => {
    const mappa = new Map<string, VoceComune>();
    for (const comune of comuni) {
      mappa.set(comune.nome.toLowerCase(), comune);
      mappa.set(`${comune.nome} (${comune.provincia})`.toLowerCase(), comune);
    }
    return mappa;
  }, [comuni]);

  function cerca(evento: React.FormEvent) {
    evento.preventDefault();
    const scelto = indice.get(valore.trim().toLowerCase());
    if (scelto) {
      setErrore(null);
      router.push(scelto.percorso);
      return;
    }
    setErrore(
      `Non abbiamo strutture censite a "${valore.trim()}". Per ora la copertura è sulla Lombardia.`,
    );
  }

  return (
    <form onSubmit={cerca} className="w-full">
      <label htmlFor="comune" className="block text-[0.95rem] font-semibold text-inchiostro">
        In quale comune stai cercando?
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="comune"
          name="comune"
          list="elenco-comuni"
          value={valore}
          onChange={(evento) => setValore(evento.target.value)}
          placeholder="Per esempio: Bergamo"
          autoComplete="off"
          className="w-full rounded-md border border-bordo bg-superficie px-4 py-3 text-base text-inchiostro placeholder:text-inchiostro-tenue focus:border-verde"
        />
        <datalist id="elenco-comuni">
          {comuni.map((comune) => (
            <option key={comune.percorso} value={`${comune.nome} (${comune.provincia})`} />
          ))}
        </datalist>
        <button
          type="submit"
          className="rounded-md bg-verde px-6 py-3 font-semibold text-carta transition-colors hover:bg-verde-scuro sm:w-auto"
        >
          Cerca
        </button>
      </div>
      {errore && (
        <p role="alert" className="mt-2 text-[0.95rem] text-ambra">
          {errore}
        </p>
      )}
    </form>
  );
}
