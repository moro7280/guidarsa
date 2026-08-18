-- Richieste di contatto dalle famiglie (lead generation).
-- Inserimento pubblico dal form del sito, lettura riservata alla service role.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  nome text not null,
  email text,
  telefono text,
  -- Zona di ricerca indicata dall'utente (comune, provincia o area).
  zona text,
  -- Fascia di budget mensile, testo libero: "1500-2000", "non so", ...
  budget text,
  -- Urgenza: "subito", "entro 1 mese", "sto solo informandomi", ...
  tempistiche text,
  struttura_id uuid references public.strutture (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),

  -- Un lead senza recapito non e` contattabile.
  constraint leads_recapito_presente
    check (email is not null or telefono is not null)
);

comment on table public.leads is
  'Richieste di contatto. Inserimento pubblico, lettura solo con service role.';

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_struttura_idx on public.leads (struttura_id);

-- RLS: solo insert pubblico. Nessuna policy di select: i lead non sono
-- leggibili ne` dal browser ne` con la chiave anon.
alter table public.leads enable row level security;

drop policy if exists leads_inserimento_pubblico on public.leads;
create policy leads_inserimento_pubblico
  on public.leads
  for insert
  to anon, authenticated
  with check (true);
