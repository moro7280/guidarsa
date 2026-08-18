-- Carta dei servizi e provenienza dettagliata dei contatti.
--
-- Con piu` fonti che scrivono sugli stessi campi (open data, OSM, siti
-- ufficiali) non basta piu` sapere "questo telefono viene da OSM": serve
-- sapere da quale pagina e quando, perche' una sovrascrittura da fonte di
-- rango superiore deve restare ricostruibile.

alter table public.strutture
  -- URL del PDF della carta dei servizi, quando la struttura la pubblica:
  -- contiene rette e servizi dettagliati, materiale per una sessione dedicata.
  add column if not exists url_carta_servizi text;

-- fonte_contatti passa da { "telefono": "osm" }
--                     a { "telefono": { "fonte": "osm", "url": null, "il": "2026-08-19" } }
update public.strutture s
set fonte_contatti = coalesce((
  select jsonb_object_agg(
    e.key,
    jsonb_build_object(
      'fonte', e.value,
      'url', null,
      'il', to_char(coalesce(s.contatti_aggiornati_il, now()), 'YYYY-MM-DD')
    )
  )
  from jsonb_each_text(s.fonte_contatti) as e
), '{}'::jsonb)
where s.fonte_contatti <> '{}'::jsonb
  -- Idempotente: converte solo le voci ancora in forma di stringa.
  and exists (
    select 1 from jsonb_each(s.fonte_contatti) as e where jsonb_typeof(e.value) = 'string'
  );

comment on column public.strutture.fonte_contatti is
  'Mappa campo -> { fonte, url, il }. Fonti: opendata_lombardia, osm, sito_ufficiale, struttura.';

notify pgrst, 'reload schema';
