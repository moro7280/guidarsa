/**
 * Marchio GuidaRSA: il segnavia.
 *
 * Una targa direzionale con gli angoli addolciti e la punta arrotondata —
 * indica la strada senza iconografia clinica. Il simbolo e in verde della
 * palette, mai in grigio tecnico, e la sagoma piena regge fino a 16 px.
 *
 * Il wordmark e testo HTML, non un tracciato: resta selezionabile, leggibile
 * dagli assistenti vocali e nitido a ogni densita di schermo.
 */

/** Sagoma del segnavia, riusata da header, footer, favicon e Open Graph. */
export const TRACCIATO_SEGNAVIA =
  "M11 13h18a5 5 0 0 1 3.66 1.6l7.9 8.5a2.8 2.8 0 0 1 0 3.8l-7.9 8.5A5 5 0 0 1 29 37H11a5 5 0 0 1-5-5V18a5 5 0 0 1 5-5z";

export function Segnavia({
  dimensione = 32,
  colore = "var(--verde)",
  punto = "var(--carta)",
  className,
}: {
  dimensione?: number;
  colore?: string;
  punto?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={dimensione}
      height={dimensione}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRACCIATO_SEGNAVIA} fill={colore} />
      <circle cx="17" cy="25" r="4.2" fill={punto} />
    </svg>
  );
}

export function Logo({
  variante = "chiaro",
  dimensione = 32,
}: {
  variante?: "chiaro" | "scuro";
  dimensione?: number;
}) {
  const scuro = variante === "scuro";

  return (
    <span className="inline-flex items-center gap-2.5">
      <Segnavia
        dimensione={dimensione}
        colore={scuro ? "#5fa98f" : "var(--verde)"}
        punto={scuro ? "var(--inchiostro)" : "var(--carta)"}
      />
      <span className="inline-flex items-baseline gap-[0.15em] leading-none">
        <span
          className={`font-serif text-[1.35rem] font-semibold ${
            scuro ? "text-carta" : "text-inchiostro"
          }`}
        >
          Guida
        </span>
        <span
          className={`font-sans text-[1.22rem] font-bold tracking-[0.055em] ${
            scuro ? "text-[#5fa98f]" : "text-verde"
          }`}
        >
          RSA
        </span>
      </span>
    </span>
  );
}
