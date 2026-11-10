// Tipos das linhas do banco (espelham supabase/migrations/0001_inicial.sql).
import type { EstadoEmprestimo, StatusEmprestimo, TipoPagamento } from "@/lib/emprestimo/calculo";
import type { OrigemPedido, TipoRenda } from "@/lib/pedido";

export type Configuracoes = {
  nome_empresa: string;
  taxa_padrao: number;
  prazo_padrao: number;
  diaria_padrao_centavos: number;
  dias_aviso: number;
  validade_link_dias: number;
  chave_pix: string | null;
  mensagem_cobranca: string;
};

export type Cliente = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  renda_centavos: number | null;
  observacoes: string | null;
  bloqueado: boolean;
  criado_em: string;
};

export type SituacaoCliente =
  | "cadastrado"
  | "em_analise"
  | "aprovado"
  | "ativo"
  | "atrasado"
  | "inativo"
  | "bloqueado";

export type ClienteView = Cliente & {
  emprestimos_ativos: number;
  principal_aberto_centavos: number;
  situacao: SituacaoCliente;
};

export type Referencia = {
  id: string;
  cliente_id: string;
  nome: string;
  telefone: string;
  relacao: string | null;
};

export type StatusSolicitacao = "aguardando" | "em_analise" | "correcao" | "aprovada" | "recusada" | "cancelada";

export type Solicitacao = {
  id: string;
  empresa_id: string;
  token: string;
  cliente_id: string | null;
  nome_indicado: string | null;
  telefone_indicado: string | null;
  status: StatusSolicitacao;
  valor_desejado_centavos: number | null;
  dados_enviados_em: string | null;
  enviada_em: string | null;
  analisada_em: string | null;
  observacao_admin: string | null;
  forma_pagamento: "a_vista" | "parcelado" | null;
  cidade: string | null;
  renda_centavos: number | null;
  tipo_renda: TipoRenda | null;
  instagram: string | null;
  origem: OrigemPedido | null;
  origem_detalhe: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  fbclid?: string | null;
  expira_em: string;
  criado_em: string;
};

export type TipoDocumento =
  | "rg_segurando"
  | "rg_frente"
  | "rg_verso"
  | "comprovante_residencia"
  | "foto_residencia"
  | "video_residencia"
  | "selfie_residencia"
  | "comprovante_renda";

export type StatusDocumento = "pendente" | "aprovado" | "recusado";

export type Documento = {
  id: string;
  solicitacao_id: string;
  tipo: TipoDocumento;
  path: string;
  mime: string | null;
  tamanho_bytes: number | null;
  status: StatusDocumento;
  motivo_recusa: string | null;
  latitude: number | null;
  longitude: number | null;
  precisao_m: number | null;
  capturado_em: string | null;
  ativo: boolean;
  criado_em: string;
};

export type Emprestimo = {
  id: string;
  numero: number;
  cliente_id: string;
  principal_inicial_centavos: number;
  principal_centavos: number;
  taxa_percent: number;
  prazo_dias: number;
  diaria_centavos: number;
  data_inicio: string;
  vencimento: string;
  diarias_pagas_ate: string | null;
  pago_ciclo_centavos: number;
  status: StatusEmprestimo;
  quitado_em: string | null;
  observacoes: string | null;
  versao: number;
  criado_em: string;
};

export type FormaPagamento = "pix" | "dinheiro" | "transferencia" | "outro";

export type Pagamento = {
  id: string;
  numero: number;
  emprestimo_id: string;
  data: string;
  valor_centavos: number;
  diarias_centavos: number;
  juros_centavos: number;
  principal_centavos: number;
  tipo: TipoPagamento;
  forma: FormaPagamento;
  observacao: string | null;
  /** Linha do empréstimo antes deste pagamento (usada no estorno e no recibo). */
  estado_anterior: { principal_centavos: number };
  vencimento_anterior: string;
  vencimento_novo: string;
  estornado: boolean;
  estornado_em: string | null;
  motivo_estorno: string | null;
  criado_em: string;
};

export type CategoriaCaixa = "pagamento" | "emprestimo" | "aporte" | "retirada" | "despesa" | "estorno" | "outro";

export type MovimentoCaixa = {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  categoria: CategoriaCaixa;
  valor_centavos: number;
  descricao: string | null;
  emprestimo_id: string | null;
  pagamento_id: string | null;
  criado_em: string;
};

export type Notificacao = {
  id: string;
  chave: string;
  titulo: string;
  corpo: string | null;
  link: string | null;
  lida: boolean;
  criado_em: string;
};

/** Numeric do Postgres chega como string pelo PostgREST; normaliza para o cálculo. */
export function estadoDoEmprestimo(e: Emprestimo): EstadoEmprestimo {
  return {
    principalCentavos: Number(e.principal_centavos),
    taxaPercent: Number(e.taxa_percent),
    prazoDias: Number(e.prazo_dias),
    diariaCentavos: Number(e.diaria_centavos),
    vencimento: e.vencimento,
    diariasPagasAte: e.diarias_pagas_ate,
    pagoCicloCentavos: Number(e.pago_ciclo_centavos),
    status: e.status,
    quitadoEm: e.quitado_em,
  };
}
