-- Tabella delle strutture per anziani.
-- Campi come da CLAUDE.md, piu` id (chiave primaria, referenziata da leads)
-- e provincia_sigla (usata in H1, title e JSON-LD).

create extension if not exists "pgcrypto";

create table if not exists public.strutture (
  id uuid primary key default gen_random_uuid(),

  nome text not null,
  slug text not null unique,
  tipologia text not null
    check (tipologia in ('rsa', 'casa-di-riposo', 'centro-diurno', 'assistenza-domiciliare')),

  indirizzo text,
  cap text,
  comune text not null,
  provincia text not null,
  provincia_sigla text,
  regione text not null,
  lat double precision,
  lng double precision,

  telefono text,
  email text,
  sito_web text,

  posti_letto integer check (posti_letto is null or posti_letto >= 0),
  convenzionata boolean not null default false,
  nucleo_alzheimer boolean not null default false,
  prezzo_min integer check (prezzo_min is null or prezzo_min >= 0),
  prezzo_max integer check (prezzo_max is null or prezzo_max >= 0),

  descrizione text,
  -- Origine del dato: "opendata_lombardia", "google_places", "demo", ...
  fonte_dati text not null,
  updated_at timestamptz not null default now()
);

comment on table public.strutture is
  'Strutture per anziani. Scrittura riservata alla service role (script di import).';

-- Indice per le pagine geografiche: /[tipologia]/[regione]/[provincia]/[comune]/
create index if not exists strutture_geo_idx
  on public.strutture (tipologia, regione, provincia, comune);

-- updated_at sempre aggiornato a ogni modifica.
create or replace function public.tocca_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists strutture_set_updated_at on public.strutture;
create trigger strutture_set_updated_at
  before update on public.strutture
  for each row execute function public.tocca_updated_at();

-- RLS: lettura pubblica, scrittura solo con service role (che salta RLS).
alter table public.strutture enable row level security;

drop policy if exists strutture_lettura_pubblica on public.strutture;
create policy strutture_lettura_pubblica
  on public.strutture
  for select
  to anon, authenticated
  using (true);
