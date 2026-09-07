// Test del testo composto nelle schede (task C1).
//   npm test
//
// Come per il gate, importa le funzioni vere: se la regola cambia e il test non
// lo sa, deve rompersi.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chiaveComplesso,
  descrizioneScheda,
  indirizzoNormalizzato,
  testiScheda,
  unitaSorelle,
} from "../src/lib/testi-struttura.ts";

function struttura(modifiche = {}) {
  return {
    nome: "RSA di prova",
    slug: "rsa-di-prova-cremona",
    tipologia: "rsa",
    indirizzo: "Via Brescia, 207",
    cap: "26100",
    comune: "Cremona",
    provincia: "Cremona",
    provincia_sigla: "CR",
    regione: "Lombardia",
    lat: 45.13,
    lng: 10.02,
    telefono: "0372533511",
    email: null,
    sito_web: null,
    posti_letto: 121,
    convenzionata: true,
    nucleo_alzheimer: null,
    prezzo_min: null,
    prezzo_max: null,
    descrizione: "",
    fonte_dati: "opendata_lombardia",
    updated_at: "2026-09-07T00:00:00Z",
    ...modifiche,
  };
}

const testo = (s, tutte = [s]) => {
  const t = testiScheda(s, tutte);
  // La provenienza sta in un campo suo perche in pagina va dopo il paragrafo
  // con i link alle sorelle: qui si rimette in coda per poterla controllare.
  return [...t.paragrafi, t.provenienza].join(" ");
};

// --- indirizzi --------------------------------------------------------------

test("le abbreviazioni diverse dello stesso indirizzo coincidono", () => {
  assert.equal(indirizzoNormalizzato("Via Brescia, 207"), indirizzoNormalizzato("V. Brescia 207"));
  assert.equal(indirizzoNormalizzato("P.zza Roma 3"), indirizzoNormalizzato("Piazza Roma, 3"));
  assert.equal(indirizzoNormalizzato("Via Verdi 45/A"), indirizzoNormalizzato("Via Verdi 45 A"));
  assert.equal(indirizzoNormalizzato("Via Rossi 12 snc"), indirizzoNormalizzato("Via Rossi 12"));
});

test("un indirizzo senza numero civico non fa complesso", () => {
  assert.equal(chiaveComplesso(struttura({ indirizzo: "Via Sant'Apollonio" })), null);
  assert.notEqual(chiaveComplesso(struttura({ indirizzo: "Via Sant'Apollonio 4" })), null);
});

test("stesso indirizzo ma comune diverso non fa gruppo", () => {
  const a = struttura({ slug: "a", comune: "Cremona" });
  const b = struttura({ slug: "b", comune: "Brescia" });
  assert.equal(unitaSorelle(a, [a, b]).length, 0);
});

test("stesso indirizzo scritto in due modi fa gruppo", () => {
  const a = struttura({ slug: "a", indirizzo: "Via Brescia, 207" });
  const b = struttura({ slug: "b", nome: "RSA Azzolini", indirizzo: "V. Brescia 207", posti_letto: 120 });
  const sorelle = unitaSorelle(a, [a, b]);
  assert.equal(sorelle.length, 1);
  assert.equal(sorelle[0].slug, "b");
});

test("un gruppo oltre le otto unita non si pubblica", () => {
  const gruppo = Array.from({ length: 9 }, (_, i) => struttura({ slug: `u${i}` }));
  assert.equal(unitaSorelle(gruppo[0], gruppo).length, 0, "va segnalato, non pubblicato");
});

// --- frasi assenti quando il dato manca -------------------------------------

test("nessuna frase sui posti se il dato manca o e zero", () => {
  assert.ok(!testo(struttura({ posti_letto: null })).includes("posti letto"));
  assert.ok(!testo(struttura({ posti_letto: 0 })).includes("posti letto"));
  assert.ok(testo(struttura({ posti_letto: 40 })).includes("40 posti letto"));
});

