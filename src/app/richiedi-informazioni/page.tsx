import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wizard } from "@/components/Wizard";
import type { VoceComune } from "@/components/RicercaComune";
import { conversioneAttiva } from "@/lib/conversione";
import { percorsi } from "@/lib/percorsi";
import { metadataPagina } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import { getCombinazioni, getStrutture, getStrutturaBySlug } from "@/lib/strutture";

export const metadata: Metadata = metadataPagina({
  titolo: "Richiedi informazioni sulle strutture per anziani",
  descrizione:
    "Rispondi a cinque domande e ti aiutiamo a restringere la ricerca: zona, tipo di assistenza, tempi e budget. Gratuito per le famiglie.",
  percorso: "/richiedi-informazioni/",
});

export default async function PaginaRichiesta({
  searchParams,
}: {
  searchParams: Promise<{ struttura?: string; comune?: string }>;
}) {
  // Interruttore generale: spento, la pagina non esiste.
  if (!conversioneAttiva()) notFound();

  const { struttura: slugStruttura, comune } = await searchParams;

  const struttura = slugStruttura ? await getStrutturaBySlug(slugStruttura) : null;
  const strutture = await getStrutture();
  const combinazioni = await getCombinazioni();

  const comuni: VoceComune[] = [];
  const visti = new Set<string>();
  for (const voce of strutture) {
    if (visti.has(voce.comune)) continue;
    const combinazione = combinazioni.find(
      (c) => c.tipologia === voce.tipologia && c.comune === slugify(voce.comune),
    );
    if (!combinazione) continue;
    visti.add(voce.comune);
    comuni.push({
      nome: voce.comune,
      provincia: voce.provincia_sigla,
      percorso: percorsi.comune(
        combinazione.tipologia,
        combinazione.regione,
        combinazione.provincia,
        combinazione.comune,
      ),
    });
  }
  comuni.sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  const comunePrecompilato = struttura
    ? `${struttura.comune} (${struttura.provincia_sigla})`
    : (comune ?? null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-[1.9rem] font-semibold leading-tight sm:text-[2.3rem]">
          Ti aiutiamo a restringere la ricerca
        </h1>
        <p className="text-lg text-inchiostro-medio">
          Cinque domande, due minuti. Sono le stesse che faremmo al telefono, e servono a proporti
          strutture che abbiano senso per la vostra situazione — non un elenco a caso.
        </p>
        <p className="text-[0.95rem] text-inchiostro-tenue">
          Il servizio è gratuito per le famiglie. Le rette e i contatti delle strutture restano
          visibili sul sito senza compilare nulla.
        </p>
      </header>

      <Wizard
        comuni={comuni}
        strutturaId={struttura?.id ?? null}
        strutturaNome={struttura?.nome ?? null}
        comunePrecompilato={comunePrecompilato}
        paginaOrigine={
          struttura ? percorsi.struttura(struttura.slug) : "/richiedi-informazioni/"
        }
      />
    </div>
  );
}
