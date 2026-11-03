import type { Metadata } from "next";
import { ListaCobranca } from "@/components/lista-cobranca";
import { CabecalhoPagina, Cartao } from "@/components/ui";
import { carregarConfiguracoes, carregarEmprestimosAtivos } from "@/lib/consultas";
import { formatarData, hojeBrasilia } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { exigirAdmin } from "@/lib/supabase/server";
import { PhoneCall } from "lucide-react";

export const metadata: Metadata = { title: "Cobrança" };

export default async function PaginaCobranca() {
  const supabase = await exigirAdmin();
  const hoje = hojeBrasilia();
  const [config, ativos] = await Promise.all([carregarConfiguracoes(supabase), carregarEmprestimosAtivos(supabase, hoje)]);

  const atrasados = ativos
    .filter((e) => e.situacao.vencido)
    .sort((a, b) => b.situacao.diasAtraso - a.situacao.diasAtraso);
  const hojeLista = ativos.filter((e) => e.situacao.venceHoje);
  const proximos = ativos.filter((e) => e.situacao.diasParaVencer > 0 && e.situacao.diasParaVencer <= Math.max(config.dias_aviso, 1));
  const soma = (l: typeof ativos) => formatarMoeda(l.reduce((s, e) => s + e.situacao.soJurosCentavos, 0));

  return (
    <>
      <CabecalhoPagina
        rotulo="Cobrança do dia"
        icone={PhoneCall}
        titulo="Cobrança"
        descricao={`${formatarData(hoje)} · o botão Cobrar abre o WhatsApp com a mensagem e os valores do dia.`}
      />
      <div className="space-y-5">
        <Cartao titulo={`Atrasados (${atrasados.length}) · ${soma(atrasados)}`}>
          <ListaCobranca itens={atrasados} config={config} vazio="Nenhum atrasado." />
        </Cartao>
        <Cartao titulo={`Vencem hoje (${hojeLista.length}) · ${soma(hojeLista)}`}>
          <ListaCobranca itens={hojeLista} config={config} vazio="Nenhum vencimento hoje." />
        </Cartao>
        <Cartao titulo={`Próximos ${config.dias_aviso} dias (${proximos.length}) · ${soma(proximos)}`}>
          <ListaCobranca itens={proximos} config={config} vazio="Nenhum vencimento nos próximos dias." />
        </Cartao>
      </div>
    </>
  );
}
