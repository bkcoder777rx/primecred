import type { TipoPagamento } from "@/lib/emprestimo/calculo";
import type {
  CategoriaCaixa,
  FormaPagamento,
  SituacaoCliente,
  StatusDocumento,
  StatusSolicitacao,
} from "@/lib/tipos";

export type CorSelo = "verde" | "vermelho" | "amarelo" | "azul" | "cinza";

export const SITUACAO_CLIENTE: Record<SituacaoCliente, { rotulo: string; cor: CorSelo }> = {
  cadastrado: { rotulo: "Cadastrado", cor: "cinza" },
  em_analise: { rotulo: "Em análise", cor: "azul" },
  aprovado: { rotulo: "Aprovado", cor: "verde" },
  ativo: { rotulo: "Ativo", cor: "verde" },
  atrasado: { rotulo: "Atrasado", cor: "vermelho" },
  inativo: { rotulo: "Inativo", cor: "cinza" },
  bloqueado: { rotulo: "Bloqueado", cor: "vermelho" },
};

export const STATUS_SOLICITACAO: Record<StatusSolicitacao, { rotulo: string; cor: CorSelo }> = {
  aguardando: { rotulo: "Aguardando cliente", cor: "amarelo" },
  em_analise: { rotulo: "Para analisar", cor: "azul" },
  correcao: { rotulo: "Aguardando correção", cor: "amarelo" },
  aprovada: { rotulo: "Aprovada", cor: "verde" },
  recusada: { rotulo: "Recusada", cor: "vermelho" },
  cancelada: { rotulo: "Cancelada", cor: "cinza" },
};

export const STATUS_DOCUMENTO: Record<StatusDocumento, { rotulo: string; cor: CorSelo }> = {
  pendente: { rotulo: "A conferir", cor: "azul" },
  aprovado: { rotulo: "Aprovado", cor: "verde" },
  recusado: { rotulo: "Recusado", cor: "vermelho" },
};

export const TIPO_PAGAMENTO: Record<TipoPagamento, string> = {
  parcial: "Parcial",
  juros: "Juros (renovação)",
  amortizacao: "Juros + abatimento",
  quitacao: "Quitação",
};

export const FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  outro: "Outro",
};

/** Categorias que podem ser lançadas (e excluídas) à mão no caixa. */
export const CATEGORIAS_MANUAIS = ["aporte", "retirada", "despesa", "outro"] as const;

export const CATEGORIA_CAIXA: Record<CategoriaCaixa, string> = {
  pagamento: "Recebimento",
  emprestimo: "Empréstimo liberado",
  aporte: "Aporte",
  retirada: "Retirada",
  despesa: "Despesa",
  estorno: "Estorno",
  outro: "Outro",
};
