import type { Metadata } from "next";
import Link from "next/link";
import { prazoTexto } from "@/components/lista-cobranca";
import { CabecalhoPagina, Selo, Vazio } from "@/components/ui";
import { carregarEmprestimosAtivos, type EmprestimoComCliente } from "@/lib/consultas";
import { formatarData, hojeBrasilia } from "@/lib/datas";
import { formatarMoeda, formatarPercentual } from "@/lib/formato";
import { exigirAdmin } from "@/lib/supabase/server";
import { HandCoins } from "lucide-react";

export const metadata: Metadata = { title: "Empréstimos" };

const FILTROS = [
  { valor: "", rotulo: "Ativos" },
  { valor: "atrasados", rotulo: "Atrasados" },
  { valor: "semana", rotulo: "Vencem em 7 dias" },
  { valor: "quitados", rotulo: "Quitados" },
];

export default async function PaginaEmprestimos({ searchParams }: PageProps<"/emprestimos">) {
  const sp = await searchParams;
  const filtro = String(sp.filtro ?? "");
  const busca = String(sp.q ?? "").trim().toLowerCase();
  const supabase = await exigirAdmin();
  const hoje = hojeBrasilia();

  let quitados: EmprestimoComCliente[] = [];
  let ativos = filtro === "quitados" ? [] : await carregarEmprestimosAtivos(supabase, hoje);
  if (filtro === "quitados") {
    const { data } = await supabase
      .from("emprestimos")
      .select("*, clientes(id, nome, telefone)")
      .eq("status", "quitado")
      .order("quitado_em", { ascending: false })
      .limit(200);
    quitados = (data ?? []) as EmprestimoComCliente[];
  }
  if (filtro === "atrasados") ativos = ativos.filter((e) => e.situacao.vencido);
  if (filtro === "semana") ativos = ativos.filter((e) => !e.situacao.vencido && e.situacao.diasParaVencer <= 7);
  if (busca) {
    ativos = ativos.filter((e) => e.clientes?.nome.toLowerCase().includes(busca) || String(e.numero) === busca);
    quitados = quitados.filter((e) => e.clientes?.nome.toLowerCase().includes(busca) || String(e.numero) === busca);
  }

  const totalPrincipal = ativos.reduce((s, e) => s + Number(e.principal_centavos), 0);

  return (
    <>
      <CabecalhoPagina
        rotulo="Gestão de empréstimos"
        icone={HandCoins}
        titulo="Empréstimos"
        descricao={filtro !== "quitados" ? `${ativos.length} empréstimos · ${formatarMoeda(totalPrincipal)} na rua` : undefined}
        acoes={
          <Link href="/emprestimos/novo" className="btn btn-primario px-5 py-3">
            Novo empréstimo
          </Link>
        }
      />

      <form className="mb-3" action="/emprestimos">
        {filtro && <input type="hidden" name="filtro" value={filtro} />}
        <input name="q" defaultValue={busca} placeholder="Buscar por cliente ou nº do empréstimo" className="campo" />
      </form>
      <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor ? `/emprestimos?filtro=${f.valor}` : "/emprestimos"}
            className={`pilula ${
              filtro === f.valor ? "pilula-ativa" : ""
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      <div className="cartao p-0 sm:p-0">
        {filtro === "quitados" ? (
          quitados.length === 0 ? (
            <Vazio>Nenhum empréstimo quitado.</Vazio>
          ) : (
            <ul className="divide-y divide-borda">
              {quitados.map((e) => (
                <li key={e.id}>
                  <Link href={`/emprestimos/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fundo">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.clientes?.nome}</span>
                      <span className="block text-xs text-suave">
                        #{e.numero} · {formatarMoeda(e.principal_inicial_centavos)} · de {formatarData(e.data_inicio)} a{" "}
                        {formatarData(e.quitado_em)}
                      </span>
                    </span>
                    <Selo cor="cinza">Quitado</Selo>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : ativos.length === 0 ? (
          <Vazio>Nenhum empréstimo aqui.</Vazio>
        ) : (
          <ul className="divide-y divide-borda">
            {ativos.map((e) => (
              <li key={e.id}>
                <Link href={`/emprestimos/${e.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-fundo">
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block truncate font-medium">{e.clientes?.nome}</span>
                    <span className="block text-xs text-suave">
                      #{e.numero} · {formatarMoeda(e.principal_centavos)} a {formatarPercentual(Number(e.taxa_percent))} · venc.{" "}
                      {formatarData(e.vencimento)}
                    </span>
                  </span>
                  {prazoTexto(e)}
                  <span className="w-28 text-right">
                    <span className="block font-semibold tabular-nums">{formatarMoeda(e.situacao.soJurosCentavos)}</span>
                    <span className="block text-xs text-suave tabular-nums">
                      quitar {formatarMoeda(e.situacao.quitarCentavos)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
