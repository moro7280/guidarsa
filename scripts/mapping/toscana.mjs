// Mapping per le RSA del Portale RSA di Regione Toscana.
//
// La fonte non e un CSV ma lo snapshot JSON composto da
// `scripts/raccogli/toscana.mjs`. E la fonte piu ricca che abbiamo: telefono,
// email e PEC su tutte le strutture, coordinate su quasi tutte, e soprattutto
// le tariffe dichiarate dalla Regione — non estratte da un PDF.
//
// Tre cose meritano attenzione e sono commentate dove capitano: le tariffe
// sono giornaliere, il comune arriva come codice ISTAT senza lo zero iniziale,
// e i dati personali del direttore non entrano nel database.

import { comuneDaCodice } from "../lib/istat.mjs";

export const fonte = {
  file: "data/toscana-rsa.json",
  formato: "json",
  chiaveRighe: "strutture",
  nome: "Regione Toscana — Portale RSA",
  url: "https://servizi.toscana.it/RT/RSA/",
  scaricatoIl: "2026-08-20",
  fonteDati: "portale_rsa_toscana",
  regione: "Toscana",
  tipologia: "rsa",
};

/**
 * Da tariffa giornaliera a mensile: 30,44 giorni medi (365,25 / 12).
 *
 * La conversione e una scelta dichiarata, non un dato della fonte: la Regione
 * pubblica euro al giorno, il resto del sito ragiona in euro al mese, e
 * mostrare 112 accanto a 2.400 senza spiegare confonderebbe chiunque. Il valore
 * giornaliero originale finisce in `retta_originale` e la scheda mostra
 * entrambi, dicendo quale dei due e calcolato.
 */
const GIORNI_MESE = 30.44;

function mensile(giornaliera) {
  const valore = Number(giornaliera);
  if (!Number.isFinite(valore) || valore <= 0) return null;
  return Math.round(valore * GIORNI_MESE);
}

/**
 * Tre strutture su 334 dichiarano una tariffa privata di 1.650, 3.000 e 11.025
 * euro **al giorno**: sono quasi certamente importi mensili finiti nel campo
 * sbagliato. Indovinare quale sia l'intenzione sarebbe inventare, quindi si
 * scartano e lo si dice. Il resto della distribuzione sta fra 50 e 300 euro.
 */
const TARIFFA_MIN_GIORNO = 40;
const TARIFFA_MAX_GIORNO = 350;

function tariffaPlausibile(valore, nome) {
  const numero = Number(valore);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  if (numero < TARIFFA_MIN_GIORNO || numero > TARIFFA_MAX_GIORNO) {
    console.log(
      `  tariffa scartata perche implausibile: ${numero} €/giorno — ${nome}`,
    );
    return null;
  }
  return numero;
}

function euro(valore) {
  const numero = Number(valore);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return numero.toFixed(2).replace(".", ",");
}

function ripulisci(valore) {
  return String(valore ?? "").replace(/\s+/g, " ").trim();
}

const ACRONIMI = new Set(["RSA", "R.S.A.", "ASP", "ONLUS", "ETS", "SRL", "SPA", "IPAB", "APSP"]);

const MINUSCOLE = new Set([
  "di", "de", "del", "della", "dello", "dei", "degli", "delle", "da", "dal",
  "e", "ed", "in", "il", "lo", "la", "i", "gli", "le", "a", "al", "alla",
  "per", "con", "su", "dell", "nell", "all", "dall", "sull",
]);

/** Come per l'Umbria: la fonte mescola MAIUSCOLO e Forma Normale nella stessa riga. */
function normalizzaMaiuscole(valore) {
  const testo = ripulisci(valore);
  if (!testo) return "";

  return testo
    .split(" ")
    .map((parola, indice) => {
      if (/[a-zà-ù]/.test(parola)) return parola;
      if (ACRONIMI.has(parola)) return parola;
      let primo = true;
      return parola.replace(/[A-ZÀ-Ù]+/g, (gruppo) => {
        const eraPrimo = primo;
        primo = false;
        if (gruppo.length < 2 || ACRONIMI.has(gruppo)) return gruppo;
        const minuscolo = gruppo.toLowerCase();
        if (eraPrimo && indice > 0 && MINUSCOLE.has(minuscolo)) return minuscolo;
        return minuscolo[0].toUpperCase() + minuscolo.slice(1);
      });
    })
    .join(" ");
}

