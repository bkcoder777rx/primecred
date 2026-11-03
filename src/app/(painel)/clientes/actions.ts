"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mensagemDeErro, texto, textoOuNulo, type Resultado } from "@/lib/acao";
import { lerMoeda, somenteDigitos, validarCpf } from "@/lib/formato";
import { exigirAdmin } from "@/lib/supabase/server";

export async function salvarCliente(id: string | null, _: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await exigirAdmin();

  const nome = texto(fd, "nome");
  if (nome.length < 3) return { ok: false, mensagem: "Informe o nome completo." };
  const cpf = somenteDigitos(texto(fd, "cpf")) || null;
  if (cpf && !validarCpf(cpf)) return { ok: false, mensagem: "CPF inválido." };
  const rendaTexto = texto(fd, "renda");
  const renda = rendaTexto ? lerMoeda(rendaTexto) : null;
  if (rendaTexto && renda === null) return { ok: false, mensagem: "Renda inválida." };

  const dados = {
    nome,
    cpf,
    telefone: somenteDigitos(texto(fd, "telefone")) || null,
    cep: somenteDigitos(texto(fd, "cep")) || null,
    logradouro: textoOuNulo(fd, "logradouro"),
    numero: textoOuNulo(fd, "numero"),
    complemento: textoOuNulo(fd, "complemento"),
    bairro: textoOuNulo(fd, "bairro"),
    cidade: textoOuNulo(fd, "cidade"),
    uf: textoOuNulo(fd, "uf")?.toUpperCase() ?? null,
    renda_centavos: renda,
    observacoes: textoOuNulo(fd, "observacoes"),
    atualizado_em: new Date().toISOString(),
  };

  const refNomes = fd.getAll("ref_nome").map(String);
  const refTels = fd.getAll("ref_telefone").map(String);
  const refRelacoes = fd.getAll("ref_relacao").map(String);
  const referencias = refNomes
    .map((n, i) => ({
      nome: n.trim(),
      telefone: somenteDigitos(refTels[i]),
      relacao: refRelacoes[i]?.trim() || null,
    }))
    .filter((r) => r.nome && r.telefone);

  let clienteId = id;
  try {
    if (id) {
      const { error } = await supabase.from("clientes").update(dados).eq("id", id);
      if (error) throw error;
      const { error: errDel } = await supabase.from("referencias").delete().eq("cliente_id", id);
      if (errDel) throw errDel;
    } else {
      const { data, error } = await supabase.from("clientes").insert(dados).select("id").single();
      if (error) throw error;
      clienteId = data.id;
    }
    if (referencias.length) {
      const { error } = await supabase
        .from("referencias")
        .insert(referencias.map((r) => ({ ...r, cliente_id: clienteId })));
      if (error) throw error;
    }
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return { ok: false, mensagem: "Já existe um cliente cadastrado com este CPF." };
    }
    return { ok: false, mensagem: mensagemDeErro(e) };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${clienteId}`);
}

export async function alternarBloqueio(id: string, bloquear: boolean) {
  const supabase = await exigirAdmin();
  const { error } = await supabase.from("clientes").update({ bloqueado: bloquear }).eq("id", id);
  if (error) throw error;
  revalidatePath(`/clientes/${id}`);
}

export async function excluirCliente(id: string, _: Resultado): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const { count } = await supabase
    .from("emprestimos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id);
  if (count) return { ok: false, mensagem: "Cliente com empréstimos não pode ser excluído. Use “Bloquear”." };
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };
  revalidatePath("/clientes");
  redirect("/clientes");
}
