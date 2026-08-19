-- Campi del wizard di richiesta informazioni e tracciamento del consenso.
--
-- Nessun campo clinico: si chiede il SERVIZIO cercato, non lo stato di salute
-- della persona assistita, che sarebbe un dato sanitario di un terzo non
-- presente a prestare consenso (GDPR art. 9).
--
-- L'urgenza riusa la colonna `tempistiche` che esiste gia: due colonne per lo
-- stesso significato invecchiano male.

alter table public.leads
  -- Chi compila: figlio/a, coniuge, altro familiare, la persona stessa.
  add column if not exists relazione text,
  -- Servizio cercato: assistenza continuativa, supporto quotidiano, solo di
  -- giorno, non lo so ancora.
  add column if not exists tipo_assistenza text,
  -- Da quale pagina e partita la richiesta: serve a capire cosa converte.
  add column if not exists pagina_origine text,

  -- Consensi separati, entrambi non preselezionati nel form.
  add column if not exists consenso_contatto boolean not null default false,
  add column if not exists consenso_condivisione boolean not null default false,
  -- Versione esatta del testo accettato: e cio che rende il consenso
  -- dimostrabile a distanza di tempo, quando l'informativa sara cambiata.
  add column if not exists consenso_testo_versione text,
  add column if not exists consenso_il timestamptz,

  add column if not exists stato text not null default 'nuovo';

alter table public.leads
  drop constraint if exists leads_stato_valido;
alter table public.leads
  add constraint leads_stato_valido
  check (stato in ('nuovo', 'contattato', 'chiuso', 'scartato', 'prova'));

-- Nessun lead puo esistere senza il consenso al contatto: la garanzia sta nel
-- database, non solo nella validazione del form.
alter table public.leads
  drop constraint if exists leads_consenso_obbligatorio;
alter table public.leads
  add constraint leads_consenso_obbligatorio
  check (consenso_contatto is true);

comment on column public.leads.consenso_testo_versione is
  'Identificatore della versione di informativa accettata, es. informativa-2026-08-19.';
comment on column public.leads.stato is
  'Ciclo di vita del contatto. "prova" marca i lead di test, da eliminare.';

notify pgrst, 'reload schema';
