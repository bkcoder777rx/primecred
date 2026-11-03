import type { SupabaseClient } from "@supabase/supabase-js";
import { situacao, type Situacao } from "@/lib/emprestimo/calculo";
import { formatarData } from "@/lib/datas";
import { formatarMoeda, linkWhatsApp, preencherModelo } from "@/lib/formato";
import { estadoDoEmprestimo, type Configuracoes, type Emprestimo, type Pagamento } from "@/lib/tipos";

export type EmprestimoComCliente = Emprestimo & {
  clientes: { id: string; nome: string; telefone: string | null } | null;
};

export type EmprestimoSituacao = EmprestimoComCliente & { situacao: Situacao };

/** Configurações da empresa. Logado: as regras do banco já trazem só a do usuário.
 *  Com a chave secreta (link público, rotina diária) é obrigatório informar a empresa. */
export async function carregarConfiguracoes(supabase: SupabaseClient, empresaId?: string): Promise<Configuracoes> {
  let consulta = supabase.from("configuracoes").select("*");
  if (empresaId) consulta = consulta.eq("empresa_id", empresaId);
  const { data, error } = await consulta.limit(1).single();
  if (error) throw error;
  return { ...data, taxa_padrao: Number(data.taxa_padrao) } as Configuracoes;
}

/** Empréstimos ativos com os valores do dia calculados, ordenados pelo vencimento. */
export async function carregarEmprestimosAtivos(
  supabase: SupabaseClient,
  hoje: string,
  empresaId?: string,
): Promise<EmprestimoSituacao[]> {
  let consulta = supabase
    .from("emprestimos")
    .select("*, clientes(id, nome, telefone)")
    .eq("status", "ativo");
  if (empresaId) consulta = consulta.eq("empresa_id", empresaId);
  const { data, error } = await consulta.order("vencimento");
  if (error) throw error;
  return (data as EmprestimoComCliente[]).map((e) => ({
    ...e,
    situacao: situacao(estadoDoEmprestimo(e), hoje),
  }));
}

export function mensagemCobranca(config: Configuracoes, e: EmprestimoSituacao): string {
  const s = e.situacao;
  const atraso = s.diasAtraso > 0 ? ` (${s.diasAtraso} dia${s.diasAtraso > 1 ? "s" : ""} de atraso)` : "";
  return preencherModelo(config.mensagem_cobranca, {
    nome: e.clientes?.nome.split(" ")[0] ?? "",
    empresa: config.nome_empresa,
    vencimento: formatarData(e.vencimento) + atraso,
    so_juros: formatarMoeda(s.soJurosCentavos),
    quitar: formatarMoeda(s.quitarCentavos),
    principal: formatarMoeda(e.principal_centavos),
    pix: config.chave_pix ? `Chave Pix: ${config.chave_pix}` : "",
  });
}

export function principalAposPagamento(p: Pagamento): number {
  return Number(p.estado_anterior.principal_centavos) - Number(p.principal_centavos);
}

export function textoRecibo(
  empresa: string,
  p: Pagamento,
  nomeCliente: string,
): string {
  const linhas = [
    `*${empresa} — Recibo nº ${p.numero}*`,
    `Cliente: ${nomeCliente}`,
    `Data: ${formatarData(p.data)}`,
    `Valor recebido: ${formatarMoeda(p.valor_centavos)}`,
  ];
  if (p.diarias_centavos > 0) linhas.push(`• Diárias de atraso: ${formatarMoeda(p.diarias_centavos)}`);
  if (p.juros_centavos > 0) linhas.push(`• Juros: ${formatarMoeda(p.juros_centavos)}`);
  if (p.principal_centavos > 0) linhas.push(`• Abatimento do principal: ${formatarMoeda(p.principal_centavos)}`);
  if (p.tipo === "quitacao") linhas.push("", "✅ Empréstimo QUITADO. Obrigado!");
  else if (p.tipo === "parcial") linhas.push("", "Pagamento parcial registrado.");
  else
    linhas.push(
      "",
      `Próximo vencimento: ${formatarData(p.vencimento_novo)}`,
      `Saldo devedor (principal): ${formatarMoeda(principalAposPagamento(p))}`,
    );
  return linhas.join("\n");
}

export function linkCobranca(config: Configuracoes, e: EmprestimoSituacao): string {
  return linkWhatsApp(e.clientes?.telefone, mensagemCobranca(config, e));
}
