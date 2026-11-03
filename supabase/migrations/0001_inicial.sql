-- Prime Cred — esquema inicial.
-- Rodar uma vez no Supabase: SQL Editor → colar este arquivo → Run.

create extension if not exists pgcrypto;

-- ───────────────────────── Administradores ─────────────────────────
create table public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  criado_em timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.hoje() returns date
language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- ───────────────────────── Configurações ─────────────────────────
create table public.configuracoes (
  id int primary key default 1 check (id = 1),
  nome_empresa text not null default 'Prime Cred',
  taxa_padrao numeric(6,2) not null default 40,
  prazo_padrao int not null default 30,
  diaria_padrao_centavos bigint not null default 3000,
  dias_aviso int not null default 3,
  validade_link_dias int not null default 7,
  chave_pix text,
  mensagem_cobranca text not null default
    'Olá {nome}! Passando para lembrar do seu empréstimo com a {empresa}, com vencimento em {vencimento}.' || chr(10) ||
    'Para renovar (somente juros): {so_juros}' || chr(10) ||
    'Para quitar: {quitar}' || chr(10) ||
    '{pix}',
  atualizado_em timestamptz not null default now()
);
insert into public.configuracoes default values;

-- ───────────────────────── Clientes ─────────────────────────
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text unique check (cpf ~ '^[0-9]{11}$'),
  telefone text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  renda_centavos bigint check (renda_centavos >= 0),
  observacoes text,
  bloqueado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.referencias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes on delete cascade,
  nome text not null,
  telefone text not null,
  relacao text,
  criado_em timestamptz not null default now()
);
create index on public.referencias (cliente_id);

-- ───────────────────────── Solicitações (link do cliente) ─────────────────────────
create table public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes on delete set null,
  token text not null unique check (length(token) >= 32),
  nome_indicado text,
  telefone_indicado text,
  status text not null default 'aguardando'
    check (status in ('aguardando', 'em_analise', 'correcao', 'aprovada', 'recusada', 'cancelada')),
  valor_desejado_centavos bigint check (valor_desejado_centavos >= 0),
  dados_enviados_em timestamptz,
  enviada_em timestamptz,
  analisada_em timestamptz,
  observacao_admin text,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);
create index on public.solicitacoes (cliente_id);
create index on public.solicitacoes (status);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes on delete cascade,
  tipo text not null check (tipo in (
    'rg_segurando', 'rg_frente', 'rg_verso', 'comprovante_residencia',
    'foto_residencia', 'video_residencia', 'selfie_residencia', 'comprovante_renda'
  )),
  path text not null,
  mime text,
  tamanho_bytes bigint,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  motivo_recusa text,
  latitude double precision,
  longitude double precision,
  precisao_m double precision,
  capturado_em timestamptz,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index documentos_um_ativo_por_tipo on public.documentos (solicitacao_id, tipo) where ativo;

-- ───────────────────────── Empréstimos ─────────────────────────
create table public.emprestimos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  cliente_id uuid not null references public.clientes on delete restrict,
  principal_inicial_centavos bigint not null check (principal_inicial_centavos > 0),
  principal_centavos bigint not null check (principal_centavos >= 0),
  taxa_percent numeric(6,2) not null check (taxa_percent > 0),
  prazo_dias int not null check (prazo_dias > 0),
  diaria_centavos bigint not null default 0 check (diaria_centavos >= 0),
  data_inicio date not null,
  vencimento date not null,
  diarias_pagas_ate date,
  pago_ciclo_centavos bigint not null default 0 check (pago_ciclo_centavos >= 0),
  status text not null default 'ativo' check (status in ('ativo', 'quitado', 'cancelado')),
  quitado_em date,
  observacoes text,
  versao int not null default 1,
  criado_em timestamptz not null default now()
);
create index on public.emprestimos (cliente_id);
create index on public.emprestimos (status, vencimento);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  emprestimo_id uuid not null references public.emprestimos on delete restrict,
  data date not null,
  valor_centavos bigint not null check (valor_centavos > 0),
  diarias_centavos bigint not null default 0,
  juros_centavos bigint not null default 0,
  principal_centavos bigint not null default 0,
  tipo text not null check (tipo in ('parcial', 'juros', 'amortizacao', 'quitacao')),
  forma text not null default 'pix' check (forma in ('pix', 'dinheiro', 'transferencia', 'outro')),
  observacao text,
  estado_anterior jsonb not null,
  vencimento_anterior date not null,
  vencimento_novo date not null,
  estornado boolean not null default false,
  estornado_em timestamptz,
  motivo_estorno text,
  criado_em timestamptz not null default now()
);
create index on public.pagamentos (emprestimo_id);
create index on public.pagamentos (data);

