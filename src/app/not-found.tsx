import Link from "next/link";
import { percorsi } from "@/lib/percorsi";

export default function NonTrovata() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Pagina non trovata</h1>
      <p className="text-inchiostro-medio">
        La pagina che cerchi non esiste o non contiene ancora strutture censite.
      </p>
      <p>
        <Link href={percorsi.home()} className="font-medium text-verde underline-offset-4 hover:underline">
          Torna alla home
        </Link>
      </p>
    </div>
  );
}
