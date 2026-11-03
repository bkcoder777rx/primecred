// Rotina diária (Vercel Cron, 8h de Brasília): gera os avisos de vencimento e atraso
// e envia um resumo por push para os aparelhos inscritos.
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { carregarConfiguracoes, carregarEmprestimosAtivos } from "@/lib/consultas";
import { formatarData, hojeBrasilia } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { enviarPush, notificar } from "@/lib/notificar";
import { criarClienteServico } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const resumo = (t: string) => createHash("sha256").update(t).digest();
  const recebido = request.headers.get("authorization") ?? "";
  if (!segredo || !timingSafeEqual(resumo(recebido), resumo(`Bearer ${segredo}`))) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const supabase = criarClienteServico();
  const hoje = hojeBrasilia();

  const { data: empresas, error } = await supabase.from("empresas").select("id").in("status", ["teste", "ativa"]);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const resultado: Record<string, unknown>[] = [];
  for (const { id: empresaId } of empresas ?? []) {
    try {
      resultado.push({ empresaId, ...(await rotinaDaEmpresa(supabase, empresaId, hoje)) });
    } catch (e) {
      console.error("Rotina diária falhou para a empresa", empresaId, e);
      resultado.push({ empresaId, erro: true });
    }
  }
  return NextResponse.json({ hoje, empresas: resultado });
}

/** Avisos de vencimento, atraso e links expirando de uma empresa, com resumo por push. */
async function rotinaDaEmpresa(supabase: ReturnType<typeof criarClienteServico>, empresaId: string, hoje: string) {
  const [config, ativos] = await Promise.all([
    carregarConfiguracoes(supabase, empresaId),
    carregarEmprestimosAtivos(supabase, hoje, empresaId),
  ]);

  const atrasados = ativos.filter((e) => e.situacao.vencido);
  const venceHoje = ativos.filter((e) => e.situacao.venceHoje);
  const proximos = ativos.filter((e) => e.situacao.diasParaVencer > 0 && e.situacao.diasParaVencer <= config.dias_aviso);

  // Um aviso por empréstimo por dia (a chave evita duplicar se a rotina rodar duas vezes).
  const registrar = async (lista: typeof ativos, titulo: (e: (typeof ativos)[number]) => string) => {
    for (const e of lista) {
      const { error: erro } = await supabase.from("notificacoes").upsert(
        {
          empresa_id: empresaId,
          chave: `vencimento:${e.id}:${hoje}`,
          titulo: titulo(e),
          corpo: `Só juros ${formatarMoeda(e.situacao.soJurosCentavos)} · quitar ${formatarMoeda(e.situacao.quitarCentavos)}`,
          link: `/emprestimos/${e.id}`,
        },
        { onConflict: "chave", ignoreDuplicates: true },
      );
      if (erro) console.error(erro);
    }
  };
  await registrar(atrasados, (e) => `${e.clientes?.nome}: ${e.situacao.diasAtraso || 1} dia(s) de atraso`);
  await registrar(venceHoje, (e) => `${e.clientes?.nome}: vence hoje`);
  await registrar(
    proximos,
    (e) => `${e.clientes?.nome}: vence ${e.situacao.diasParaVencer === 1 ? "amanhã" : `em ${e.situacao.diasParaVencer} dias`} (${formatarData(e.vencimento)})`,
  );

  // Links de cadastro que vencem nas próximas 24h sem envio.
  const { data: links } = await supabase
    .from("solicitacoes")
    .select("id, nome_indicado, expira_em")
    .eq("empresa_id", empresaId)
    .in("status", ["aguardando", "correcao"])
    .gt("expira_em", new Date().toISOString())
    .lt("expira_em", new Date(Date.now() + 86_400_000).toISOString());
  for (const s of links ?? []) {
    await notificar(supabase, {
      empresaId,
      chave: `link-expirando:${s.id}`,
      titulo: `Link de cadastro expira em breve${s.nome_indicado ? `: ${s.nome_indicado}` : ""}`,
      corpo: "O cliente ainda não enviou a documentação.",
      link: `/solicitacoes/${s.id}`,
    });
  }

  const soma = (l: typeof ativos) => formatarMoeda(l.reduce((t, e) => t + e.situacao.soJurosCentavos, 0));
  const partes = [
    atrasados.length && `${atrasados.length} atrasado(s) (${soma(atrasados)})`,
    venceHoje.length && `${venceHoje.length} vence(m) hoje (${soma(venceHoje)})`,
    proximos.length && `${proximos.length} nos próximos ${config.dias_aviso} dias`,
  ].filter(Boolean);
  if (partes.length) {
    await enviarPush(supabase, { empresaId, titulo: "Resumo de cobrança", corpo: partes.join(" · "), link: "/cobranca" });
  }

  return { atrasados: atrasados.length, venceHoje: venceHoje.length, proximos: proximos.length };
}
