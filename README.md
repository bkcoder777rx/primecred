# Prime Cred — Controle de empréstimos

Sistema web (computador e celular) para:

- **Clientes**: cadastro, ficha completa, referências, situação (ativo, atrasado, inativo, bloqueado…).
- **Link de documentação**: gere um link, envie pelo WhatsApp e o cliente preenche os dados e envia os 7 documentos
  (fotos e vídeo da residência pela câmera, na hora, com GPS). Você confere item por item; se recusar algum,
  o cliente reenvia só aquele item pelo mesmo link.
- **Empréstimos**: juros por período (ex.: 40% a cada 30 dias), diária fixa de atraso, pagamento só dos juros
  (renova), abatimento do principal e quitação. Recibo, estorno e histórico completo.
- **Cobrança**: lista do dia (atrasados, vencendo hoje, próximos) com botão que abre o WhatsApp com a mensagem pronta.
- **Caixa**: entradas e saídas automáticas + lançamentos manuais (aporte, retirada, despesa).
- **Notificações**: aviso no sistema e no celular (push) com o resumo diário às 8h e quando chegam documentos.

## Regras de cálculo

| Situação | Só juros (renova) | Quitar |
| --- | --- | --- |
| R$ 1.000 a 40%, no vencimento | R$ 400 | R$ 1.400 |
| 1 dia de atraso (diária R$ 30) | R$ 430 | R$ 1.430 |

- Pagamento é aplicado em ordem: **diárias → juros → principal**.
- Pagou diárias + juros: renova por mais um período (o calendário original é mantido; o atraso não empurra a data).
- Pagou mais que isso: o excedente **abate o principal** (pagou R$ 700 de R$ 1.000 → principal R$ 700, próximos juros R$ 280).
- Pagou menos: fica como **parcial**, não renova e as diárias continuam correndo.
- Regras testadas em `src/lib/emprestimo/calculo.test.ts` (`npm test`).

## Como colocar no ar

### 1. Supabase (banco de dados, login e arquivos)
1. Crie uma conta em https://supabase.com e um projeto novo (região São Paulo).
2. Em **SQL Editor**, cole todo o conteúdo de `supabase/migrations/0001_inicial.sql` e clique em **Run**.
3. Em **Authentication → Sign In / Providers**, desative **Allow new users to sign up** (só você terá acesso).
4. Em **Project Settings → API Keys**, copie a *Project URL*, a *publishable key* e a *secret key*.

### 2. Configuração local
```bash
cp .env.example .env.local        # preencha com os dados do Supabase
npx web-push generate-vapid-keys  # cole as chaves em NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY
npm install
npm run criar-admin               # cria seu login (e-mail e senha)
npm run dev                       # abre em http://localhost:3000
```

### 3. Vercel (publicar na internet)
1. Suba este projeto para um repositório no GitHub e importe em https://vercel.com.
2. Em **Settings → Environment Variables**, cadastre as mesmas variáveis do `.env.local`
   (troque `NEXT_PUBLIC_SITE_URL` pelo endereço da Vercel, ex.: `https://primecred.vercel.app`).
3. O aviso diário (`vercel.json`) roda todo dia às 8h de Brasília usando o `CRON_SECRET`.

### 4. No celular
- Abra o endereço do sistema e instale: Android → menu ⋮ → **Instalar app**; iPhone → Compartilhar → **Adicionar à Tela de Início**.
- Em **Configurações → Notificações no celular**, toque em **Ativar**.

## Custos e limites
- Supabase grátis: 500 MB de banco e **1 GB de arquivos** (fotos + vídeos ≈ 20–40 clientes). Plano Pro (~US$ 25/mês) = 100 GB.
- Vercel grátis (Hobby) atende bem um único usuário.

## Estrutura
- `src/lib/emprestimo/calculo.ts` — regras de juros, diárias, renovação e quitação (funções puras + testes).
- `supabase/migrations/` — tabelas, regras de acesso (RLS) e operações atômicas (pagamento, estorno).
- `src/app/(painel)/` — telas do administrador.
- `src/app/s/[token]/` — link público do cliente.
- `src/app/api/cron/diario/` — rotina diária de avisos.
