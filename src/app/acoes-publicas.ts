"use server";

// Ação pública da página de divulgação: registra o pedido e devolve o link de cadastro.
import { randomBytes } from "node:crypto";
import { mensagemDeErro } from "@/lib/acao";
import { carregarConfiguracoes } from "@/lib/consultas";
import { formatarMoeda, formatarTelefone, lerMoeda, somenteDigitos } from "@/lib/formato";
import { notificar } from "@/lib/notificar";
import {
  FORMAS_PAGAMENTO_PEDIDO,
  ORIGEM_POR_VALOR,
  TIPO_RENDA_POR_VALOR,
  cidadeAtendida,
  type FormaPagamentoPedido,
  type OrigemPedido,
  type TipoRenda,
} from "@/lib/pedido";
import { criarClienteServico } from "@/lib/supabase/admin";
import { limparUtms, type Utms } from "@/lib/utm";

type Retorno = { ok: true; token: string } | { ok: false; mensagem: string };

export type EntradaPedido = {
  valor: string;
  formaPagamento: FormaPagamentoPedido;
  cidade: string;
  renda: string;
  tipoRenda: TipoRenda;
  nome: string;
  telefone: string;
  instagram: string;
  origem: OrigemPedido | "";
  origemDetalhe: string;
  /** Campo invisível: se vier preenchido, é robô. */
  site?: string;
  /** Parâmetros do anúncio clicado (utm_source, utm_campaign…). */
  utms?: Utms;
};

