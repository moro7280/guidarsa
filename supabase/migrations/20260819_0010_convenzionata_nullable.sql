-- `convenzionata` diventa nullable.
--
-- Stessa ragione di `nucleo_alzheimer`: `false` afferma che la struttura non e
-- accreditata, mentre per alcune fonti semplicemente non lo sappiamo. L'elenco
-- del Friuli-Venezia Giulia, per esempio, non dichiara l'accreditamento: con la
-- colonna NOT NULL avremmo scritto 169 volte "non convenzionata" senza averne
-- notizia.
--
-- In pagina null si legge "Informazione non disponibile", mai come un no.

alter table public.strutture
  alter column convenzionata drop not null;

alter table public.strutture
  alter column convenzionata drop default;

-- Le righe lombarde restano come sono: li il dato c'e davvero, e la colonna
-- FL_ACCREDITATA lo dichiara struttura per struttura.

notify pgrst, 'reload schema';