test("null non e false: sul nucleo, il silenzio resta silenzio", () => {
  const ignoto = testo(struttura({ nucleo_alzheimer: null }));
  assert.ok(!ignoto.includes("demenze"), "con null non si dice niente");

  const negato = testo(struttura({ nucleo_alzheimer: false }));
  assert.ok(negato.includes("non indica un nucleo dedicato alle demenze"));

  const dichiarato = testo(struttura({ nucleo_alzheimer: true }));
  assert.ok(dichiarato.includes("Dichiara un nucleo dedicato alle demenze"));
});

test("la frase negativa nomina la fonte vera, non un generico elenco regionale", () => {
  const lombarda = testo(struttura({ nucleo_alzheimer: false, fonte_dati: "opendata_lombardia" }));
  assert.ok(lombarda.includes("Regione Lombardia"), lombarda);

  const toscana = testo(struttura({ nucleo_alzheimer: false, fonte_dati: "portale_rsa_toscana" }));
  assert.ok(toscana.includes("Portale RSA di Regione Toscana"), toscana);
  assert.ok(!toscana.includes("Regione Lombardia"));
});

test("nessuna frase sulla retta se non c'e", () => {
  assert.ok(!testo(struttura()).includes("al mese"));
});

test("privata e convenzionata restano distinte, mai sommate", () => {
  const t = testo(struttura({ prezzo_min: 2400, retta_convenzionata_min: 1500, carta_servizi_anno: 2026 }));
  assert.ok(t.includes("2.400 € al mese per la retta privata"), t);
  assert.ok(t.includes("1.500 € al mese per la quota a carico dell'ospite in regime convenzionato"), t);
  assert.ok(!t.includes("3.900"), "non si sommano");
});

// --- scala nel complesso ----------------------------------------------------

test("la scala si scrive solo se tutte le sorelle hanno i posti", () => {
  const grande = struttura({ slug: "a", posti_letto: 121 });
  const piccola = struttura({ slug: "b", nome: "R.S.A. B", posti_letto: 40 });
  assert.ok(testo(grande, [grande, piccola]).includes("più grande delle 2 unità"));
  assert.ok(testo(piccola, [grande, piccola]).includes("più piccola delle 2 unità"));

  const ignota = struttura({ slug: "c", nome: "Terza", posti_letto: null });
  const conIgnota = testo(grande, [grande, piccola, ignota]);
  assert.ok(!conIgnota.includes("più grande"), "con un posto ignoto il confronto non e verificabile");
});

// --- provenienza viva -------------------------------------------------------

test("la provenienza dice il vero sui recapiti di adesso", () => {
  const conTelefono = testo(struttura({ telefono: "0372533511" }));
  assert.ok(!conTelefono.includes("non includono i recapiti"), conTelefono);

  const muta = testo(struttura({ telefono: null, sito_web: null, email: null }));
  assert.ok(muta.includes("non includono i recapiti"), muta);
});

// --- description ------------------------------------------------------------

test("la description non chiama retta privata una quota convenzionata", () => {
  const soloConvenzionata = descrizioneScheda(struttura({ retta_convenzionata_min: 1936 }));
  assert.ok(soloConvenzionata.includes("quota convenzionata da 1.936 €"), soloConvenzionata);
  assert.ok(!soloConvenzionata.includes("retta privata"), soloConvenzionata);

  const conPrivata = descrizioneScheda(struttura({ prezzo_min: 3501, retta_convenzionata_min: 1936 }));
  assert.ok(conPrivata.includes("retta privata da 3.501 €"), conPrivata);
});

test("la description tiene sempre comune e tipologia", () => {
  const d = descrizioneScheda(struttura({ nucleo_alzheimer: true, prezzo_min: 2400 }));
  assert.ok(d.includes("Cremona (CR)"), d);
  assert.ok(d.toLowerCase().includes("rsa"), d);
  assert.ok(d.length <= 155, `lunga ${d.length}: ${d}`);
});
