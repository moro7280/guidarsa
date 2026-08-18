import type { Tipologia } from "./types";

export interface InfoTipologia {
  slug: Tipologia;
  /** Usato negli H1 e nei title, a inizio frase. */
  plurale: string;
  /** Usato all'interno di una frase, in minuscolo. */
  pluraleInFrase: string;
  singolare: string;
  /** Articolo partitivo: "delle case di riposo", "dei centri diurni". */
  articoloDi: string;
  /** "tutte le" / "tutti i", per i link di approfondimento. */
  tutti: string;
  descrizione: string;
}

export const TIPOLOGIE: Record<Tipologia, InfoTipologia> = {
  rsa: {
    slug: "rsa",
    plurale: "RSA",
    pluraleInFrase: "RSA",
    singolare: "RSA",
    articoloDi: "delle",
    tutti: "tutte le",
    descrizione:
      "Residenze sanitarie assistenziali per anziani non autosufficienti, con assistenza medica e infermieristica continuativa.",
  },
  "casa-di-riposo": {
    slug: "casa-di-riposo",
    plurale: "Case di riposo",
    pluraleInFrase: "case di riposo",
    singolare: "Casa di riposo",
    articoloDi: "delle",
    tutti: "tutte le",
    descrizione:
      "Strutture residenziali per anziani parzialmente autosufficienti, con servizi alberghieri e assistenza di base.",
  },
  "centro-diurno": {
    slug: "centro-diurno",
    plurale: "Centri diurni",
    pluraleInFrase: "centri diurni",
    singolare: "Centro diurno",
    articoloDi: "dei",
    tutti: "tutti i",
    descrizione:
      "Servizi semiresidenziali che accolgono l'anziano durante il giorno, mantenendo la permanenza a casa la sera.",
  },
  "assistenza-domiciliare": {
    slug: "assistenza-domiciliare",
    plurale: "Servizi di assistenza domiciliare",
    pluraleInFrase: "servizi di assistenza domiciliare",
    singolare: "Servizio di assistenza domiciliare",
    articoloDi: "dei",
    tutti: "tutti i",
    descrizione:
      "Assistenza sanitaria e di cura erogata direttamente al domicilio dell'anziano.",
  },
};

export const SLUG_TIPOLOGIE = Object.keys(TIPOLOGIE) as Tipologia[];

export function isTipologia(valore: string): valore is Tipologia {
  return valore in TIPOLOGIE;
}

/** Restituisce le info della tipologia, oppure null se lo slug non è valido. */
export function getTipologia(valore: string): InfoTipologia | null {
  return isTipologia(valore) ? TIPOLOGIE[valore] : null;
}
