/**
 * Avviso mostrato finché il sito gira sui dati dimostrativi.
 * CLAUDE.md: i dati demo devono essere marcati come tali, mai spacciati per reali.
 */
export function AvvisoDemo() {
  return (
    <p className="rounded-md border border-ambra/40 bg-ambra-tenue px-4 py-3 text-sm text-inchiostro-medio">
      <strong>Dati dimostrativi.</strong> Le strutture elencate sono esempi fittizi, usati per
      sviluppare il sito. Nessun contatto è reale: i dati verranno sostituiti con gli open data
      regionali e le informazioni verificate delle strutture.
    </p>
  );
}
