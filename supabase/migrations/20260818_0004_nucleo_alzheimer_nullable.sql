-- nucleo_alzheimer diventa nullable.
--
-- Motivo: `false` afferma che il nucleo Alzheimer non esiste, mentre nella
-- maggior parte delle fonti open data il dato semplicemente non c'e`.
-- `null` = informazione non disponibile, e in pagina non va mai mostrato come un "no".
--
-- Da eseguire su un database in cui la 0001 e` gia` stata applicata nella
-- versione precedente (colonna `not null default false`).

alter table public.strutture
  alter column nucleo_alzheimer drop not null;

alter table public.strutture
  alter column nucleo_alzheimer drop default;

-- Le righe gia` presenti con false non vengono toccate: al momento la tabella
-- e` vuota, ma se in futuro servisse riportarle a "non so", va fatto solo per
-- le fonti che non dichiarano il dato, non a tappeto.

notify pgrst, 'reload schema';
