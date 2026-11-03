-- Painel ADM – BK Software: mensalidades das empresas, registro de acessos e troca de senha obrigatória.
-- Rodar uma vez no Supabase: SQL Editor → colar este arquivo → Run. Só adiciona coisas (não apaga dados).

begin;

-- ───────────────────────── Empresas: bloqueio automático ─────────────────────────
-- Marca bloqueios feitos pela rotina (mensalidade atrasada / teste encerrado), para liberar sozinho ao pagar.
alter table public.empresas add column if not exists bloqueio_automatico boolean not null default false;
alter table public.empresas add column if not exists bloqueado_em timestamptz;

-- Equipe BK também pode receber senha temporária.
alter table public.bk_equipe add column if not exists trocar_senha boolean not null default false;

-- ───────────────────────── Mensalidades (o que cada empresa paga à BK) ─────────────────────────
create table public.mensalidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas on delete cascade,
  competencia date not null check (extract(day from competencia) = 1), -- 1º dia do mês de referência
  valor_centavos bigint not null check (valor_centavos >= 0),
  vencimento date not null,
  status text not null default 'aberta' check (status in ('aberta', 'paga', 'cancelada')),
  pago_em date,
  forma text,
  observacao text,
  registrado_por uuid references auth.users on delete set null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, competencia)
);
create index on public.mensalidades (status, vencimento);

-- ───────────────────────── Registro de acessos (login) ─────────────────────────
create table public.acessos_log (
  id bigint generated always as identity primary key,
  email text,
  user_id uuid references auth.users on delete set null,
  empresa_id uuid references public.empresas on delete set null,
  ip text,
  user_agent text,
  sucesso boolean not null,
  motivo text,          -- senha_incorreta | bloqueado | ok
  ignorar boolean not null default false, -- falhas perdoadas pela BK ("Desbloquear")
  criado_em timestamptz not null default now()
);
create index on public.acessos_log (criado_em desc);
create index on public.acessos_log (ip, criado_em desc);
create index on public.acessos_log (email, criado_em desc);

-- ───────────────────────── Situação de quem está logado (uma chamada só) ─────────────────────────
create or replace function public.meu_acesso() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'empresa_id', public.minha_empresa(),
    'liberada', public.empresa_liberada(),
    'bk', public.eh_bk(),
    'bk_dono', exists (select 1 from public.bk_equipe b where b.user_id = auth.uid() and b.ativo and b.papel = 'dono'),
    'trocar_senha',
      coalesce((select m.trocar_senha from public.membros m
                 where m.user_id = auth.uid() and m.ativo order by m.criado_em limit 1), false)
      or coalesce((select b.trocar_senha from public.bk_equipe b where b.user_id = auth.uid() and b.ativo), false)
  );
$$;

-- ───────────────────────── Regras de acesso ─────────────────────────
alter table public.mensalidades enable row level security;
alter table public.acessos_log enable row level security;

-- Empresas: a equipe BK cadastra e altera (excluir não: usar status "cancelada").
create policy "bk cadastra empresas" on public.empresas for insert to authenticated
  with check (public.eh_bk());
create policy "bk altera empresas" on public.empresas for update to authenticated
  using (public.eh_bk()) with check (public.eh_bk());

-- Mensalidades: BK gerencia; a empresa só consegue ver as suas.
create policy "ver mensalidades" on public.mensalidades for select to authenticated
  using (public.eh_bk() or empresa_id = public.minha_empresa());
create policy "bk lanca mensalidades" on public.mensalidades for insert to authenticated
  with check (public.eh_bk());
create policy "bk altera mensalidades" on public.mensalidades for update to authenticated
  using (public.eh_bk()) with check (public.eh_bk());

-- Acessos: só a BK lê e perdoa falhas. Quem grava é o servidor (chave secreta).
create policy "bk le acessos" on public.acessos_log for select to authenticated
  using (public.eh_bk());
create policy "bk perdoa falhas" on public.acessos_log for update to authenticated
  using (public.eh_bk()) with check (public.eh_bk());

commit;
