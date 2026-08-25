/**
 * Quale commit sta servendo la produzione.
 *
 * Serve a rispondere a una domanda che finora non aveva risposta senza aprire
 * la dashboard: il sito online e quello che ho in mano? La differenza non e
 * accademica. La sitemap e dinamica e legge il database a ogni richiesta, le
 * pagine sono statiche e nascono al build: se si scrive sul database senza
 * ridistribuire, la sitemap comincia a dichiarare a Google URL che il build in
 * produzione non conosce, e quelle rispondono 404. E successo davvero con la
 * Toscana, per cinque giorni, senza che niente lo segnalasse.
 *
 * `VERCEL_GIT_COMMIT_SHA` lo mette Vercel al momento del build, quindi qui
 * dentro c'e il commit **effettivamente distribuito**, non quello che il repo
 * locale crede di aver mandato. In locale non esiste e la rotta dice "locale".
 */

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "locale",
      ramo: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      ambiente: process.env.VERCEL_ENV ?? "sviluppo",
    },
    // Senza questo la CDN servirebbe la risposta del deploy precedente, che e
    // esattamente il dato che stiamo cercando di smentire.
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