-- ───────────────────────── Caixa ─────────────────────────
create table public.caixa_movimentos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  categoria text not null check (categoria in ('pagamento', 'emprestimo', 'aporte', 'retirada', 'despesa', 'estorno', 'outro')),
  valor_centavos bigint not null check (valor_centavos > 0),
  descricao text,
  emprestimo_id uuid references public.emprestimos on delete set null,
  pagamento_id uuid references public.pagamentos on delete set null,
  criado_em timestamptz not null default now()
);
create index on public.caixa_movimentos (data);

-- ───────────────────────── Notificações ─────────────────────────
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  titulo text not null,
  corpo text,
  link text,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on public.notificacoes (lida, criado_em desc);

create table public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  criado_em timestamptz not null default now()
);

-- ───────────────────────── Situação do cliente ─────────────────────────
create view public.v_clientes with (security_invoker = true) as
select
  c.*,
  (select count(*) from public.emprestimos e where e.cliente_id = c.id and e.status = 'ativo') as emprestimos_ativos,
  (select coalesce(sum(e.principal_centavos), 0) from public.emprestimos e
    where e.cliente_id = c.id and e.status = 'ativo') as principal_aberto_centavos,
  case
    when c.bloqueado then 'bloqueado'
    when exists (select 1 from public.emprestimos e
                 where e.cliente_id = c.id and e.status = 'ativo' and e.vencimento < public.hoje()) then 'atrasado'
    when exists (select 1 from public.emprestimos e where e.cliente_id = c.id and e.status = 'ativo') then 'ativo'
    when exists (select 1 from public.emprestimos e where e.cliente_id = c.id and e.status = 'quitado') then 'inativo'
    when exists (select 1 from public.solicitacoes s where s.cliente_id = c.id and s.status = 'aprovada') then 'aprovado'
    when exists (select 1 from public.solicitacoes s
                 where s.cliente_id = c.id and s.status in ('aguardando', 'em_analise', 'correcao')) then 'em_analise'
    else 'cadastrado'
  end as situacao
from public.clientes c;

