"use server";

// Ações do link público do cliente. Não há login: cada chamada valida o token,
// a situação e a validade da solicitação antes de usar o cliente com chave secreta.
import { z } from "zod";
import { mensagemDeErro } from "@/lib/acao";
import {
  BUCKET_DOCUMENTOS,
  DOCUMENTO_POR_TIPO,
  MIMES_PERMITIDOS,
  TAMANHO_MAXIMO_BYTES,
  TIPOS_DOCUMENTO,
  extensaoDoMime,
} from "@/lib/documentos";
import { lerMoeda, somenteDigitos, validarCpf } from "@/lib/formato";
import { notificar } from "@/lib/notificar";
import { UF_ATENDIDA, cidadeAtendida } from "@/lib/pedido";
import { criarClienteServico } from "@/lib/supabase/admin";
import type { Solicitacao, TipoDocumento } from "@/lib/tipos";

type Retorno<T = undefined> = { ok: true; dados?: T } | { ok: false; mensagem: string };

// Mensagens previstas (link inválido, expirado…) vão para o cliente; erros internos só para o log.
class ErroPublico extends Error {}

function falha(e: unknown): { ok: false; mensagem: string } {
  if (e instanceof ErroPublico) return { ok: false, mensagem: e.message };
  console.error("Erro no link do cliente:", mensagemDeErro(e));
  return { ok: false, mensagem: "Não foi possível concluir agora. Tente de novo em instantes." };
}

async function validar(token: string) {
  const supabase = criarClienteServico();
  const { data: s } = await supabase
    .from("solicitacoes")
    .select("*")
    .eq("token", token)
    .maybeSingle<Solicitacao>();
  if (!s) throw new ErroPublico("Link inválido.");
  if (!["aguardando", "correcao"].includes(s.status)) throw new ErroPublico("Este link não aceita mais envios.");
  if (new Date(s.expira_em).getTime() < Date.now()) {
    throw new ErroPublico("Este link expirou. Peça um novo link ao atendente.");
  }
  const { data: empresa } = await supabase.from("empresas").select("status").eq("id", s.empresa_id).maybeSingle();
  if (!["teste", "ativa"].includes(empresa?.status ?? "")) {
    throw new ErroPublico("Atendimento indisponível no momento. Fale com o atendente.");
  }
  return { supabase, s };
}

/** Tipos que o cliente ainda precisa enviar (na correção, só os recusados). */
async function tiposPendentes(supabase: ReturnType<typeof criarClienteServico>, s: Solicitacao) {
  const { data } = await supabase
    .from("documentos")
    .select("tipo, status")
    .eq("solicitacao_id", s.id)
    .eq("ativo", true);
  const enviados = new Map((data ?? []).map((d) => [d.tipo as TipoDocumento, d.status as string]));
  return TIPOS_DOCUMENTO.filter((t) => !enviados.has(t) || enviados.get(t) === "recusado");
}

const esquemaDados = z.object({
  nome: z.string().trim().min(5, "Informe seu nome completo."),
  cpf: z.string().refine(validarCpf, "CPF inválido."),
  telefone: z.string().refine((t) => [10, 11].includes(somenteDigitos(t).length), "Telefone inválido."),
  cep: z.string().refine((t) => somenteDigitos(t).length === 8, "CEP inválido."),
  logradouro: z.string().trim().min(2, "Informe a rua."),
  numero: z.string().trim().min(1, "Informe o número."),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().min(2, "Informe o bairro."),
  cidade: z.string().refine((c) => !!cidadeAtendida(c), "No momento atendemos apenas as cidades da lista."),
  uf: z.string().trim(),
  renda: z.string().refine((t) => (lerMoeda(t) ?? 0) > 0, "Informe sua renda mensal."),
  valorDesejado: z.string().refine((t) => (lerMoeda(t) ?? 0) > 0, "Informe o valor desejado."),
  referencias: z
    .array(
      z.object({
        nome: z.string().trim(),
        telefone: z.string(),
        relacao: z.string().trim(),
      }),
    )
    .transform((rs) => rs.filter((r) => r.nome && somenteDigitos(r.telefone).length >= 10))
    .refine((rs) => rs.length >= 2, "Informe duas referências com nome e telefone."),
});

