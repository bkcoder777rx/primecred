"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mensagemDeErro, texto, type Resultado } from "@/lib/acao";
import { aplicarPagamento } from "@/lib/emprestimo/calculo";
import { adicionarDias, hojeBrasilia } from "@/lib/datas";
import { lerMoeda } from "@/lib/formato";
import { exigirAdmin } from "@/lib/supabase/server";
import { estadoDoEmprestimo, type Emprestimo, type FormaPagamento } from "@/lib/tipos";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function criarEmprestimo(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const clienteId = texto(fd, "cliente_id");
  const principal = lerMoeda(texto(fd, "valor"));
  const taxa = Number(texto(fd, "taxa").replace(",", "."));
  const prazo = Number(texto(fd, "prazo"));
  const diaria = lerMoeda(texto(fd, "diaria") || "0");
  const dataInicio = texto(fd, "data_inicio");
  const vencimento = texto(fd, "vencimento") || (DATA.test(dataInicio) ? adicionarDias(dataInicio, prazo) : "");

  if (!clienteId) return { ok: false, mensagem: "Escolha o cliente." };
  if (!principal || principal <= 0) return { ok: false, mensagem: "Informe o valor emprestado." };
  if (!(taxa > 0 && taxa <= 1000)) return { ok: false, mensagem: "Taxa de juros inválida." };
  if (!Number.isInteger(prazo) || prazo < 1) return { ok: false, mensagem: "Prazo inválido." };
  if (diaria === null || diaria < 0) return { ok: false, mensagem: "Diária de atraso inválida." };
  if (!DATA.test(dataInicio) || !DATA.test(vencimento)) return { ok: false, mensagem: "Datas inválidas." };
  if (vencimento <= dataInicio) return { ok: false, mensagem: "O vencimento deve ser depois da data do empréstimo." };

  const { data: cliente } = await supabase.from("clientes").select("bloqueado").eq("id", clienteId).single();
  if (cliente?.bloqueado) return { ok: false, mensagem: "Este cliente está bloqueado." };

  const { data: id, error } = await supabase.rpc("criar_emprestimo", {
    p_cliente_id: clienteId,
    p_principal_centavos: principal,
    p_taxa_percent: taxa,
    p_prazo_dias: prazo,
    p_diaria_centavos: diaria,
    p_data_inicio: dataInicio,
    p_vencimento: vencimento,
    p_observacoes: texto(fd, "observacoes") || null,
    p_registrar_caixa: fd.get("registrar_caixa") === "on",
  });
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };

  revalidatePath("/emprestimos");
  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/emprestimos/${id}`);
}

export async function registrarPagamento(emprestimoId: string, _: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const { data: e, error: errE } = await supabase
    .from("emprestimos")
    .select("*")
    .eq("id", emprestimoId)
    .single<Emprestimo>();
  if (errE || !e) return { ok: false, mensagem: "Empréstimo não encontrado." };

  const valor = lerMoeda(texto(fd, "valor"));
  const data = texto(fd, "data");
  const forma = (texto(fd, "forma") || "pix") as FormaPagamento;
  if (!valor) return { ok: false, mensagem: "Informe o valor recebido." };
  if (!DATA.test(data)) return { ok: false, mensagem: "Data inválida." };
  if (data > hojeBrasilia()) return { ok: false, mensagem: "A data do pagamento não pode ser no futuro." };
  if (data < e.data_inicio) return { ok: false, mensagem: "A data é anterior ao empréstimo." };

  const { data: ultimo } = await supabase
    .from("pagamentos")
    .select("data")
    .eq("emprestimo_id", emprestimoId)
    .eq("estornado", false)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultimo && data < ultimo.data) {
    return { ok: false, mensagem: "A data é anterior ao último pagamento registrado." };
  }

  let resultado;
  try {
    resultado = aplicarPagamento(estadoDoEmprestimo(e), valor, data);
  } catch (err) {
    return { ok: false, mensagem: mensagemDeErro(err) };
  }

  const { data: pagamentoId, error } = await supabase.rpc("aplicar_pagamento", {
    p_emprestimo_id: emprestimoId,
    p_versao: e.versao,
    p_estado: resultado.estado,
    p_pagamento: {
      data,
      valorCentavos: valor,
      diariasCentavos: resultado.diariasCentavos,
      jurosCentavos: resultado.jurosCentavos,
      principalCentavos: resultado.principalCentavos,
      tipo: resultado.tipo,
      forma,
      observacao: texto(fd, "observacao") || null,
    },
  });
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };

  revalidatePath("/", "layout");
  redirect(`/emprestimos/${emprestimoId}?recibo=${pagamentoId}`);
}

export async function estornarPagamento(
  pagamentoId: string,
  emprestimoId: string,
  _: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const motivo = texto(fd, "motivo");
  if (!motivo) return { ok: false, mensagem: "Informe o motivo do estorno." };
  const { error } = await supabase.rpc("estornar_pagamento", { p_pagamento_id: pagamentoId, p_motivo: motivo });
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };
  revalidatePath("/", "layout");
  redirect(`/emprestimos/${emprestimoId}`);
}

export async function excluirEmprestimo(emprestimoId: string, clienteId: string, _: Resultado): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const { error } = await supabase.rpc("excluir_emprestimo", { p_emprestimo_id: emprestimoId });
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };
  revalidatePath("/", "layout");
  redirect(`/clientes/${clienteId}`);
}

export async function salvarObservacoes(emprestimoId: string, _: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const { error } = await supabase
    .from("emprestimos")
    .update({ observacoes: texto(fd, "observacoes") || null })
    .eq("id", emprestimoId);
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };
  revalidatePath(`/emprestimos/${emprestimoId}`);
  return { ok: true, mensagem: "Observações salvas." };
}
