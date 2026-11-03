import Link from "next/link";
import { ListaCobranca } from "@/components/lista-cobranca";
import { CabecalhoPagina, Cartao, Indicador, Vazio } from "@/components/ui";
import { carregarConfiguracoes, carregarEmprestimosAtivos } from "@/lib/consultas";
import { formatarData, formatarDataHora, hojeBrasilia, inicioDoMes } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { exigirAdmin } from "@/lib/supabase/server";
import { LayoutDashboard } from "lucide-react";

export default async function PaginaInicio() {
  const supabase = await exigirAdmin();
  const hoje = hojeBrasilia();

  const [config, ativos, pagamentosMes, caixa, solicitacoes] = await Promise.all([
    carregarConfiguracoes(supabase),
    carregarEmprestimosAtivos(supabase, hoje),
    supabase
      .from("pagamentos")
      .select("valor_centavos, juros_centavos, diarias_centavos, principal_centavos")
      .eq("estornado", false)
      .gte("data", inicioDoMes(hoje)),
    supabase.from("caixa_movimentos").select("tipo, valor_centavos"),
    supabase
      .from("solicitacoes")
      .select("id, nome_indicado, enviada_em, clientes(nome)")
      .eq("status", "em_analise")
      .order("enviada_em")
      .limit(5),
  ]);

  const naRua = ativos.reduce((s, e) => s + Number(e.principal_centavos), 0);
  const atrasados = ativos.filter((e) => e.situacao.vencido).sort((a, b) => b.situacao.diasAtraso - a.situacao.diasAtraso);
  const venceHoje = ativos.filter((e) => e.situacao.venceHoje);
  const proximos = ativos.filter(
    (e) => !e.situacao.vencido && e.situacao.diasParaVencer <= Math.max(config.dias_aviso, 7),
  );
  const clientesAtivos = new Set(ativos.map((e) => e.cliente_id)).size;

  const pags = pagamentosMes.data ?? [];
  const recebidoMes = pags.reduce((s, p) => s + Number(p.valor_centavos), 0);
  const lucroMes = pags.reduce((s, p) => s + Number(p.juros_centavos) + Number(p.diarias_centavos), 0);
  const saldoCaixa = (caixa.data ?? []).reduce(
    (s, m) => s + (m.tipo === "entrada" ? 1 : -1) * Number(m.valor_centavos),
    0,
  );

  return (
    <>
      <CabecalhoPagina
        rotulo="Visão geral"
        icone={LayoutDashboard}
        titulo="Início"
        descricao={`Hoje é ${formatarData(hoje)}`}
        acoes={
          <>
            <Link href="/solicitacoes?novo=1" className="btn btn-contorno px-5 py-3">
              Gerar link de cadastro
            </Link>
            <Link href="/emprestimos/novo" className="btn btn-primario">
              Novo empréstimo
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Indicador rotulo="Na rua" valor={formatarMoeda(naRua)} detalhe={`${ativos.length} empréstimos`} href="/emprestimos" />
        <Indicador rotulo="Clientes ativos" valor={clientesAtivos} href="/clientes?situacao=ativos" />
        <Indicador
          rotulo="Vence hoje"
          valor={venceHoje.length}
          detalhe={formatarMoeda(venceHoje.reduce((s, e) => s + e.situacao.soJurosCentavos, 0))}
          tom={venceHoje.length ? "alerta" : "normal"}
          href="/cobranca"
        />
        <Indicador
          rotulo="Atrasados"
          valor={atrasados.length}
          detalhe={formatarMoeda(atrasados.reduce((s, e) => s + e.situacao.soJurosCentavos, 0))}
          tom={atrasados.length ? "perigo" : "normal"}
          href="/cobranca"
        />
        <Indicador
          rotulo="Recebido no mês"
          valor={formatarMoeda(recebidoMes)}
          detalhe={`Juros + diárias: ${formatarMoeda(lucroMes)}`}
          tom="marca"
        />
        <Indicador rotulo="Saldo em caixa" valor={formatarMoeda(saldoCaixa)} href="/caixa" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Atrasados" acao={<Link href="/cobranca" className="text-sm text-marca">Ver cobrança</Link>}>
          <ListaCobranca itens={atrasados.slice(0, 8)} config={config} vazio="Nenhum empréstimo atrasado. 🎉" />
        </Cartao>
        <Cartao titulo="Vencendo nos próximos dias">
          <ListaCobranca itens={proximos.slice(0, 8)} config={config} vazio="Nenhum vencimento próximo." />
        </Cartao>
        <Cartao
          titulo="Documentos para analisar"
          acao={<Link href="/solicitacoes" className="text-sm text-marca">Ver todas</Link>}
        >
          {solicitacoes.data?.length ? (
            <ul className="divide-y divide-borda">
              {solicitacoes.data.map((s) => {
                const cliente = s.clientes as unknown as { nome: string } | null;
                return (
                  <li key={s.id}>
                    <Link href={`/solicitacoes/${s.id}`} className="flex justify-between gap-3 py-3 text-sm">
                      <span className="font-medium">{cliente?.nome ?? s.nome_indicado ?? "Sem nome"}</span>
                      <span className="text-suave">enviado {formatarDataHora(s.enviada_em)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vazio>Nenhuma documentação aguardando análise.</Vazio>
          )}
        </Cartao>
      </div>
    </>
  );
}