export type DadosCadastro = z.input<typeof esquemaDados>;

export async function salvarDados(token: string, entrada: DadosCadastro): Promise<Retorno> {
  try {
    const { supabase, s } = await validar(token);
    if (s.status !== "aguardando" || s.dados_enviados_em) {
      return { ok: false, mensagem: "Seus dados já foram enviados." };
    }
    const r = esquemaDados.safeParse(entrada);
    if (!r.success) return { ok: false, mensagem: r.error.issues[0].message };
    const d = r.data;
    const cpf = somenteDigitos(d.cpf);

    const dadosCliente = {
      telefone: somenteDigitos(d.telefone),
      cep: somenteDigitos(d.cep),
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento || null,
      bairro: d.bairro,
      cidade: cidadeAtendida(d.cidade),
      uf: UF_ATENDIDA,
      renda_centavos: lerMoeda(d.renda),
      atualizado_em: new Date().toISOString(),
    };

    // Segurança: o link é público. Só é permitido alterar o cadastro do cliente para o qual
    // o próprio atendente gerou o link. Se o CPF digitado já pertence a outro cliente,
    // o pedido é apenas vinculado a ele e nada do cadastro existente é alterado.
    let clienteId = s.cliente_id;
    let podeAlterarCliente = !!clienteId;
    let observacao: string | null = null;
    if (!clienteId) {
      const { data: existente } = await supabase.from("clientes").select("id").eq("empresa_id", s.empresa_id).eq("cpf", cpf).maybeSingle();
      if (existente) {
        clienteId = existente.id;
        observacao =
          `CPF já cadastrado: o cadastro do cliente NÃO foi alterado. Dados informados neste pedido — ` +
          `nome: ${d.nome}; WhatsApp: ${somenteDigitos(d.telefone)}; endereço: ${d.logradouro}, ${d.numero}` +
          `${d.complemento ? ` (${d.complemento})` : ""}, ${d.bairro}, ${cidadeAtendida(d.cidade)} - ${UF_ATENDIDA}; ` +
          `referências: ${d.referencias.map((ref) => `${ref.nome} ${somenteDigitos(ref.telefone)}`).join(", ")}.`;
      } else {
        const { data, error } = await supabase
          .from("clientes")
          .insert({ ...dadosCliente, nome: d.nome, cpf, empresa_id: s.empresa_id })
          .select("id")
          .single();
        if (error) throw error;
        clienteId = data.id;
        podeAlterarCliente = true;
      }
    }

    if (podeAlterarCliente) {
      if (s.cliente_id) {
        // Link gerado pelo atendente para este cliente: atualiza contato/endereço (não troca nome nem CPF).
        const { error } = await supabase.from("clientes").update(dadosCliente).eq("id", clienteId);
        if (error) throw error;
      }
      await supabase.from("referencias").delete().eq("cliente_id", clienteId);
      const { error: errRef } = await supabase.from("referencias").insert(
        d.referencias.map((ref) => ({
          empresa_id: s.empresa_id,
          cliente_id: clienteId,
          nome: ref.nome,
          telefone: somenteDigitos(ref.telefone),
          relacao: ref.relacao || null,
        })),
      );
      if (errRef) throw errRef;
    }

    const { error } = await supabase
      .from("solicitacoes")
      .update({
        cliente_id: clienteId,
        valor_desejado_centavos: lerMoeda(d.valorDesejado),
        dados_enviados_em: new Date().toISOString(),
        ...(observacao ? { observacao_admin: observacao } : {}),
      })
      .eq("id", s.id)
      .is("dados_enviados_em", null);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

export async function prepararEnvio(
  token: string,
  tipo: TipoDocumento,
  mime: string,
  tamanho: number,
): Promise<Retorno<{ path: string; tokenUpload: string }>> {
  try {
    const { supabase, s } = await validar(token);
    if (!s.dados_enviados_em) return { ok: false, mensagem: "Preencha seus dados primeiro." };
    const def = DOCUMENTO_POR_TIPO[tipo];
    if (!def) return { ok: false, mensagem: "Item inválido." };
    if (!(await tiposPendentes(supabase, s)).includes(tipo)) {
      return { ok: false, mensagem: "Este item já foi enviado." };
    }
    const tipoMime = mime.split(";")[0];
    if (!MIMES_PERMITIDOS[def.modo].includes(tipoMime)) {
      return { ok: false, mensagem: "Formato de arquivo não aceito." };
    }
    if (tamanho > TAMANHO_MAXIMO_BYTES) return { ok: false, mensagem: "Arquivo muito grande (máx. 50 MB)." };

    const path = `empresas/${s.empresa_id}/solicitacoes/${s.id}/${tipo}-${Date.now()}.${extensaoDoMime(tipoMime)}`;
    const { data, error } = await supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUploadUrl(path);
    if (error) throw error;
    return { ok: true, dados: { path: data.path, tokenUpload: data.token } };
  } catch (e) {
    return falha(e);
  }
}

export async function confirmarEnvio(
  token: string,
  tipo: TipoDocumento,
  path: string,
  meta: { mime: string; latitude?: number; longitude?: number; precisao?: number; capturadoEm?: string },
): Promise<Retorno> {
  try {
    const { supabase, s } = await validar(token);
    const def = DOCUMENTO_POR_TIPO[tipo];
    // O caminho precisa ser exatamente o que prepararEnvio gerou (sem "..", barras extras etc.).
    const prefixo = `empresas/${s.empresa_id}/solicitacoes/${s.id}/${tipo}-`;
    const resto = path.slice(prefixo.length);
    if (!def || !path.startsWith(prefixo) || !/^\d{13}\.[a-z0-9]{2,5}$/.test(resto)) {
      return { ok: false, mensagem: "Envio inválido." };
    }
    if (def.gps && (meta.latitude == null || meta.longitude == null)) {
      return { ok: false, mensagem: "É preciso permitir a localização para este item." };
    }
    const { data: info, error: errInfo } = await supabase.storage.from(BUCKET_DOCUMENTOS).info(path);
    if (errInfo || !info) return { ok: false, mensagem: "Arquivo não encontrado. Tente enviar de novo." };

    await supabase
      .from("documentos")
      .update({ ativo: false })
      .eq("solicitacao_id", s.id)
      .eq("tipo", tipo)
      .eq("ativo", true);
    const { error } = await supabase.from("documentos").insert({
      empresa_id: s.empresa_id,
      solicitacao_id: s.id,
      tipo,
      path,
      mime: meta.mime.split(";")[0],
      tamanho_bytes: info.size ?? null,
      latitude: meta.latitude ?? null,
      longitude: meta.longitude ?? null,
      precisao_m: meta.precisao ?? null,
      capturado_em: meta.capturadoEm ?? null,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

export async function enviarParaAnalise(token: string): Promise<Retorno> {
  try {
    const { supabase, s } = await validar(token);
    if (!s.dados_enviados_em) return { ok: false, mensagem: "Preencha seus dados primeiro." };
    const faltando = await tiposPendentes(supabase, s);
    if (faltando.length) {
      return { ok: false, mensagem: `Ainda falta enviar: ${faltando.map((t) => DOCUMENTO_POR_TIPO[t].titulo).join(", ")}.` };
    }
    const agora = new Date().toISOString();
    const { error } = await supabase
      .from("solicitacoes")
      .update({ status: "em_analise", enviada_em: agora })
      .eq("id", s.id);
    if (error) throw error;

    const { data: c } = s.cliente_id
      ? await supabase.from("clientes").select("nome").eq("id", s.cliente_id).single()
      : { data: null };
    const reenvio = s.status === "correcao";
    await notificar(supabase, {
      empresaId: s.empresa_id,
      chave: `solicitacao:${s.id}:${agora}`,
      titulo: reenvio ? "Documentos reenviados" : "Nova documentação recebida",
      corpo: `${c?.nome ?? "Cliente"} ${reenvio ? "reenviou os itens recusados" : "enviou a documentação"}. Toque para conferir.`,
      link: `/solicitacoes/${s.id}`,
    });
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}
