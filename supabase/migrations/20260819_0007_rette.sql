-- Rette estratte dalle carte dei servizi.
--
-- prezzo_min / prezzo_max (gia` esistenti) ospitano la retta PRIVATA in
-- euro al mese: e` la cifra che paga la famiglia ed e` il campo previsto da
-- CLAUDE.md. La quota in regime convenzionato sta in colonne separate: le due
-- non vanno mai mescolate, in database come in pagina.

alter table public.strutture
  add column if not exists retta_convenzionata_min integer
    check (retta_convenzionata_min is null or retta_convenzionata_min >= 0),
  add column if not exists retta_convenzionata_max integer
    check (retta_convenzionata_max is null or retta_convenzionata_max >= 0),
  -- Il valore com'e` scritto nel documento, es. "€ 124,00/giorno (privato)".
  -- Serve a rendere ricostruibile la normalizzazione a euro/mese.
  add column if not exists retta_originale text,
  -- Solo voce e importo, ricomposti da noi: "camera singola +21 €/giorno".
  add column if not exists costi_extra text,
  add column if not exists carta_servizi_anno integer
    check (carta_servizi_anno is null or carta_servizi_anno between 2000 and 2100),
  add column if not exists carta_servizi_scaricata_il timestamptz,
  add column if not exists retta_confidenza text
    check (retta_confidenza is null or retta_confidenza in ('alta', 'media')),
  -- Molte carte pubblicano una tariffa sola senza dire se sia privata o in
  -- convenzione: l'importo e` certo, il regime no. Terzo stato esplicito
  -- invece di scegliere a caso o di buttare via il dato.
  add column if not exists retta_regime text
    check (retta_regime is null or retta_regime in ('privata', 'convenzionata', 'non_specificato'));

comment on column public.strutture.prezzo_min is
  'Retta privata minima in euro/mese (dalla carta dei servizi).';
comment on column public.strutture.retta_convenzionata_min is
  'Quota a carico dell ospite in regime convenzionato, euro/mese. Mai sommata alla retta privata.';

notify pgrst, 'reload schema';
