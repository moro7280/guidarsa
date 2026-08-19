import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getStrutture } from "@/lib/strutture";
import { NOME_SITO } from "@/lib/seo";

/**
 * Immagine di condivisione predefinita.
 *
 * Deve essere un PNG: le anteprime social non renderizzano SVG. I caratteri
 * arrivano da sottoinsiemi TTF in src/assets/font (licenza OFL dichiarata li
 * accanto), perche la generazione avviene fuori dal browser e next/font non
 * puo servirla.
 */
export const alt = `${NOME_SITO} — strutture per anziani, comune per comune`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function carattere(nomeFile: string) {
  return readFile(path.join(process.cwd(), "src/assets/font", nomeFile));
}

export default async function Immagine() {
  const [serif, sansBold, sansRegular, strutture] = await Promise.all([
    carattere("SourceSerif4-600-subset.ttf"),
    carattere("SourceSans3-700-subset.ttf"),
    carattere("SourceSans3-400-subset.ttf"),
    getStrutture(),
  ]);

  const comuni = new Set(strutture.map((struttura) => struttura.comune)).size;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F7F8F6",
          padding: "72px 80px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="76" height="76" viewBox="0 0 48 48">
            <rect width="48" height="48" rx="10.5" fill="#1F5D4C" />
            <path
              d="M11 13h18a5 5 0 0 1 3.66 1.6l7.9 8.5a2.8 2.8 0 0 1 0 3.8l-7.9 8.5A5 5 0 0 1 29 37H11a5 5 0 0 1-5-5V18a5 5 0 0 1 5-5z"
              fill="#F7F8F6"
            />
            <circle cx="17" cy="25" r="4.2" fill="#1F5D4C" />
          </svg>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: "Serif", fontSize: 52, color: "#12211E" }}>Guida</span>
            <span style={{ fontFamily: "SansBold", fontSize: 47, color: "#1F5D4C", letterSpacing: 2 }}>
              RSA
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontFamily: "Serif", fontSize: 76, color: "#12211E", lineHeight: 1.1 }}>
            {`${strutture.length} RSA in Lombardia`}
          </div>
          <div style={{ fontFamily: "SansRegular", fontSize: 34, color: "#33443E" }}>
            {`Rette, contatti e posti letto in ${comuni} comuni`}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 6, backgroundColor: "#1F5D4C" }} />
          <div style={{ fontFamily: "SansBold", fontSize: 27, color: "#5A6B63", letterSpacing: 1 }}>
            guidarsa.it
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Serif", data: serif, style: "normal", weight: 600 },
        { name: "SansBold", data: sansBold, style: "normal", weight: 700 },
        { name: "SansRegular", data: sansRegular, style: "normal", weight: 400 },
      ],
    },
  );
}
