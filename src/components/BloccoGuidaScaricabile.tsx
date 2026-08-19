import Link from "next/link";
import { conversioneAttiva } from "@/lib/conversione";

/**
 * Invito alla guida scaricabile. Passa dallo stesso interruttore delle CTA:
 * la guida resta leggibile, ma il richiamo compare solo a conversione attiva.
 */
export function BloccoGuidaScaricabile({ compatto = false }: { compatto?: boolean }) {
  if (!conversioneAttiva()) return null;

  return (
    <section className="rounded-lg border border-sabbia bg-sabbia-tenue p-5 sm:p-6">
      <h2 className="font-serif text-xl font-semibold text-inchiostro">
        La guida da portare in visita
      </h2>
      <p className="mt-2 max-w-2xl text-[0.97rem] leading-relaxed text-inchiostro-medio">
        Sette passi per scegliere una RSA e le dieci domande da fare durante la visita, con i dati
        reali delle strutture censite. Da leggere qui o da stampare.
      </p>
      <div className="mt-4">
        <Link
          href="/guide/come-scegliere-rsa-7-passi/"
          className={
            compatto
              ? "inline-flex items-center justify-center rounded-md border border-verde px-5 py-2.5 font-semibold text-verde transition-colors hover:bg-verde-tenue"
              : "inline-flex items-center justify-center rounded-md bg-verde px-6 py-3 font-semibold text-carta transition-colors hover:bg-verde-scuro"
          }
        >
          Apri la guida in 7 passi
        </Link>
      </div>
    </section>
  );
}
