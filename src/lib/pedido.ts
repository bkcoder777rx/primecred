// Opções do pedido feito pela página de divulgação.

/** Cidades atendidas (todas na Bahia). Só elas aparecem para o cliente. */
export const CIDADES_ATENDIDAS = [
  "Camaçari",
  "Dias d'Ávila",
  "Catu",
  "Abrantes",
  "Lauro de Freitas",
  "Feira de Santana",
  "São Sebastião do Passé",
  "Mata de São João",
  "Pojuca",
  "Salvador",
] as const;

export const UF_ATENDIDA = "BA";

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .trim();

/** Devolve o nome oficial da lista se a cidade for atendida (ignora acentos/maiúsculas). */
export function cidadeAtendida(cidade: string | null | undefined): string | null {
  if (!cidade) return null;
  const alvo = normalizar(cidade);
  return CIDADES_ATENDIDAS.find((c) => normalizar(c) === alvo) ?? null;
}

export type TipoRenda =
  | "clt"
  | "informal"
  | "autonomo"
  | "beneficiario"
  | "estagiario"
  | "servidor"
  | "seguro"
  | "sem_comprovacao";

export const TIPOS_RENDA: { valor: TipoRenda; rotulo: string; descricao: string; comprovante: string }[] = [
  {
    valor: "clt",
    rotulo: "CLT registrado",
    descricao: "Carteira assinada.",
    comprovante: "Último holerite ou o PDF da Carteira de Trabalho Digital (app ou gov.br).",
  },
  {
    valor: "informal",
    rotulo: "Trabalho informal",
    descricao: "Sem carteira assinada.",
    comprovante: "Extrato bancário dos últimos 3 meses mostrando suas entradas (pode ser print do app do banco).",
  },
  {
    valor: "autonomo",
    rotulo: "Autônomo / conta própria",
    descricao: "Prestador de serviço ou trabalho independente.",
    comprovante: "Extrato bancário dos últimos 3 meses ou comprovante do MEI / notas emitidas.",
  },
  {
    valor: "beneficiario",
    rotulo: "Beneficiário",
    descricao: "Recebe benefício.",
    comprovante: "Extrato do benefício (Meu INSS, Caixa Tem ou app do banco).",
  },
  {
    valor: "estagiario",
    rotulo: "Estagiário",
    descricao: "Estuda e trabalha.",
    comprovante: "Termo de estágio ou comprovante do último pagamento da bolsa.",
  },
  {
    valor: "servidor",
    rotulo: "Servidor público",
    descricao: "Efetivo ou comissionado.",
    comprovante: "Último contracheque.",
  },
  {
    valor: "seguro",
    rotulo: "Recebe seguro",
    descricao: "Seguro-desemprego ou outro seguro.",
    comprovante: "Comprovante das parcelas do seguro (app Carteira de Trabalho Digital ou Caixa).",
  },
  {
    valor: "sem_comprovacao",
    rotulo: "Sem comprovação de renda",
    descricao: "Não tenho como comprovar.",
    comprovante: "Extrato bancário ou print do app do banco com suas movimentações dos últimos 3 meses.",
  },
];

export const TIPO_RENDA_POR_VALOR = Object.fromEntries(TIPOS_RENDA.map((t) => [t.valor, t])) as Record<
  TipoRenda,
  (typeof TIPOS_RENDA)[number]
>;

export type FormaPagamentoPedido = "a_vista" | "parcelado";

export const FORMAS_PAGAMENTO_PEDIDO: { valor: FormaPagamentoPedido; rotulo: string; descricao: string }[] = [
  { valor: "a_vista", rotulo: "À vista", descricao: "Mais chance de aprovação" },
];

export type OrigemPedido = "anuncio" | "instagram" | "indicacao" | "outro";

export const ORIGENS: { valor: OrigemPedido; rotulo: string; detalhe?: string }[] = [
  { valor: "anuncio", rotulo: "Anúncio no Instagram/Facebook" },
  { valor: "instagram", rotulo: "Instagram, página ou blogueira", detalhe: "Qual página ou perfil?" },
  { valor: "indicacao", rotulo: "Indicação de amigo", detalhe: "Nome de quem indicou" },
  { valor: "outro", rotulo: "Outro", detalhe: "Como nos conheceu?" },
];

export const ORIGEM_POR_VALOR = Object.fromEntries(ORIGENS.map((o) => [o.valor, o])) as Record<
  OrigemPedido,
  (typeof ORIGENS)[number]
>;
