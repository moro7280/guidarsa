// Test della regola di indicizzazione.
//   npm test
//
// Importa la funzione vera da src/lib/completezza.ts, non una copia: se la
// regola cambia e questo file non ne sa niente, il test deve rompersi. Node 24
// legge il TypeScript direttamente, quindi non serve nessuna compilazione.
//
// Quello che si vuole dimostrare non e che la funzione dia i numeri giusti
// oggi: e che il rientro sia **automatico nei due versi**. Il punteggio si
// ricalcola dai dati a ogni build, quindi una scheda arricchita torna
// nell'indice da sola, e una impoverita ne esce da sola — senza migrazioni,
// senza liste da tenere aggiornate a mano.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  comuneIndicizzabile,
  completezza,
  hubIndicizzabile,
  indicizzabile,
} from "../src/lib/completezza.ts";

/** Una struttura completa a cui togliere pezzi: il contrario e piu fragile. */
function struttura(modifiche = {}) {
  return {
    nome: "RSA di prova",
    slug: "rsa-di-prova-milano",
    tipologia: "rsa",
    indirizzo: "Via di Prova 1",
    cap: "20100",
    comune: "Milano",
    provincia: "Milano",
    provincia_sigla: "MI",
    regione: "Lombardia",
    lat: 45.46,
    lng: 9.19,
    telefono: "0212345678",
    email: null,
    sito_web: null,
    posti_letto: 60,
    convenzionata: true,
    nucleo_alzheimer: true,
    prezzo_min: null,
    prezzo_max: null,
    descrizione: Array.from({ length: 45 }, (_, i) => `parola${i}`).join(" "),
    fonte_dati: "prova",
    updated_at: "2026-09-07T00:00:00Z",
    ...modifiche,
  };
}

test("una scheda con recapito e punteggio sopra soglia e indicizzabile", () => {
  const s = struttura();
  assert.ok(completezza(s).punteggio >= 60, `punteggio ${completezza(s).punteggio}`);
  assert.equal(indicizzabile(s), true);
});

test("senza nessun recapito non e indicizzabile, anche col punteggio alto", () => {
  // Le si tolgono i recapiti ma le si lasciano prezzi e posti, cosi il
  // punteggio resta sopra 60: e esattamente il caso che la regola (b) esiste
  // per intercettare.
  const s = struttura({ telefono: null, sito_web: null, email: null, prezzo_min: 1800, prezzo_max: 2400 });
  assert.ok(completezza(s).punteggio >= 60, `punteggio ${completezza(s).punteggio}`);
  assert.equal(indicizzabile(s), false);
});

test("il rientro e automatico: aggiungere un telefono rimette la scheda nell'indice", () => {
  const povera = struttura({ telefono: null, sito_web: null, prezzo_min: 1800, prezzo_max: 2400 });
  assert.equal(indicizzabile(povera), false);

  const arricchita = { ...povera, telefono: "0212345678" };
  assert.equal(indicizzabile(arricchita), true);
});

test("e nel verso opposto: togliere l'ultimo recapito la fa uscire", () => {
  const completa = struttura();
  assert.equal(indicizzabile(completa), true);

  // E cio che ha fatto la bonifica dei recapiti a chi aveva un telefono solo,
  // e sbagliato.
  const impoverita = { ...completa, telefono: null };
  assert.equal(indicizzabile(impoverita), false);
});

test("la pagina comune segue le sue schede, nei due versi", () => {
  // Senza prezzi, di proposito: se le schede pubblicassero la retta basterebbe
  // la prima a far rientrare la pagina, e il caso "una sola non basta" non si
  // riuscirebbe a provare.
  const senzaRecapito = { telefono: null, sito_web: null };
  const a = struttura({ slug: "a", ...senzaRecapito });
  const b = struttura({ slug: "b", ...senzaRecapito });
  assert.equal(comuneIndicizzabile([a, b]), false, "due schede non indicizzabili: la pagina resta fuori");

  // Arricchisco la prima: una sola indicizzabile, e senza retta pubblicata.
  const a1 = { ...a, telefono: "0212345678" };
  assert.equal(comuneIndicizzabile([a1, b]), false, "una sola scheda non basta");

  // Arricchisco anche la seconda: due schede indicizzabili, la pagina rientra.
  const b1 = { ...b, telefono: "0287654321" };
  assert.equal(comuneIndicizzabile([a1, b1]), true, "due schede indicizzabili: la pagina rientra");

  // E se una si impoverisce di nuovo, la pagina esce di nuovo.
  assert.equal(comuneIndicizzabile([a1, b]), false, "torna sotto quando una esce");
});

test("una sola scheda indicizzabile basta se pubblica la retta", () => {
  const conRetta = struttura({ slug: "c", prezzo_min: 1900, prezzo_max: 2500 });
  assert.equal(indicizzabile(conRetta), true);
  assert.equal(comuneIndicizzabile([conRetta]), true, "la retta e il dato che la scheda da sola non direbbe");

  const senzaRetta = struttura({ slug: "d" });
  assert.equal(comuneIndicizzabile([senzaRetta]), false);
});

test("la retta convenzionata conta quanto quella privata", () => {
  const s = struttura({ slug: "e", retta_convenzionata_min: 1400 });
  assert.equal(comuneIndicizzabile([s]), true);
});

test("un hub entra se sotto ha almeno una scheda indicizzabile", () => {
  const muta = struttura({ telefono: null, sito_web: null });
  assert.equal(hubIndicizzabile([muta, muta]), false, "solo schede noindex: e un elenco di porte chiuse");

  assert.equal(hubIndicizzabile([muta, struttura()]), true, "ne basta una");
});

test("il rientro dell'hub e automatico come quello delle schede", () => {
  // La Campania di oggi: strutture importate senza nessun recapito.
  const campana = struttura({ telefono: null, sito_web: null, lat: null, lng: null });
  assert.equal(hubIndicizzabile([campana]), false);

  const arricchita = { ...campana, telefono: "0812345678" };
  assert.equal(hubIndicizzabile([arricchita]), true);
});
