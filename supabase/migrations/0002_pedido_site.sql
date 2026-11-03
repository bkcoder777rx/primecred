-- Prime Cred — dados extras do pedido feito pela página de divulgação.
-- Rodar uma vez no Supabase: SQL Editor → colar este arquivo → Run.

alter table public.solicitacoes
  add column if not exists forma_pagamento text check (forma_pagamento in ('a_vista', 'parcelado')),
  add column if not exists cidade text,
  add column if not exists renda_centavos bigint check (renda_centavos >= 0),
  add column if not exists tipo_renda text check (tipo_renda in (
    'clt', 'informal', 'autonomo', 'beneficiario', 'estagiario', 'servidor', 'seguro', 'sem_comprovacao'
  )),
  add column if not exists instagram text,
  add column if not exists origem text check (origem in ('anuncio', 'instagram', 'indicacao', 'outro')),
  add column if not exists origem_detalhe text;
