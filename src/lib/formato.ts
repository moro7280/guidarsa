/**
 * Formattazione dei numeri all'italiana.
 *
 * Non usiamo `toLocaleString("it-IT")`: su questo runtime restituisce "1841"
 * invece di "1.841", quindi tutte le rette del sito uscivano senza separatore.
 * Un formattatore esplicito ha anche un secondo vantaggio: server e browser
 * producono la stessa identica stringa, quindi nessun disallineamento in
 * idratazione.
 */
export function numero(valore: number): string {
  const intero = Math.round(valore);
  const segno = intero < 0 ? "-" : "";
  const cifre = Math.abs(intero).toString();
  const gruppi = cifre.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${segno}${gruppi}`;
}

/** "2.070 €" */
export function euro(valore: number): string {
  return `${numero(valore)} €`;
}
