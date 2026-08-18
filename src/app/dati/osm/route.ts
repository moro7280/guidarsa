import { getStrutture } from "@/lib/strutture";

/**
 * Estratto dei dati di provenienza OpenStreetMap, sotto ODbL.
 *
 * Perché esiste: ODbL prevede share-alike sui database derivati usati
 * pubblicamente. Finché in una data area un campo viene interamente da OSM
 * siamo in "Collective Database" e l'obbligo non scatta, ma appena mescoliamo
 * fonti diverse sullo stesso campo (prossima sessione: contatti dai siti
 * ufficiali) diventa un database derivato. Pubblicare qui il sottoinsieme che
 * viene da OSM, isolabile grazie a `fonte_contatti`, tiene la conformità
 * indipendentemente da come evolve il mix di fonti.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const strutture = await getStrutture();

  const daOsm = strutture
    .filter((struttura) =>
      Object.values(struttura.fonte_contatti ?? {}).includes("osm"),
    )
    .map((struttura) => {
      const fonti = struttura.fonte_contatti ?? {};
      return {
        slug: struttura.slug,
        osm_id: struttura.osm_id,
        confidenza_match: struttura.osm_confidenza,
        aggiornato_il: struttura.contatti_aggiornati_il,
        campi: {
          ...(fonti.telefono === "osm" ? { telefono: struttura.telefono } : {}),
          ...(fonti.email === "osm" ? { email: struttura.email } : {}),
          ...(fonti.sito_web === "osm" ? { sito_web: struttura.sito_web } : {}),
        },
      };
    });

  return Response.json(
    {
      licenza: "ODbL 1.0",
      licenza_url: "https://opendatacommons.org/licenses/odbl/1-0/",
      attribuzione: "© OpenStreetMap contributors",
      fonte: "https://www.openstreetmap.org/copyright",
      descrizione:
        "Campi di contatto delle strutture il cui valore proviene da OpenStreetMap, con il riferimento all'elemento OSM di origine.",
      elementi: daOsm.length,
      dati: daOsm,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
