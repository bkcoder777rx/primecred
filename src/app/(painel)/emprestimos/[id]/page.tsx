import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle, Receipt } from "lucide-react";
import { FormPagamento } from "@/components/form-pagamento";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { prazoTexto } from "@/components/lista-cobranca";
import { CabecalhoPagina, Cartao, CampoTexto, LinhaInfo, Selo, Vazio } from "@/components/ui";
import { situacao } from "@/lib/emprestimo/calculo";
import { carregarConfiguracoes, linkCobranca, textoRecibo, type EmprestimoComCliente } from "@/lib/consultas";
import { formatarData, formatarDataHora, hojeBrasilia } from "@/lib/datas";
import { formatarMoeda, formatarPercentual, linkWhatsApp } from "@/lib/formato";
import { FORMA_PAGAMENTO, TIPO_PAGAMENTO } from "@/lib/rotulos";
import { exigirAdmin } from "@/lib/supabase/server";
import { estadoDoEmprestimo, type Pagamento } from "@/lib/tipos";
import { estornarPagamento, excluirEmprestimo, registrarPagamento, salvarObservacoes } from "../actions";

export const metadata: Metadata = { title: "Empréstimo" };

export default async function PaginaEmprestimo({ params, searchParams }: PageProps<"/emprestimos/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await exigirAdmin();
  const hoje = hojeBrasilia();

  const [{ data: e }, { data: pagamentos }, config] = await Promise.all([
    supabase.from("emprestimos").select("*, clientes(id, nome, telefone)").eq("id", id).maybeSingle<EmprestimoComCliente>(),
    supabase.from("pagamentos").select("*").eq("emprestimo_id", id).order("numero", { ascending: false }).returns<Pagamento[]>(),
    carregarConfiguracoes(supabase),
  ]);
  if (!e) notFound();

  const estado = estadoDoEmprestimo(e);
  const s = situacao(estado, hoje);
  const ativo = e.status === "ativo";
  const nome = e.clientes?.nome ?? "Cliente";
  const ultimoValido = pagamentos?.find((p) => !p.estornado);
  const reciboNovo = typeof sp.recibo === "string" ? pagamentos?.find((p) => p.id === sp.recibo) : undefined;

  return (
    <>
      <CabecalhoPagina
        voltar="/emprestimos"
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            Empréstimo #{e.numero}
            {ativo ? prazoTexto({ ...e, situacao: s }) : <Selo cor="cinza">{e.status === "quitado" ? "Quitado" : "Cancelado"}</Selo>}
          </span>
        }
        descricao={
          <Link href={`/clientes/${e.cliente_id}`} className="text-marca hover:underline">
            {nome}
          </Link>
        }
        acoes={
          ativo && (
            <a
              href={linkCobranca(config, { ...e, situacao: s })}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whats"
            >
              <MessageCircle className="size-4" /> Cobrar no WhatsApp
            </a>
          )
        }
      />

      {reciboNovo && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-marca/30 bg-marca-suave p-4">
          <CheckCircle2 className="size-5 text-marca" />
          <p className="flex-1 text-sm font-medium text-marca-forte">
            Pagamento de {formatarMoeda(reciboNovo.valor_centavos)} registrado ({TIPO_PAGAMENTO[reciboNovo.tipo]}).
          </p>
          <Link href={`/recibo/${reciboNovo.id}`} className="btn btn-pequeno">
            <Receipt className="size-4" /> Ver recibo
          </Link>
          <a
            href={linkWhatsApp(e.clientes?.telefone, textoRecibo(config.nome_empresa, reciboNovo, nome))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whats btn-pequeno"
          >
            <MessageCircle className="size-4" /> Enviar recibo
          </a>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {ativo && (
            <Cartao titulo={`Valores para hoje (${formatarData(hoje)})`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-fundo p-3">
                  <p className="text-xs text-suave uppercase">Só juros (renova)</p>
                  <p className="text-2xl font-semibold tabular-nums">{formatarMoeda(s.soJurosCentavos)}</p>
                </div>
                <div className="rounded-lg bg-fundo p-3">
                  <p className="text-xs text-suave uppercase">Para quitar</p>
                  <p className="text-2xl font-semibold tabular-nums">{formatarMoeda(s.quitarCentavos)}</p>
                </div>
              </div>
              <div className="mt-3">
                <LinhaInfo rotulo="Principal atual">{formatarMoeda(e.principal_centavos)}</LinhaInfo>
                <LinhaInfo rotulo="Juros do período">{formatarMoeda(s.jurosCentavos)}</LinhaInfo>
                <LinhaInfo rotulo="Vencimento">{formatarData(e.vencimento)}</LinhaInfo>
                {s.diasAtraso > 0 && (
                  <LinhaInfo rotulo={`Diárias (${s.diasAtraso} × ${formatarMoeda(e.diaria_centavos)})`}>
                    <span className="text-perigo">{formatarMoeda(s.diariasCentavos)}</span>
                  </LinhaInfo>
                )}
                {Number(e.pago_ciclo_centavos) > 0 && (
                  <LinhaInfo rotulo="Já pago neste ciclo (parcial)">{formatarMoeda(e.pago_ciclo_centavos)}</LinhaInfo>
                )}
              </div>
            </Cartao>
          )}

          <Cartao titulo="Pagamentos">
            {pagamentos?.length ? (
              <ul className="divide-y divide-borda">
                {pagamentos.map((p) => (
                  <li key={p.id} className={`py-3 ${p.estornado ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular-nums">{formatarMoeda(p.valor_centavos)}</span>
                      <span className="text-sm text-suave">
                        {formatarData(p.data)} · {FORMA_PAGAMENTO[p.forma]}
                      </span>
                      {p.estornado ? <Selo cor="vermelho">Estornado</Selo> : <Selo cor="verde">{TIPO_PAGAMENTO[p.tipo]}</Selo>}
                      <Link href={`/recibo/${p.id}`} className="ml-auto text-sm text-marca">
                        Recibo #{p.numero}
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-suave">
                      {[
                        p.diarias_centavos > 0 && `diárias ${formatarMoeda(p.diarias_centavos)}`,
                        p.juros_centavos > 0 && `juros ${formatarMoeda(p.juros_centavos)}`,
                        p.principal_centavos > 0 && `principal ${formatarMoeda(p.principal_centavos)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {p.tipo !== "parcial" && p.tipo !== "quitacao" && ` · venc. ${formatarData(p.vencimento_anterior)} → ${formatarData(p.vencimento_novo)}`}
                      {p.observacao && ` · ${p.observacao}`}
                    </p>
                    {p.estornado && (
                      <p className="mt-1 text-xs text-perigo">
                        Estornado em {formatarDataHora(p.estornado_em)}: {p.motivo_estorno}
                      </p>
                    )}
                    {p.id === ultimoValido?.id && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-suave">Estornar este pagamento</summary>
                        <Formulario
                          acao={estornarPagamento.bind(null, p.id, id)}
                          confirmar="Estornar este pagamento? O empréstimo volta à situação anterior."
                          className="mt-2 flex gap-2"
                        >
                          <input name="motivo" required className="campo" placeholder="Motivo do estorno" />
                          <BotaoEnviar className="btn btn-perigo btn-pequeno shrink-0" pendente="…">
                            Estornar
                          </BotaoEnviar>
                        </Formulario>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio>Nenhum pagamento registrado.</Vazio>
            )}
          </Cartao>
        </div>

        <div className="space-y-5">
          {ativo && (
            <Cartao titulo="Registrar pagamento">
              <FormPagamento acao={registrarPagamento.bind(null, id)} estado={estado} hoje={hoje} />
            </Cartao>
          )}
          <Cartao titulo="Condições">
            <LinhaInfo rotulo="Valor emprestado">{formatarMoeda(e.principal_inicial_centavos)}</LinhaInfo>
            <LinhaInfo rotulo="Juros">
              {formatarPercentual(Number(e.taxa_percent))} a cada {e.prazo_dias} dias
            </LinhaInfo>
            <LinhaInfo rotulo="Diária de atraso">{formatarMoeda(e.diaria_centavos)}</LinhaInfo>
            <LinhaInfo rotulo="Data do empréstimo">{formatarData(e.data_inicio)}</LinhaInfo>
            {e.quitado_em && <LinhaInfo rotulo="Quitado em">{formatarData(e.quitado_em)}</LinhaInfo>}
            <LinhaInfo rotulo="Recebido até hoje">
              {formatarMoeda((pagamentos ?? []).filter((p) => !p.estornado).reduce((t, p) => t + Number(p.valor_centavos), 0))}
            </LinhaInfo>
          </Cartao>
          <Cartao titulo="Observações">
            <Formulario acao={salvarObservacoes.bind(null, id)} className="space-y-2">
              <CampoTexto rotulo="Anotações internas" name="observacoes" defaultValue={e.observacoes ?? ""} />
              <BotaoEnviar className="btn btn-pequeno">Salvar</BotaoEnviar>
            </Formulario>
          </Cartao>
          {!pagamentos?.length && (
            <Formulario
              acao={excluirEmprestimo.bind(null, id, e.cliente_id)}
              confirmar="Excluir este empréstimo lançado por engano?"
            >
              <BotaoEnviar className="btn btn-perigo w-full" pendente="Excluindo…">
                Excluir empréstimo
              </BotaoEnviar>
            </Formulario>
          )}
        </div>
      </div>
    </>
  );
}