function normalizzaTelefono(...candidati) {
  for (const candidato of candidati) {
    const testo = ripulisci(candidato).split(/[;,]/)[0].trim();
    const cifre = testo.replace(/\D/g, "");
    if (cifre.length >= 6 && cifre.length <= 13) {
      return testo.replace(/\s*[/-]\s*/, " ").replace(/\s+/g, " ");
    }
  }
  return null;
}

function normalizzaEmail(...candidati) {
  for (const candidato of candidati) {
    const testo = ripulisci(candidato).toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(testo)) return testo;
  }
  return null;
}

const TLD_AMMESSI = new Set(["it", "com", "org", "net", "eu", "info", "cloud", "online", "coop"]);

function normalizzaSito(valore) {
  const testo = ripulisci(valore).toLowerCase();
  if (!testo || testo.includes("@")) return null;
  try {
    const url = new URL(/^https?:\/\//.test(testo) ? testo : `https://${testo}`);
    const etichette = url.hostname.split(".");
    if (etichette.length < 2) return null;
    if (!TLD_AMMESSI.has(etichette[etichette.length - 1])) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Riquadro geografico della Toscana, per scartare coordinate assurde. */
const RIQUADRO = { latMin: 42.2, latMax: 44.5, lngMin: 9.6, lngMax: 12.4 };

function coordinate(riga) {
  const lat = Number.parseFloat(riga.lat);
  const lng = Number.parseFloat(riga.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { lat: null, lng: null };
  const dentro =
    lat >= RIQUADRO.latMin && lat <= RIQUADRO.latMax &&
    lng >= RIQUADRO.lngMin && lng <= RIQUADRO.lngMax;
  return dentro ? { lat, lng } : { lat: null, lng: null };
}

/**
 * "2025.04.29 11:32:26" -> "2025-04-29". La fonte scrive la stringa "NULL"
 * quando la data manca.
 */
function dataAggiornamento(valore) {
  const testo = ripulisci(valore);
  if (!testo || testo === "NULL") return null;
  const match = testo.match(/^(\d{4})[.\-/](\d{2})[.\-/](\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/**
 * Il modulo cognitivo comportamentale e, nel sistema toscano, il nucleo per le
 * persone con demenza e disturbi del comportamento. Quando la struttura
 * dichiara i propri moduli e quello non c'e, e un no vero, non un dato
 * mancante: per questo qui `false` e legittimo dove altrove sarebbe `null`.
 */
function nucleoAlzheimer(moduli) {
  if (!Array.isArray(moduli) || moduli.length === 0) return null;
  return moduli.some((m) => /cognitiv/i.test(m));
}

function componiDescrizione({
  nome, comune, provincia, gestione, postiBase, moduliExtra, socialeGiorno, sanitariaGiorno, privataGiorno,
}) {
  const frasi = [
    `${nome} è una residenza sanitaria assistenziale (RSA) con sede a ${comune}, in provincia di ${provincia}.`,
    "È autorizzata, accreditata e finanziata dal servizio sanitario della Toscana: risulta nell'elenco che la Regione pubblica sul proprio Portale RSA.",
  ];

  if (postiBase !== null) {
    frasi.push(
      `Il modulo base dichiara ${postiBase} posti${
        moduliExtra.length > 0
          ? `, ai quali si aggiungono i posti ${
              moduliExtra.length === 1 ? "del" : "dei"
            } ${moduliExtra.map((m) => `«${m.toLowerCase()}»`).join(" e ")}`
          : ""
      }.`,
    );
  } else if (moduliExtra.length > 0) {
    frasi.push(
      `Oltre al modulo base dichiara ${moduliExtra.map((m) => `«${m.toLowerCase()}»`).join(" e ")}.`,
    );
  }

  if (gestione) frasi.push(`La gestione è ${gestione}.`);

  if (socialeGiorno) {
    frasi.push(
      `In regime convenzionato la quota sociale a carico dell'ospite è di ${socialeGiorno} € al giorno${
        sanitariaGiorno
          ? `, mentre la quota sanitaria di ${sanitariaGiorno} € al giorno è versata dal servizio sanitario regionale`
          : ""
      }.`,
    );
  }

  if (privataGiorno) {
    frasi.push(
      `Chi accede senza contributo pubblico paga una tariffa privata dichiarata di ${privataGiorno} € al giorno.`,
    );
  }

  frasi.push(
    "Posti liberi e disponibilità cambiano di giorno in giorno e non li riportiamo: si verificano sul portale della Regione o chiamando la struttura.",
  );

  return frasi.join(" ");
}

export function normalizzaRiga(riga) {
  // Il portale espone solo strutture attive, ma se un giorno cambiasse idea
  // meglio accorgersene qui che in pagina.
  if (String(riga.rsa_attiva ?? "1") !== "1") {
    return { ok: false, motivo: "struttura non attiva nel portale" };
  }

  const nome = normalizzaMaiuscole(riga.nome);
  if (!nome) return { ok: false, motivo: "denominazione mancante" };

  // Il portale scrive "48017", l'anagrafe ISTAT "048017".
  const codice = ripulisci(riga.cod_comune).padStart(6, "0");
  const luogo = comuneDaCodice(codice);
  if (!luogo) return { ok: false, motivo: `codice comune ISTAT non risolto: "${codice}"` };
  if (luogo.regione !== fonte.regione) {
    return { ok: false, motivo: `comune fuori regione: ${luogo.comune} (${luogo.regione})` };
  }

  const dettaglio = riga.dettaglio?.struttura ?? {};
  const { lat, lng } = coordinate(riga);

  // Prima il numero della struttura, poi quello della sede legale del gestore.
  // L'ordine non e un dettaglio: su 334 strutture i due numeri differiscono 171
  // volte, e la sede legale e spesso il centralino di un gruppo in un'altra
  // provincia. E lo stesso errore che avevamo gia corretto sui siti ufficiali.
  const telefono = normalizzaTelefono(dettaglio.telefono_rsa, riga.telefono_sede, dettaglio.tel_sede);
  const email = normalizzaEmail(dettaglio.email, riga.email_sede, dettaglio.email_sede);
  const sito = normalizzaSito(dettaglio.sito_internet);
  const pec = normalizzaEmail(riga.posta_certificata_sede, dettaglio.posta_certificata_sede);

  // Tariffe. Giornaliere nella fonte, mensili nelle colonne, originale in chiaro.
  //
  // I due campi della fonte non sono intercambiabili, e il codice del portale
  // lo dice con parole sue:
  //
  //   rsa_quota          -> "Quota sociale (a carico dell'assistito)"
  //   rsa_quotasanitaria -> "Quota sanitaria (a carico del servizio sanitario)"
  //
  // Nella nostra scheda la retta in regime convenzionato e quella che paga la
  // famiglia: quindi `rsa_quota`, che varia da struttura a struttura (83 valori
  // distinti fra 42 e 75 € al giorno). La quota sanitaria vale 59,10 € per
  // tutte — e la tariffa regionale che il servizio sanitario versa — e finisce
  // nella descrizione come contesto, mai fra le rette a carico della famiglia.
  const socialeGiorno = Number(riga.rsa_quota);
  const sanitariaGiorno = Number(riga.rsa_quotasanitaria);
  const privataMin = tariffaPlausibile(dettaglio.tariffa_privata_ranged?.minima, nome);
  const privataMax = tariffaPlausibile(dettaglio.tariffa_privata_ranged?.massima, nome) ?? privataMin;

  const prezzoMin = mensile(privataMin);
  const prezzoMax = mensile(privataMax) ?? prezzoMin;
  const convenzionataMensile = mensile(socialeGiorno);

  const originale = [];
  if (euro(socialeGiorno)) {
    originale.push(`quota sociale a carico dell'ospite ${euro(socialeGiorno)} €/giorno`);
  }
  if (euro(privataMin)) {
    originale.push(
      privataMax > privataMin
        ? `tariffa privata ${euro(privataMin)}–${euro(privataMax)} €/giorno`
        : `tariffa privata ${euro(privataMin)} €/giorno`,
    );
  }

  const moduli = Array.isArray(dettaglio.modulo) ? dettaglio.modulo : [];
  const moduliExtra = moduli.filter((m) => !/base/i.test(m));
  const postiBase = Number.isFinite(Number(dettaglio.posti_modulo_base))
    ? Number(dettaglio.posti_modulo_base)
    : null;

  const aggiornata = dataAggiornamento(riga.rsa_data_aggiornamento);
  const provenienza = {
    fonte: fonte.fonteDati,
    url: fonte.url,
    il: aggiornata ?? fonte.scaricatoIl,
  };
  const contatti = {};
  const fonteContatti = {};
  if (telefono) {
    contatti.telefono = telefono;
    fonteContatti.telefono = provenienza;
  }
  if (email) {
    contatti.email = email;
    fonteContatti.email = provenienza;
  }
  if (sito) {
    contatti.sito_web = sito;
    fonteContatti.sito_web = provenienza;
  }
  if (Object.keys(fonteContatti).length > 0) contatti.fonte_contatti = fonteContatti;

  const rette = {};
  if (prezzoMin !== null) {
    rette.prezzo_min = prezzoMin;
    rette.prezzo_max = prezzoMax;
  }
  if (convenzionataMensile !== null) {
    rette.retta_convenzionata_min = convenzionataMensile;
    rette.retta_convenzionata_max = convenzionataMensile;
  }
  if (originale.length > 0) {
    rette.retta_originale = originale.join(" · ");
    // Dichiarata dalla Regione, non dedotta da un documento: confidenza alta.
    rette.retta_confidenza = "alta";
    rette.retta_regime = prezzoMin !== null ? "privata" : "convenzionata";
    // Le due colonne della carta dei servizi qui portano l'eta del dato del
    // portale: e cio che serve alla regola della "tariffa storica" oltre i due
    // anni. In pagina l'etichetta della fonte cambia di conseguenza.
    if (aggiornata) {
      rette.carta_servizi_anno = Number(aggiornata.slice(0, 4));
      rette.carta_servizi_scaricata_il = aggiornata;
    }
  }

  return {
    ok: true,
    codiceFonte: ripulisci(riga.id),
    struttura: {
      nome,
      tipologia: fonte.tipologia,
      indirizzo: normalizzaMaiuscole(riga.indirizzo).replace(/,(\S)/g, ", $1") || null,
      // Il portale non pubblica il CAP: resta sconosciuto, non inventato.
      cap: null,
      comune: luogo.comune,
      provincia: luogo.provincia,
      provincia_sigla: luogo.provinciaSigla,
      regione: fonte.regione,
      lat,
      lng,
      ...contatti,
      ...rette,
      posti_letto: postiBase,
      // Il portale elenca per definizione le strutture accreditate, e il campo
      // `accordo` vale 1 su tutte e 334.
      convenzionata: String(riga.accordo ?? "") === "1",
      nucleo_alzheimer: nucleoAlzheimer(moduli),
      codice_struttura_fonte: ripulisci(riga.id) || null,
      // Nome, cognome e codice fiscale del direttore restano fuori: sono dati
      // personali di una persona fisica e non servono a chi cerca una struttura.
      pec_gestore: pec,
      descrizione: componiDescrizione({
        nome,
        comune: luogo.comune,
        provincia: luogo.provincia,
        gestione: ripulisci(riga.gestione),
        postiBase,
        moduliExtra,
        socialeGiorno: euro(socialeGiorno),
        sanitariaGiorno: euro(sanitariaGiorno),
        privataGiorno: euro(privataMin),
      }),
      fonte_dati: fonte.fonteDati,
    },
  };
}
