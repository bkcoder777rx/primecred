-- Prime Cred → plataforma multiempresa (BK Software).
-- Cada empresa só enxerga os próprios dados. Os dados atuais passam a pertencer à "Prime Cred".
-- Rodar uma vez no Supabase: SQL Editor → colar este arquivo → Run.

begin;

-- ───────────────────────── Empresas (clientes da BK Software) ─────────────────────────
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  cnpj text,
  responsavel text,
  whatsapp text,
  email text,
  status text not null default 'ativa' check (status in ('teste', 'ativa', 'bloqueada', 'cancelada')),
  motivo_bloqueio text,
  plano text not null default 'padrao',
  valor_mensal_centavos bigint not null default 0 check (valor_mensal_centavos >= 0),
  dia_vencimento int not null default 10 check (dia_vencimento between 1 and 28),
  dias_tolerancia int not null default 5 check (dias_tolerancia >= 0),
  teste_ate date,
  observacoes text,
  criado_em timestamptz not null default now()
);

-- Quem entra em cada empresa (dono e funcionários).
create table public.membros (
  empresa_id uuid not null references public.empresas on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  nome text,
  papel text not null default 'funcionario' check (papel in ('dono', 'funcionario')),
  permissoes text[] not null default '{}',
  ativo boolean not null default true,
  trocar_senha boolean not null default false,
  criado_em timestamptz not null default now(),
  primary key (empresa_id, user_id)
);
create index on public.membros (user_id);

-- Equipe da BK Software (acesso ao Painel ADM).
create table public.bk_equipe (
  user_id uuid primary key references auth.users on delete cascade,
  nome text,
  papel text not null default 'equipe' check (papel in ('dono', 'equipe')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ───────────────────────── Funções de acesso ─────────────────────────
create or replace function public.minha_empresa() returns uuid
language sql stable security definer set search_path = public as $$
  select m.empresa_id from public.membros m
   where m.user_id = auth.uid() and m.ativo
   order by m.criado_em limit 1;
$$;

create or replace function public.empresa_liberada(p_empresa uuid default public.minha_empresa()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.empresas e where e.id = p_empresa and e.status in ('teste', 'ativa'));
$$;

create or replace function public.eh_bk() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bk_equipe b where b.user_id = auth.uid() and b.ativo);
$$;

create or replace function public.tem_permissao(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros m
     where m.user_id = auth.uid() and m.ativo and m.empresa_id = public.minha_empresa()
       and (m.papel = 'dono' or p = any (m.permissoes))
  );
$$;

-- As operações atômicas (criar empréstimo, pagamento, estorno) já chamam is_admin():
-- agora significa "membro ativo de uma empresa liberada".
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.minha_empresa() is not null and public.empresa_liberada();
$$;

-- ───────────────────────── Prime Cred = empresa nº 1 ─────────────────────────
insert into public.empresas (nome, slug) values ('Prime Cred', 'primecred');

insert into public.membros (empresa_id, user_id, papel, nome)
  select e.id, a.user_id, 'dono', 'Administrador' from public.admins a cross join public.empresas e where e.slug = 'primecred';
insert into public.bk_equipe (user_id, papel, nome)
  select a.user_id, 'dono', 'Administrador' from public.admins a;

-- ───────────────────────── empresa_id em todas as tabelas ─────────────────────────
do $$
declare
  t text;
  v uuid;
begin
  select id into v from public.empresas where slug = 'primecred';
  foreach t in array array[
    'configuracoes', 'clientes', 'referencias', 'solicitacoes', 'documentos',
    'emprestimos', 'pagamentos', 'caixa_movimentos', 'notificacoes', 'push_inscricoes'
  ] loop
    execute format('alter table public.%I add column empresa_id uuid references public.empresas on delete cascade', t);
    execute format('update public.%I set empresa_id = %L', t, v);
    execute format('alter table public.%I alter column empresa_id set not null', t);
    -- Quem está logado grava automaticamente na própria empresa.
    execute format('alter table public.%I alter column empresa_id set default public.minha_empresa()', t);
    execute format('create index on public.%I (empresa_id)', t);
    -- Troca a regra antiga ("admin vê tudo") por "cada empresa vê só o que é seu".
    execute format('drop policy if exists "admin acesso total" on public.%I', t);
    execute format(
      'create policy "somente a propria empresa" on public.%I for all to authenticated
         using (empresa_id = public.minha_empresa() and public.empresa_liberada())
         with check (empresa_id = public.minha_empresa() and public.empresa_liberada())', t);
  end loop;
end $$;

-- Configurações: uma linha por empresa (o antigo id=1 continua existindo só para compatibilidade).
alter table public.configuracoes drop constraint if exists configuracoes_pkey;
alter table public.configuracoes drop constraint if exists configuracoes_id_check;
alter table public.configuracoes alter column id drop not null;
alter table public.configuracoes alter column id drop default;
alter table public.configuracoes add primary key (empresa_id);

-- CPF passa a ser único por empresa (o mesmo cliente pode existir em duas financeiras).
alter table public.clientes drop constraint if exists clientes_cpf_key;
alter table public.clientes add constraint clientes_empresa_cpf_key unique (empresa_id, cpf);

-- Cada empresa nova ganha suas configurações padrão.
create or replace function public.criar_config_empresa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.configuracoes (empresa_id, nome_empresa) values (new.id, new.nome)
  on conflict (empresa_id) do nothing;
  return new;
end $$;
create trigger empresas_config after insert on public.empresas
  for each row execute function public.criar_config_empresa();

-- ───────────────────────── Regras de acesso das tabelas novas ─────────────────────────
alter table public.empresas enable row level security;
alter table public.membros enable row level security;
alter table public.bk_equipe enable row level security;

create policy "ver a propria empresa" on public.empresas for select to authenticated
  using (id = public.minha_empresa() or public.eh_bk());
create policy "ver membros da propria empresa" on public.membros for select to authenticated
  using (empresa_id = public.minha_empresa() or user_id = auth.uid() or public.eh_bk());
create policy "equipe bk" on public.bk_equipe for select to authenticated
  using (public.eh_bk());

-- A tabela antiga de administradores foi substituída por membros + bk_equipe.
drop table public.admins;

-- ───────────────────────── Arquivos: pasta por empresa ─────────────────────────
-- Novo caminho: empresas/<empresa_id>/solicitacoes/<solicitacao_id>/<arquivo>
drop policy if exists "admin le documentos" on storage.objects;
create policy "empresa le os proprios documentos" on storage.objects
  for select to authenticated using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = 'empresas'
    and (storage.foldername(name))[2] = public.minha_empresa()::text
    and public.empresa_liberada()
  );

commit;
