/**
 * Converte un nome (comune, provincia, regione) nello slug usato nelle URL.
 * "Reggio nell'Emilia" -> "reggio-nell-emilia", "Forli-Cesena" -> "forli-cesena".
 */
export function slugify(valore: string): string {
  return valore
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove i segni diacritici
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
