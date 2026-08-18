import Link from "next/link";
import { percorsi } from "@/lib/percorsi";

export default function NonTrovata() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Pagina non trovata</h1>
      <p className="text-slate-700">
        La pagina che cerchi non esiste o non contiene ancora strutture censite.
      </p>
      <p>
        <Link href={percorsi.home()} className="text-teal-700 hover:underline">
          Torna alla home
        </Link>
      </p>
    </div>
  );
}