export async function iniciarSolicitacao(empresaSlug: string, e: EntradaPedido): Promise<Retorno> {
  const valor = lerMoeda(e.valor);
  const renda = lerMoeda(e.renda);
  const cidade = cidadeAtendida(e.cidade);
  const nome = e.nome.trim().replace(/\s+/g, " ").slice(0, 120);
  const telefone = somenteDigitos(e.telefone);
  const instagram = e.instagram.trim().replace(/^@+/, "").replace(/\s/g, "").slice(0, 60) || null;
  const origem = e.origem && ORIGEM_POR_VALOR[e.origem] ? e.origem : null;

  if (e.site) return { ok: false, mensagem: "Não foi possível enviar." };
  if (!valor || valor <= 0) return { ok: false, mensagem: "Informe o valor desejado." };
  if (!FORMAS_PAGAMENTO_PEDIDO.some((f) => f.valor === e.formaPagamento)) {
    return { ok: false, mensagem: "Escolha como deseja pagar." };
  }
  if (!cidade) return { ok: false, mensagem: "No momento atendemos apenas as cidades da lista." };
  if (!renda || renda <= 0) return { ok: false, mensagem: "Informe sua renda mensal." };
  if (!TIPO_RENDA_POR_VALOR[e.tipoRenda]) return { ok: false, mensagem: "Escolha seu tipo de renda." };
  if (nome.length < 3) return { ok: false, mensagem: "Informe seu nome completo." };
  if (![10, 11].includes(telefone.length)) return { ok: false, mensagem: "Informe um WhatsApp válido com DDD." };

  const dados = {
    nome_indicado: nome,
    valor_desejado_centavos: valor,
    forma_pagamento: e.formaPagamento,
    cidade,
    renda_centavos: renda,
    tipo_renda: e.tipoRenda,
    instagram,
    origem,
    origem_detalhe: origem ? e.origemDetalhe.trim().slice(0, 120) || null : null,
  };
  const utms = limparUtms(e.utms);

  try {
    const supabase = criarClienteServico();
    const { data: empresa } = await supabase.from("empresas").select("id, status").eq("slug", empresaSlug).maybeSingle();
    if (!empresa || !["teste", "ativa"].includes(empresa.status)) {
      return { ok: false, mensagem: "Atendimento indisponível no momento." };
    }

    // Mesmo WhatsApp com pedido em aberto: reaproveita o link em vez de criar outro.
    const { data: aberta } = await supabase
      .from("solicitacoes")
      .select("id, token")
      .eq("empresa_id", empresa.id)
      .eq("telefone_indicado", telefone)
      .in("status", ["aguardando", "correcao"])
      .gt("expira_em", new Date().toISOString())
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aberta) {
      await supabase.from("solicitacoes").update(dados).eq("id", aberta.id);
      if (Object.keys(utms).length) await gravarUtms(supabase, aberta.id, utms);
      return { ok: true, token: aberta.token };
    }

    // Proteção contra robôs/enxurrada: no máximo 20 pedidos novos pelo site a cada 10 minutos.
    const { count: recentes } = await supabase
      .from("solicitacoes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresa.id)
      .not("tipo_renda", "is", null)
      .gt("criado_em", new Date(Date.now() - 10 * 60_000).toISOString());
    if ((recentes ?? 0) >= 20) {
      return { ok: false, mensagem: "Muitos pedidos agora. Tente de novo em alguns minutos." };
    }

    const config = await carregarConfiguracoes(supabase, empresa.id);
    const token = randomBytes(24).toString("base64url");
    const { data, error } = await supabase
      .from("solicitacoes")
      .insert({
        ...dados,
        empresa_id: empresa.id,
        token,
        telefone_indicado: telefone,
        expira_em: new Date(Date.now() + config.validade_link_dias * 86_400_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    if (Object.keys(utms).length) await gravarUtms(supabase, data.id, utms);

    await notificar(supabase, {
      empresaId: empresa.id,
      chave: `pedido-site:${data.id}`,
      titulo: "Novo pedido pelo site",
      corpo: `${nome} · ${formatarMoeda(valor)} · ${cidade} · ${formatarTelefone(telefone)}`,
      link: `/solicitacoes/${data.id}`,
    });
    return { ok: true, token };
  } catch (err) {
    console.error("Falha ao iniciar solicitação", mensagemDeErro(err));
    return { ok: false, mensagem: "Não foi possível enviar agora. Tente de novo em instantes." };
  }
}

/** Grava as UTMs à parte: se a migration 0005 ainda não rodou, o pedido não se perde por causa delas. */
async function gravarUtms(supabase: ReturnType<typeof criarClienteServico>, id: string, utms: Utms) {
  const { error } = await supabase.from("solicitacoes").update(utms).eq("id", id);
  if (error) console.error("Falha ao gravar UTMs (rodou a migration 0005?)", error.message);
}

export type EntradaEnvioDocumentos = {
  nome: string;
  telefone: string;
  /** Campo invisível: se vier preenchido, é robô. */
  site?: string;
};

/**
 * Link fixo "Envio de Documentos": o atendente manda só para quem quer fechar.
 * O cliente informa nome e WhatsApp e segue para o mesmo envio de dados e documentos do /s/<token>.
 */
export async function iniciarEnvioDocumentos(empresaSlug: string, e: EntradaEnvioDocumentos): Promise<Retorno> {
  const nome = e.nome.trim().replace(/\s+/g, " ").slice(0, 120);
  const telefone = somenteDigitos(e.telefone);

  if (e.site) return { ok: false, mensagem: "Não foi possível enviar." };
  if (nome.length < 3) return { ok: false, mensagem: "Informe seu nome completo." };
  if (![10, 11].includes(telefone.length)) return { ok: false, mensagem: "Informe um WhatsApp válido com DDD." };

  try {
    const supabase = criarClienteServico();
    const { data: empresa } = await supabase.from("empresas").select("id, status").eq("slug", empresaSlug).maybeSingle();
    if (!empresa || !["teste", "ativa"].includes(empresa.status)) {
      return { ok: false, mensagem: "Atendimento indisponível no momento." };
    }

    // Mesmo WhatsApp com envio em aberto (pelo site, pelo painel ou por este link): continua de onde parou.
    const { data: aberta } = await supabase
      .from("solicitacoes")
      .select("id, token, nome_indicado")
      .eq("empresa_id", empresa.id)
      .eq("telefone_indicado", telefone)
      .in("status", ["aguardando", "correcao"])
      .gt("expira_em", new Date().toISOString())
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aberta) {
      if (!aberta.nome_indicado) await supabase.from("solicitacoes").update({ nome_indicado: nome }).eq("id", aberta.id);
      return { ok: true, token: aberta.token };
    }

    // Proteção contra robôs/enxurrada: no máximo 20 envios novos sem pedido do site a cada 10 minutos.
    const { count: recentes } = await supabase
      .from("solicitacoes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresa.id)
      .is("tipo_renda", null)
      .gt("criado_em", new Date(Date.now() - 10 * 60_000).toISOString());
    if ((recentes ?? 0) >= 20) {
      return { ok: false, mensagem: "Muitos envios agora. Tente de novo em alguns minutos." };
    }

    const config = await carregarConfiguracoes(supabase, empresa.id);
    const token = randomBytes(24).toString("base64url");
    const { data, error } = await supabase
      .from("solicitacoes")
      .insert({
        empresa_id: empresa.id,
        token,
        nome_indicado: nome,
        telefone_indicado: telefone,
        expira_em: new Date(Date.now() + config.validade_link_dias * 86_400_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;

    await notificar(supabase, {
      empresaId: empresa.id,
      chave: `envio-documentos:${data.id}`,
      titulo: "Cliente começou o envio de documentos",
      corpo: `${nome} · ${formatarTelefone(telefone)} abriu o link de Envio de Documentos.`,
      link: `/solicitacoes/${data.id}`,
    });
    return { ok: true, token };
  } catch (err) {
    console.error("Falha ao iniciar envio de documentos", mensagemDeErro(err));
    return { ok: false, mensagem: "Não foi possível continuar agora. Tente de novo em instantes." };
  }
}
