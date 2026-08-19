import type { Struttura } from "@/lib/types";

/**
 * Attribuzione ODbL per i dati presi da OpenStreetMap.
 *
 * Obbligo di licenza: chi usa dati OSM deve accreditare OpenStreetMap e rendere
 * chiaro che i dati sono disponibili sotto Open Database License
 * (openstreetmap.org/copyright). Compare solo dove qualcosa in pagina viene
 * davvero da OSM, e dice quali campi: un'attribuzione generica non permette
 * al lettore di distinguere le fonti.
 */
export function AttribuzioneOsm({ struttura }: { struttura: Struttura }) {
  const daOsm = Object.entries(struttura.fonte_contatti ?? {})
    .filter(([, fonte]) => fonte === "osm")
    .map(([campo]) => ETICHETTE[campo] ?? campo);

  if (daOsm.length === 0) return null;

  return (
    <p className="text-sm text-inchiostro-tenue">
      {daOsm.length === 1 ? "Il dato" : "I dati"} <strong>{daOsm.join(", ")}</strong>{" "}
      {daOsm.length === 1 ? "proviene" : "provengono"} da OpenStreetMap — ©{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        className="text-verde underline underline-offset-4"
        rel="noopener"
        target="_blank"
      >
        OpenStreetMap contributors
      </a>
      , disponibili sotto licenza ODbL.
    </p>
  );
}

const ETICHETTE: Record<string, string> = {
  telefono: "telefono",
  email: "email",
  sito_web: "sito web",
};
