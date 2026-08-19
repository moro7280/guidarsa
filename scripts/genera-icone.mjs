// Genera le icone del sito dal marchio, senza dipendenze.
//   npm run icone
//
// Perche a mano: servono un .ico multi-risoluzione e un PNG per iOS, e
// aggiungere una libreria grafica al progetto per tre file statici non vale
// il costo. PNG e ICO sono formati semplici; zlib sta gia in Node.
//
// Le forme sono le stesse del componente Logo: targa arrotondata con la punta
// morbida e il punto interno. Sotto i 24 px il punto sparisce, perche a quella
// scala impasterebbe la sagoma invece di darle significato.

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const VERDE = [31, 93, 76];
const CARTA = [247, 248, 246];
const CAMPIONI = 4; // supersampling per lato: 16 valutazioni per pixel

// --- Geometria (spazio 0-48, lo stesso del viewBox) -------------------------

function dentroRettArrotondato(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function dentroSegnavia(x, y) {
  // Corpo della targa: arrotondato SOLO a sinistra. Arrotondarlo anche a
  // destra lascerebbe due tacche nel punto in cui incontra la rastremazione,
  // perche il raccordo rientra mentre la punta parte a piena altezza.
  if (x >= 6 && x <= 29 && y >= 13 && y <= 37) {
    if (x >= 11) return true;
    const centroY = Math.min(Math.max(y, 18), 32);
    if ((x - 11) ** 2 + (y - centroY) ** 2 <= 25) return true;
  }
  // Punta rastremata verso destra.
  if (x >= 29 && x <= 38) {
    const avanzamento = (x - 29) / (38 - 29);
    const semiAltezza = 12 - avanzamento * (12 - 2.8);
    if (Math.abs(y - 25) <= semiAltezza) return true;
  }
  // Vertice arrotondato.
  return (x - 38) ** 2 + (y - 25) ** 2 <= 2.8 ** 2;
}

/** Un pixel del marchio: colore di fondo, targa, punto. */
function colorePixel(x, y, dimensione) {
  const tile = dentroRettArrotondato(x, y, 0, 0, 48, 48, 10.5);
  if (!tile) return null;
  if (dimensione >= 24 && (x - 17) ** 2 + (y - 25) ** 2 <= 4.2 ** 2) return VERDE;
  if (dentroSegnavia(x, y)) return CARTA;
  return VERDE;
}

/** Rasterizza a `dimensione` px con supersampling, restituisce RGBA. */
function disegna(dimensione) {
  const pixel = Buffer.alloc(dimensione * dimensione * 4);
  const passo = 48 / dimensione;

  for (let riga = 0; riga < dimensione; riga++) {
    for (let colonna = 0; colonna < dimensione; colonna++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let copertura = 0;

      for (let sy = 0; sy < CAMPIONI; sy++) {
        for (let sx = 0; sx < CAMPIONI; sx++) {
          const x = (colonna + (sx + 0.5) / CAMPIONI) * passo;
          const y = (riga + (sy + 0.5) / CAMPIONI) * passo;
          const colore = colorePixel(x, y, dimensione);
          if (colore) {
            r += colore[0];
            g += colore[1];
            b += colore[2];
            copertura++;
          }
        }
      }

      const totale = CAMPIONI * CAMPIONI;
      const i = (riga * dimensione + colonna) * 4;
      if (copertura === 0) {
        pixel[i] = pixel[i + 1] = pixel[i + 2] = pixel[i + 3] = 0;
      } else {
        pixel[i] = Math.round(r / copertura);
        pixel[i + 1] = Math.round(g / copertura);
        pixel[i + 2] = Math.round(b / copertura);
        pixel[i + 3] = Math.round((copertura / totale) * 255);
      }
    }
  }
  return pixel;
}

// --- Codifica PNG -----------------------------------------------------------

const TABELLA_CRC = (() => {
  const tabella = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabella[n] = c;
  }
  return tabella;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABELLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dati) {
  const lunghezza = Buffer.alloc(4);
  lunghezza.writeUInt32BE(dati.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dati]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([lunghezza, corpo, crc]);
}

function png(dimensione, pixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(dimensione, 0);
  ihdr.writeUInt32BE(dimensione, 4);
  ihdr[8] = 8; // bit per canale
  ihdr[9] = 6; // RGBA
  // Ogni riga e preceduta dal byte di filtro 0 (nessun filtro).
  const righe = Buffer.alloc((dimensione * 4 + 1) * dimensione);
  for (let riga = 0; riga < dimensione; riga++) {
    const inizio = riga * (dimensione * 4 + 1);
    righe[inizio] = 0;
    pixel.copy(righe, inizio + 1, riga * dimensione * 4, (riga + 1) * dimensione * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(righe, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Contenitore ICO con dentro i PNG: supportato da tutti i browser attuali. */
function ico(immagini) {
  const intestazione = Buffer.alloc(6);
  intestazione.writeUInt16LE(0, 0);
  intestazione.writeUInt16LE(1, 2); // tipo icona
  intestazione.writeUInt16LE(immagini.length, 4);

  const voci = [];
  let offset = 6 + immagini.length * 16;
  for (const { dimensione, dati } of immagini) {
    const voce = Buffer.alloc(16);
    voce[0] = dimensione >= 256 ? 0 : dimensione;
    voce[1] = dimensione >= 256 ? 0 : dimensione;
    voce[4] = 1; // piani
    voce.writeUInt16LE(32, 6); // bit per pixel
    voce.writeUInt32LE(dati.length, 8);
    voce.writeUInt32LE(offset, 12);
    voci.push(voce);
    offset += dati.length;
  }

  return Buffer.concat([intestazione, ...voci, ...immagini.map((i) => i.dati)]);
}

// --- Scrittura --------------------------------------------------------------

const perIco = [16, 32, 48].map((dimensione) => ({
  dimensione,
  dati: png(dimensione, disegna(dimensione)),
}));

writeFileSync("src/app/favicon.ico", ico(perIco));
console.log(`src/app/favicon.ico — 16, 32, 48 px`);

writeFileSync("src/app/apple-icon.png", png(180, disegna(180)));
console.log("src/app/apple-icon.png — 180 px");

writeFileSync("public/marchio-512.png", png(512, disegna(512)));
console.log("public/marchio-512.png — 512 px (JSON-LD Organization, social)");
