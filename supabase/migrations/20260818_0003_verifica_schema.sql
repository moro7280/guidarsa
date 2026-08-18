-- Funzione di sola lettura per /verifica: PostgREST non espone pg_policies,
-- quindi senza questa RPC lo stato di RLS e delle policy non e` ispezionabile
-- dall'esterno.

create or replace function public.verifica_schema()
returns table (
  tabella text,
  rls_attiva boolean,
  policy_nomi text[],
  righe_stimate bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    c.relname::text,
    c.relrowsecurity,
    coalesce(
      array_agg(p.polname::text order by p.polname) filter (where p.polname is not null),
      array[]::text[]
    ),
    -- Stima del planner: -1 se la tabella non e` mai stata analizzata.
    c.reltuples::bigint
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
  where n.nspname = 'public'
    and c.relkind = 'r'
  group by c.relname, c.relrowsecurity, c.reltuples
  order by c.relname;
$$;

comment on function public.verifica_schema() is
  'Elenco tabelle dello schema public con stato RLS e nomi delle policy. Solo service role.';

-- Eseguibile solo dalla service role: la usa lo script di verifica, non il sito.
revoke all on function public.verifica_schema() from public;
revoke all on function public.verifica_schema() from anon;
revoke all on function public.verifica_schema() from authenticated;
grant execute on function public.verifica_schema() to service_role;

-- Forza PostgREST a ricaricare lo schema, cosi` le tabelle e la funzione sono
-- subito raggiungibili via API.
notify pgrst, 'reload schema';
