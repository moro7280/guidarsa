-- Iscrizioni alla guida scaricabile.
--
-- Tabella separata dai lead: sono due cose diverse. Un lead chiede di essere
-- ricontattato per cercare una struttura, un iscritto ha solo lasciato l'email
-- per avere un documento. Tenerli insieme confonderebbe due consensi distinti
-- e due cicli di vita diversi.

create table if not exists public.iscritti (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Da quale pagina e arrivata l'iscrizione: serve a capire cosa funziona.
  origine text,
  -- Quale documento ha sbloccato.
  risorsa text not null default 'guida-7-passi',

  consenso boolean not null default false,
  -- Versione esatta del testo accettato, come per i lead.
  consenso_testo_versione text,
  consenso_il timestamptz,

  created_at timestamptz not null default now(),

  constraint iscritti_email_valida check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  -- Nessuna iscrizione senza consenso: la garanzia sta nel database.
  constraint iscritti_consenso_obbligatorio check (consenso is true)
);

comment on table public.iscritti is
  'Email raccolte per il download della guida. Inserimento pubblico, lettura solo con service role.';

-- Una persona puo iscriversi una sola volta per risorsa: senza questo, un
-- doppio clic crea due righe identiche.
create unique index if not exists iscritti_email_risorsa_idx
  on public.iscritti (lower(email), risorsa);

create index if not exists iscritti_created_at_idx on public.iscritti (created_at desc);

-- RLS: stesso schema dei lead. Inserimento pubblico, nessuna lettura pubblica.
alter table public.iscritti enable row level security;

drop policy if exists iscritti_inserimento_pubblico on public.iscritti;
create policy iscritti_inserimento_pubblico
  on public.iscritti
  for insert
  to anon, authenticated
  with check (true);

notify pgrst, 'reload schema';
