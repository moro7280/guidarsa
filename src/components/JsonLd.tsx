/**
 * Inserisce un blocco JSON-LD nella pagina.
 * `<` viene sostituito con l'equivalente unicode per evitare XSS via dati.
 */
export function JsonLd({ dati }: { dati: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(dati).replace(/</g, "\\u003c"),
      }}
    />
  );
}