-- ───────────────────────── Operações atômicas ─────────────────────────
create or replace function public.criar_emprestimo(
  p_cliente_id uuid,
  p_principal_centavos bigint,
  p_taxa_percent numeric,
  p_prazo_dias int,
  p_diaria_centavos bigint,
  p_data_inicio date,
  p_vencimento date,
  p_observacoes text,
  p_registrar_caixa boolean
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
  v_numero bigint;
  v_nome text;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select nome into v_nome from public.clientes where id = p_cliente_id;
  if not found then raise exception 'Cliente não encontrado'; end if;

  insert into public.emprestimos (
    cliente_id, principal_inicial_centavos, principal_centavos, taxa_percent, prazo_dias,
    diaria_centavos, data_inicio, vencimento, observacoes
  ) values (
    p_cliente_id, p_principal_centavos, p_principal_centavos, p_taxa_percent, p_prazo_dias,
    p_diaria_centavos, p_data_inicio, p_vencimento, p_observacoes
  ) returning id, numero into v_id, v_numero;

  if p_registrar_caixa then
    insert into public.caixa_movimentos (data, tipo, categoria, valor_centavos, descricao, emprestimo_id)
    values (p_data_inicio, 'saida', 'emprestimo', p_principal_centavos,
            'Empréstimo #' || v_numero || ' — ' || v_nome, v_id);
  end if;
  return v_id;
end $$;

create or replace function public.aplicar_pagamento(
  p_emprestimo_id uuid,
  p_versao int,
  p_estado jsonb,
  p_pagamento jsonb
) returns uuid
language plpgsql as $$
declare
  v_old public.emprestimos;
  v_pag_id uuid;
  v_nome text;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select * into v_old from public.emprestimos where id = p_emprestimo_id for update;
  if not found then raise exception 'Empréstimo não encontrado'; end if;
  if v_old.versao <> p_versao then
    raise exception 'O empréstimo foi alterado por outro lançamento. Recarregue a página e tente de novo.';
  end if;
  if v_old.status <> 'ativo' then raise exception 'Empréstimo não está ativo'; end if;

  update public.emprestimos set
    principal_centavos = (p_estado->>'principalCentavos')::bigint,
    vencimento = (p_estado->>'vencimento')::date,
    diarias_pagas_ate = (p_estado->>'diariasPagasAte')::date,
    pago_ciclo_centavos = (p_estado->>'pagoCicloCentavos')::bigint,
    status = p_estado->>'status',
    quitado_em = (p_estado->>'quitadoEm')::date,
    versao = versao + 1
  where id = p_emprestimo_id;

  insert into public.pagamentos (
    emprestimo_id, data, valor_centavos, diarias_centavos, juros_centavos, principal_centavos,
    tipo, forma, observacao, estado_anterior, vencimento_anterior, vencimento_novo
  ) values (
    p_emprestimo_id,
    (p_pagamento->>'data')::date,
    (p_pagamento->>'valorCentavos')::bigint,
    (p_pagamento->>'diariasCentavos')::bigint,
    (p_pagamento->>'jurosCentavos')::bigint,
    (p_pagamento->>'principalCentavos')::bigint,
    p_pagamento->>'tipo',
    coalesce(p_pagamento->>'forma', 'pix'),
    p_pagamento->>'observacao',
    to_jsonb(v_old),
    v_old.vencimento,
    (p_estado->>'vencimento')::date
  ) returning id into v_pag_id;

  select nome into v_nome from public.clientes where id = v_old.cliente_id;
  insert into public.caixa_movimentos (data, tipo, categoria, valor_centavos, descricao, emprestimo_id, pagamento_id)
  values ((p_pagamento->>'data')::date, 'entrada', 'pagamento', (p_pagamento->>'valorCentavos')::bigint,
          'Pagamento empréstimo #' || v_old.numero || ' — ' || v_nome, p_emprestimo_id, v_pag_id);
  return v_pag_id;
end $$;

create or replace function public.estornar_pagamento(p_pagamento_id uuid, p_motivo text)
returns void
language plpgsql as $$
declare
  v_pag public.pagamentos;
  v_ant jsonb;
  v_numero bigint;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select * into v_pag from public.pagamentos where id = p_pagamento_id for update;
  if not found then raise exception 'Pagamento não encontrado'; end if;
  if v_pag.estornado then raise exception 'Pagamento já estornado'; end if;
  perform 1 from public.emprestimos where id = v_pag.emprestimo_id for update;
  if exists (select 1 from public.pagamentos
             where emprestimo_id = v_pag.emprestimo_id and not estornado and numero > v_pag.numero) then
    raise exception 'Só é possível estornar o último pagamento do empréstimo. Estorne os mais recentes primeiro.';
  end if;

  v_ant := v_pag.estado_anterior;
  update public.emprestimos set
    principal_centavos = (v_ant->>'principal_centavos')::bigint,
    vencimento = (v_ant->>'vencimento')::date,
    diarias_pagas_ate = (v_ant->>'diarias_pagas_ate')::date,
    pago_ciclo_centavos = (v_ant->>'pago_ciclo_centavos')::bigint,
    status = v_ant->>'status',
    quitado_em = (v_ant->>'quitado_em')::date,
    versao = versao + 1
  where id = v_pag.emprestimo_id
  returning numero into v_numero;

  update public.pagamentos
     set estornado = true, estornado_em = now(), motivo_estorno = p_motivo
   where id = p_pagamento_id;

  insert into public.caixa_movimentos (data, tipo, categoria, valor_centavos, descricao, emprestimo_id, pagamento_id)
  values (public.hoje(), 'saida', 'estorno', v_pag.valor_centavos,
          'Estorno do recibo #' || v_pag.numero || ' (empréstimo #' || v_numero || ')',
          v_pag.emprestimo_id, v_pag.id);
end $$;

-- Exclui um empréstimo lançado por engano (somente se não tiver pagamentos).
create or replace function public.excluir_emprestimo(p_emprestimo_id uuid)
returns void
language plpgsql as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if exists (select 1 from public.pagamentos where emprestimo_id = p_emprestimo_id) then
    raise exception 'Empréstimo com pagamentos não pode ser excluído. Estorne os pagamentos primeiro.';
  end if;
  delete from public.caixa_movimentos where emprestimo_id = p_emprestimo_id;
  delete from public.emprestimos where id = p_emprestimo_id;
end $$;

-- ───────────────────────── Segurança (RLS) ─────────────────────────
-- Somente administradores logados acessam os dados. O link do cliente passa pelo servidor.
do $$
declare t text;
begin
  foreach t in array array[
    'admins', 'configuracoes', 'clientes', 'referencias', 'solicitacoes', 'documentos',
    'emprestimos', 'pagamentos', 'caixa_movimentos', 'notificacoes', 'push_inscricoes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "admin acesso total" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t);
  end loop;
end $$;

-- ───────────────────────── Armazenamento de arquivos ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos', 'documentos', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
        'application/pdf', 'video/webm', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

create policy "admin le documentos" on storage.objects
  for select to authenticated using (bucket_id = 'documentos' and public.is_admin());
