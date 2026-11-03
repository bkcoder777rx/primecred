import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { CabecalhoPagina, Cartao, LinhaInfo, Selo, Vazio } from "@/components/ui";
import { situacao } from "@/lib/emprestimo/calculo";
import { formatarData, formatarDataHora, hojeBrasilia } from "@/lib/datas";
import { formatarCpf, formatarMoeda, formatarPercentual, formatarTelefone, linkWhatsApp } from "@/lib/formato";
import { SITUACAO_CLIENTE, STATUS_SOLICITACAO } from "@/lib/rotulos";
import { exigirAdmin } from "@/lib/supabase/server";
import {
  estadoDoEmprestimo,
  type ClienteView,
  type Emprestimo,
  type Referencia,
  type Solicitacao,
} from "@/lib/tipos";
import { alternarBloqueio } from "../actions";
import { gerarLinkParaCliente } from "../../solicitacoes/actions";

export const metadata: Metadata = { title: "Cliente" };

export default async function PaginaCliente({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const supabase = await exigirAdmin();
  const hoje = hojeBrasilia();

  const [{ data: c }, { data: refs }, { data: emprestimos }, { data: solicitacoes }] = await Promise.all([
    supabase.from("v_clientes").select("*").eq("id", id).maybeSingle<ClienteView>(),
    supabase.from("referencias").select("*").eq("cliente_id", id).order("criado_em").returns<Referencia[]>(),
    supabase.from("emprestimos").select("*").eq("cliente_id", id).order("criado_em", { ascending: false }).returns<Emprestimo[]>(),
    supabase.from("solicitacoes").select("*").eq("cliente_id", id).order("criado_em", { ascending: false }).returns<Solicitacao[]>(),
  ]);
  if (!c) notFound();
  const sit = SITUACAO_CLIENTE[c.situacao];
  const endereco = [
    [c.logradouro, c.numero].filter(Boolean).join(", "),
    c.complemento,
    c.bairro,
    [c.cidade, c.uf].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <CabecalhoPagina
        voltar="/clientes"
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {c.nome} <Selo cor={sit.cor}>{sit.rotulo}</Selo>
          </span>
        }
        acoes={
          <>
            {c.telefone && (
              <a href={linkWhatsApp(c.telefone)} target="_blank" rel="noopener noreferrer" className="btn btn-whats">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
            <Link href={`/clientes/${id}/editar`} className="btn">
              Editar
            </Link>
            {!c.bloqueado && (
              <Link href={`/emprestimos/novo?cliente=${id}`} className="btn btn-primario">
                Novo empréstimo
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Cartao titulo="Dados">
            <LinhaInfo rotulo="CPF">{c.cpf ? formatarCpf(c.cpf) : "—"}</LinhaInfo>
            <LinhaInfo rotulo="Telefone">{formatarTelefone(c.telefone)}</LinhaInfo>
            <LinhaInfo rotulo="Renda">{c.renda_centavos != null ? formatarMoeda(c.renda_centavos) : "—"}</LinhaInfo>
            <LinhaInfo rotulo="Endereço">{endereco || "—"}</LinhaInfo>
            <LinhaInfo rotulo="Cliente desde">{formatarData(c.criado_em)}</LinhaInfo>
            {c.observacoes && <p className="mt-3 rounded-lg bg-fundo p-3 text-sm whitespace-pre-line">{c.observacoes}</p>}
          </Cartao>

          <Cartao titulo="Referências">
            {refs?.length ? (
              <ul className="space-y-2 text-sm">
                {refs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-medium">{r.nome}</span>
                      {r.relacao && <span className="text-suave"> · {r.relacao}</span>}
                      <span className="block text-xs text-suave">{formatarTelefone(r.telefone)}</span>
                    </span>
                    <a href={linkWhatsApp(r.telefone)} target="_blank" rel="noopener noreferrer" className="text-marca">
                      <MessageCircle className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio>Nenhuma referência.</Vazio>
            )}
          </Cartao>

          <form action={alternarBloqueio.bind(null, id, !c.bloqueado)}>
            <button className={`btn w-full ${c.bloqueado ? "" : "btn-perigo"}`}>
              {c.bloqueado ? "Desbloquear cliente" : "Bloquear cliente (mau pagador)"}
            </button>
          </form>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Cartao titulo="Empréstimos">
            {emprestimos?.length ? (
              <ul className="divide-y divide-borda">
                {emprestimos.map((e) => {
                  const s = situacao(estadoDoEmprestimo(e), hoje);
                  return (
                    <li key={e.id}>
                      <Link href={`/emprestimos/${e.id}`} className="flex flex-wrap items-center gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">
                            #{e.numero} · {formatarMoeda(e.principal_inicial_centavos)} a {formatarPercentual(Number(e.taxa_percent))}
                          </span>
                          <span className="block text-xs text-suave">
                            desde {formatarData(e.data_inicio)}
                            {e.status === "ativo" && ` · venc. ${formatarData(e.vencimento)}`}
                            {e.status === "quitado" && ` · quitado em ${formatarData(e.quitado_em)}`}
                          </span>
                        </span>
                        {e.status === "ativo" ? (
                          <span className="text-right">
                            {s.vencido ? <Selo cor="vermelho">Atrasado</Selo> : <Selo cor="verde">Em dia</Selo>}
                            <span className="block text-xs text-suave tabular-nums">
                              quitar {formatarMoeda(s.quitarCentavos)}
                            </span>
                          </span>
                        ) : (
                          <Selo cor="cinza">{e.status === "quitado" ? "Quitado" : "Cancelado"}</Selo>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Vazio>Nenhum empréstimo ainda.</Vazio>
            )}
          </Cartao>

          <Cartao
            titulo="Documentação"
            acao={
              <form action={gerarLinkParaCliente.bind(null, id)}>
                <button className="btn btn-pequeno">Gerar novo link</button>
              </form>
            }
          >
            {solicitacoes?.length ? (
              <ul className="divide-y divide-borda">
                {solicitacoes.map((s) => {
                  const st = STATUS_SOLICITACAO[s.status];
                  return (
                    <li key={s.id}>
                      <Link href={`/solicitacoes/${s.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <span>
                          Solicitação de {formatarDataHora(s.criado_em)}
                          {s.valor_desejado_centavos != null && (
                            <span className="block text-xs text-suave">
                              pediu {formatarMoeda(s.valor_desejado_centavos)}
                            </span>
                          )}
                        </span>
                        <Selo cor={st.cor}>{st.rotulo}</Selo>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Vazio>Nenhuma documentação enviada.</Vazio>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
