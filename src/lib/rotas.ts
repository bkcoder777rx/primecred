// Primeiro trecho de endereço usado pelo próprio sistema. Qualquer outro "/<algo>" é a página de uma empresa,
// então nenhuma empresa pode usar estes nomes como endereço (slug).
export const ROTAS_RESERVADAS = new Set([
  "painel", "clientes", "emprestimos", "cobranca", "solicitacoes", "caixa", "notificacoes",
  "configuracoes", "usuarios", "recibo", "bk", "suspenso", "api", "login", "obrigado", "s", "trocar-senha", "envio-documentos",
]);
