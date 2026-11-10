-- Prime Cred — rastreamento dos anúncios (UTMs) nos pedidos feitos pelo site.
-- Rodar uma vez no Supabase: SQL Editor → colar este arquivo → Run.
-- No Gerenciador de Anúncios da Meta, em "Parâmetros de URL", use:
-- utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}

alter table public.solicitacoes
  add column if not exists utm_source text,
  add column if not exists utm_campaign text,
  add column if not exists utm_medium text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text;
