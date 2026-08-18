-- Dati del gestore (per ricavare le PEC ufficiali da INI-PEC) e tracciamento
-- della provenienza dei contatti (obbligatorio per l'attribuzione ODbL dei
-- dati OpenStreetMap: deve essere sempre possibile isolare cosa viene da OSM).

alter table public.strutture
  -- COD_STRUTTURA della fonte regionale: chiave stabile per i reimport.
  add column if not exists codice_struttura_fonte text,
  add column if not exists denominazione_gestore text,
  add column if not exists partita_iva_gestore text,
  add column if not exists codice_fiscale_gestore text,
  -- Vuota per ora: la riempira` la sessione INI-PEC.
  add column if not exists pec_gestore text,

  -- Arricchimento OpenStreetMap.
  add column if not exists osm_id text,
  add column if not exists osm_confidenza text
    check (osm_confidenza is null or osm_confidenza in ('alta', 'media')),
  -- Mappa campo -> fonte, es. {"telefono":"osm","sito_web":"osm"}.
  -- Serve a sapere per ogni singolo campo da dove arriva il dato, e quindi a
  -- estrarre in qualsiasi momento il sottoinsieme di provenienza OSM.
  add column if not exists fonte_contatti jsonb not null default '{}'::jsonb,
  add column if not exists contatti_aggiornati_il timestamptz;

comment on column public.strutture.fonte_contatti is
  'Mappa campo -> fonte del dato di contatto (opendata_lombardia, osm, sito_ufficiale, struttura).';

create index if not exists strutture_partita_iva_idx
  on public.strutture (partita_iva_gestore)
  where partita_iva_gestore is not null;

create index if not exists strutture_codice_fonte_idx
  on public.strutture (codice_struttura_fonte);

-- Indice sui campi che arrivano da OSM: serve all'estrazione ODbL.
create index if not exists strutture_fonte_contatti_idx
  on public.strutture using gin (fonte_contatti);

notify pgrst, 'reload schema';
