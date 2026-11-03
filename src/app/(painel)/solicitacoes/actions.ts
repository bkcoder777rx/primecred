"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mensagemDeErro, texto, type Resultado } from "@/lib/acao";
import { carregarConfiguracoes } from "@/lib/consultas";
import { somenteDigitos } from "@/lib/formato";
import { exigirAdmin } from "@/lib/supabase/server";
import type { StatusDocumento } from "@/lib/tipos";

type Supa = Awaited<ReturnType<typeof exigirAdmin>>;

async function criarSolicitacao(
  supabase: Supa,
  dados: { cliente_id?: string; nome_indicado: string | null; telefone_indicado: string | null },
) {
  const config = await carregarConfiguracoes(supabase);
  const expira = new Date(Date.now() + config.validade_link_dias * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("solicitacoes")
    .insert({ ...dados, token: randomBytes(24).toString("base64url"), expira_em: expira })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function gerarLink(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await exigirAdmin();
  let id: string;
  try {
    id = await criarSolicitacao(supabase, {
      nome_indicado: texto(fd, "nome") || null,
      telefone_indicado: somenteDigitos(texto(fd, "telefone")) || null,
    });
  } catch (e) {
    return { ok: false, mensagem: mensagemDeErro(e) };
  }
  revalidatePath("/solicitacoes");
  redirect(`/solicitacoes/${id}`);
}

export async function gerarLinkParaCliente(clienteId: string) {
  const supabase = await exigirAdmin();
  const { data: c, error } = await supabase.from("clientes").select("nome, telefone").eq("id", clienteId).single();
  if (error) throw error;
  const id = await criarSolicitacao(supabase, {
    cliente_id: clienteId,
    nome_indicado: c.nome,
    telefone_indicado: c.telefone,
  });
  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/solicitacoes/${id}`);
}

export async function avaliarDocumento(
  documentoId: string,
  solicitacaoId: string,
  status: StatusDocumento,
  _: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const motivo = status === "recusado" ? texto(fd, "motivo") : "";
  if (status === "recusado" && !motivo) return { ok: false, mensagem: "Escreva o motivo da recusa para o cliente." };
  const { error } = await supabase
    .from("documentos")
    .update({ status, motivo_recusa: motivo || null })
    .eq("id", documentoId);
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };
  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  return { ok: true };
}

export async function concluirAnalise(solicitacaoId: string, _: Resultado): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const { data: docs, error } = await supabase
    .from("documentos")
    .select("status")
    .eq("solicitacao_id", solicitacaoId)
    .eq("ativo", true);
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };
  if (docs.some((d) => d.status === "pendente")) {
    return { ok: false, mensagem: "Ainda há itens sem avaliação. Aprove ou recuse cada um." };
  }

  const recusados = docs.filter((d) => d.status === "recusado").length;
  if (recusados > 0) {
    const config = await carregarConfiguracoes(supabase);
    const { error: e } = await supabase
      .from("solicitacoes")
      .update({
        status: "correcao",
        analisada_em: new Date().toISOString(),
        expira_em: new Date(Date.now() + config.validade_link_dias * 86_400_000).toISOString(),
      })
      .eq("id", solicitacaoId);
    if (e) return { ok: false, mensagem: mensagemDeErro(e) };
    revalidatePath(`/solicitacoes/${solicitacaoId}`);
    return {
      ok: true,
      mensagem: `${recusados} item(ns) recusado(s). Envie o link de novo ao cliente para ele reenviar só o que falta.`,
    };
  }

  const { error: e } = await supabase
    .from("solicitacoes")
    .update({ status: "aprovada", analisada_em: new Date().toISOString() })
    .eq("id", solicitacaoId);
  if (e) return { ok: false, mensagem: mensagemDeErro(e) };
  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  revalidatePath("/solicitacoes");
  return { ok: true, mensagem: "Documentação aprovada! Já pode criar o empréstimo." };
}

export async function alterarStatusSolicitacao(
  solicitacaoId: string,
  status: "recusada" | "cancelada",
  _: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const { error } = await supabase
    .from("solicitacoes")
    .update({
      status,
      observacao_admin: texto(fd, "observacao") || null,
      analisada_em: new Date().toISOString(),
    })
    .eq("id", solicitacaoId);
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };
  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  revalidatePath("/solicitacoes");
  return { ok: true, mensagem: status === "recusada" ? "Solicitação recusada." : "Solicitação cancelada." };
}

export async function renovarValidade(solicitacaoId: string) {
  const supabase = await exigirAdmin();
  const config = await carregarConfiguracoes(supabase);
  const { error } = await supabase
    .from("solicitacoes")
    .update({ expira_em: new Date(Date.now() + config.validade_link_dias * 86_400_000).toISOString() })
    .eq("id", solicitacaoId);
  if (error) throw error;
  revalidatePath(`/solicitacoes/${solicitacaoId}`);
}
