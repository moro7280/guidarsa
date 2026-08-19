import Link from "next/link";
import { CtaPrimaria } from "@/components/Cta";
import { RicercaComune, type VoceComune } from "@/components/RicercaComune";
import { GUIDE } from "@/lib/guide";
import { percorsi } from "@/lib/percorsi";
import { slugify } from "@/lib/slug";
import {
  getCombinazioni,
  getStrutture,
  getTipologieDisponibili,
} from "@/lib/strutture";
import { TIPOLOGIE } from "@/lib/tipologie";

export default async function Home() {
  const tipologie = await getTipologieDisponibili();
  const tipologiaPrincipale = tipologie[0];
  const strutture = await getStrutture();
  const combinazioni = await getCombinazioni();

  const comuniPerRicerca: VoceComune[] = [];
  const visti = new Set<string>();
  for (const struttura of strutture) {
    if (visti.has(struttura.comune)) continue;
    const combinazione = combinazioni.find(
      (c) => c.tipologia === struttura.tipologia && c.comune === slugify(struttura.comune),
    );
    if (!combinazione) continue;
    visti.add(struttura.comune);
    comuniPerRicerca.push({
      nome: struttura.comune,
      provincia: struttura.provincia_sigla,
      percorso: percorsi.comune(
        combinazione.tipologia,
        combinazione.regione,
        combinazione.provincia,
        combinazione.comune,
      ),
    });
  }
  comuniPerRicerca.sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  const province = new Set(strutture.map((struttura) => struttura.provincia)).size;
  const conRetta = strutture.filter((struttura) => struttura.prezzo_min !== null).length;
  const conContatto = strutture.filter(
    (struttura) => struttura.telefono || struttura.email || struttura.sito_web,
  ).length;

  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h1 className="max-w-3xl text-[2.1rem] font-semibold leading-[1.15] sm:text-[2.6rem]">
            Scegliere una RSA per un genitore, con i dati sul tavolo
          </h1>
          <p className="max-w-2xl text-lg text-inchiostro-medio">
            {strutture.length} strutture censite dagli elenchi pubblici regionali, con contatti,
            posti letto e — dove la struttura la pubblica — la retta presa dalla sua carta dei
            servizi. Nessun intermediario: i recapiti sono quelli della struttura.
          </p>
        </div>

        <div className="rounded-lg border border-bordo bg-superficie p-5 sm:p-6">
          <RicercaComune comuni={comuniPerRicerca} />
          <div className="mt-5 border-t border-bordo-tenue pt-5">
            <p className="mb-3 text-[0.95rem] text-inchiostro-medio">
              Oppure rispondi a cinque domande e restringiamo la ricerca insieme.
            </p>
            <CtaPrimaria />
          </div>
          <p className="mt-3 text-sm text-inchiostro-tenue">
            {comuniPerRicerca.length} comuni coperti, per ora tutti in Lombardia.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-bordo bg-bordo sm:grid-cols-4">
          {[
            { valore: strutture.length, etichetta: "strutture censite" },
            { valore: province, etichetta: "province" },
            { valore: conContatto, etichetta: "con contatti verificati" },
            { valore: conRetta, etichetta: "con retta documentata" },
          ].map((dato) => (
            <div key={dato.etichetta} className="bg-superficie px-4 py-4">
              <dt className="numeri font-serif text-2xl font-semibold text-verde">{dato.valore}</dt>
              <dd className="mt-0.5 text-sm leading-snug text-inchiostro-tenue">{dato.etichetta}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Come funziona</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            {
              titolo: "Parti dal comune",
              testo:
                "Cerchi il comune e vedi tutte le strutture censite lì, con posti letto, convenzione e nucleo Alzheimer quando il dato esiste.",
            },
            {
              titolo: "Confronti quello che c'è",
              testo:
                "Ogni scheda dice da dove viene ciascun dato e quando è stato controllato. Se un'informazione non ce l'abbiamo, lo scriviamo invece di lasciare un vuoto ambiguo.",
            },
            {
              titolo: "Chiami la struttura",
              testo:
                "I recapiti portano alla struttura, non a un call center. Non riceviamo compensi per i contatti e non vendiamo posti letto.",
            },
          ].map((passo, indice) => (
            <li key={passo.titolo} className="flex flex-col gap-2">
              <span className="numeri font-serif text-lg font-semibold text-verde">
                {indice + 1}.
              </span>
              <h3 className="text-lg font-semibold">{passo.titolo}</h3>
              <p className="text-[0.98rem] leading-relaxed text-inchiostro-medio">{passo.testo}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Che tipo di struttura stai cercando?</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {tipologie.map((slug) => (
            <li key={slug}>
              <Link
                href={percorsi.tipologia(slug)}
                className="flex h-full flex-col gap-2 rounded-lg border border-bordo bg-superficie p-5 transition-colors hover:border-verde"
              >
                <span className="font-serif text-lg font-semibold text-inchiostro">
                  {TIPOLOGIE[slug].plurale}
                </span>
                <span className="text-[0.98rem] leading-relaxed text-inchiostro-medio">
                  {TIPOLOGIE[slug].descrizione}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {tipologiaPrincipale && (
        <section>
          <h2 className="text-2xl font-semibold">Guide per orientarsi</h2>
          <p className="mt-2 max-w-2xl text-inchiostro-medio">
            Le domande che tornano più spesso, con risposte concrete.
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {GUIDE.map((guida) => (
              <li key={guida.slug}>
                <Link
                  href={percorsi.guida(guida.slug)}
                  className="flex flex-col gap-1.5 rounded-lg border border-bordo bg-superficie p-5 transition-colors hover:border-verde"
                >
                  <span className="font-serif text-lg font-semibold text-inchiostro">
                    {guida.titolo}
                  </span>
                  <span className="text-[0.98rem] leading-relaxed text-inchiostro-medio">
                    {guida.descrizione}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

