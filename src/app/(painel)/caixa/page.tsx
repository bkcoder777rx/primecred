import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { CabecalhoPagina, Campo, CampoSelecao, Cartao, Indicador, Vazio } from "@/components/ui";
import { formatarData, hojeBrasilia } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { CATEGORIAS_MANUAIS, CATEGORIA_CAIXA } from "@/lib/rotulos";
import { exigirAdmin } from "@/lib/supabase/server";
import type { MovimentoCaixa } from "@/lib/tipos";
import { excluirMovimento, lancarMovimento } from "./actions";
import { Wallet } from "lucide-react";

export const metadata: Metadata = { title: "Caixa" };

function mesVizinho(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const NOME_MES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function PaginaCaixa({ searchParams }: PageProps<"/caixa">) {
  const sp = await searchParams;
  const hoje = hojeBrasilia();
  const mes = /^\d{4}-\d{2}$/.test(String(sp.mes)) ? String(sp.mes) : hoje.slice(0, 7);
  const inicio = `${mes}-01`;
  const fim = `${mesVizinho(mes, 1)}-01`;
  const supabase = await exigirAdmin();

  const [{ data: movs }, { data: todos }] = await Promise.all([
    supabase
      .from("caixa_movimentos")
      .select("*")
      .gte("data", inicio)
      .lt("data", fim)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .returns<MovimentoCaixa[]>(),
    supabase.from("caixa_movimentos").select("tipo, valor_centavos"),
  ]);

  const sinal = (m: Pick<MovimentoCaixa, "tipo">) => (m.tipo === "entrada" ? 1 : -1);
  const saldoGeral = (todos ?? []).reduce((s, m) => s + sinal(m) * Number(m.valor_centavos), 0);
  const entradas = (movs ?? []).filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor_centavos), 0);
  const saidas = (movs ?? []).filter((m) => m.tipo === "saida").reduce((s, m) => s + Number(m.valor_centavos), 0);
  const nomeMes = NOME_MES.format(new Date(`${inicio}T00:00:00Z`));

  return (
    <>
      <CabecalhoPagina rotulo="Financeiro" icone={Wallet} titulo="Caixa" descricao="Entradas e saídas de dinheiro. Empréstimos e pagamentos entram sozinhos." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Saldo atual" valor={formatarMoeda(saldoGeral)} tom={saldoGeral < 0 ? "perigo" : "marca"} />
        <Indicador rotulo={`Entradas`} valor={formatarMoeda(entradas)} detalhe={nomeMes} />
        <Indicador rotulo={`Saídas`} valor={formatarMoeda(saidas)} detalhe={nomeMes} />
        <Indicador
          rotulo="Resultado do mês"
          valor={formatarMoeda(entradas - saidas)}
          tom={entradas - saidas < 0 ? "perigo" : "normal"}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Cartao
          className="lg:col-span-2"
          titulo={<span className="capitalize">{nomeMes}</span>}
          acao={
            <div className="flex gap-1">
              <Link href={`/caixa?mes=${mesVizinho(mes, -1)}`} className="btn btn-pequeno" aria-label="Mês anterior">
                ←
              </Link>
              <Link href={`/caixa?mes=${mesVizinho(mes, 1)}`} className="btn btn-pequeno" aria-label="Próximo mês">
                →
              </Link>
            </div>
          }
        >
          {movs?.length ? (
            <ul className="divide-y divide-borda">
              {movs.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-12 shrink-0 text-xs text-suave">{formatarData(m.data).slice(0, 5)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{m.descricao || CATEGORIA_CAIXA[m.categoria]}</span>
                    <span className="block text-xs text-suave">{CATEGORIA_CAIXA[m.categoria]}</span>
                  </span>
                  <span className={`font-semibold tabular-nums ${m.tipo === "entrada" ? "text-marca" : "text-perigo"}`}>
                    {m.tipo === "entrada" ? "+" : "−"} {formatarMoeda(m.valor_centavos)}
                  </span>
                  {(CATEGORIAS_MANUAIS as readonly string[]).includes(m.categoria) && (
                    <form action={excluirMovimento.bind(null, m.id)}>
                      <button className="p-1 text-suave hover:text-perigo" aria-label="Excluir lançamento">
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Vazio>Nenhum movimento neste mês.</Vazio>
          )}
        </Cartao>

        <Cartao titulo="Lançamento manual" className="h-fit">
          <Formulario acao={lancarMovimento} className="space-y-3">
            <CampoSelecao
              rotulo="Tipo"
              name="tipo"
              opcoes={[
                { valor: "entrada", rotulo: "Entrada (+)" },
                { valor: "saida", rotulo: "Saída (−)" },
              ]}
            />
            <CampoSelecao
              rotulo="Categoria"
              name="categoria"
              opcoes={CATEGORIAS_MANUAIS.map((c) => ({ valor: c, rotulo: CATEGORIA_CAIXA[c] }))}
            />
            <Campo rotulo="Valor (R$)" name="valor" inputMode="decimal" required placeholder="0,00" />
            <Campo rotulo="Data" name="data" type="date" defaultValue={hoje} required />
            <Campo rotulo="Descrição" name="descricao" placeholder="Ex.: aporte inicial, gasolina…" />
            <BotaoEnviar className="btn btn-primario w-full">Lançar</BotaoEnviar>
          </Formulario>
        </Cartao>
      </div>
    </>
  );
}
