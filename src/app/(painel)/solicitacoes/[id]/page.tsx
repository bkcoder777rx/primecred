import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { AvaliarDocumento } from "@/components/avaliar-documento";
import { CompartilharLink } from "@/components/compartilhar-link";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { CabecalhoPagina, Cartao, LinhaInfo, Selo } from "@/components/ui";
import { BUCKET_DOCUMENTOS, DOCUMENTOS } from "@/lib/documentos";
import { formatarDataHora, jaPassou } from "@/lib/datas";
import { formatarCpf, formatarMoeda, formatarTelefone, linkWhatsApp } from "@/lib/formato";
import { FORMAS_PAGAMENTO_PEDIDO, ORIGEM_POR_VALOR, TIPO_RENDA_POR_VALOR, UF_ATENDIDA } from "@/lib/pedido";
import { STATUS_DOCUMENTO, STATUS_SOLICITACAO } from "@/lib/rotulos";
import { exigirAdmin } from "@/lib/supabase/server";
import type { Cliente, Documento, Referencia, Solicitacao } from "@/lib/tipos";
import { urlDoSite } from "@/lib/url";
import { separarNomeId } from "@/lib/utm";
import {
  alterarStatusSolicitacao,
  avaliarDocumento,
  concluirAnalise,
  renovarValidade,
} from "../actions";

export const metadata: Metadata = { title: "Solicitação" };

function Mapa({ lat, lng }: { lat: number; lng: number }) {
  const d = 0.003;
  const bbox = [lng - d, lat - d, lng + d, lat + d].join(",");
  return (
    <iframe
      title="Localização da captura"
      className="h-40 w-full rounded-lg border border-borda"
      loading="lazy"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
    />
  );
}

function Previa({ doc, url }: { doc: Documento; url: string | null }) {
  if (!url) return <div className="grid h-48 place-items-center rounded-lg bg-fundo text-sm text-suave">Sem prévia</div>;
  if (doc.mime?.startsWith("video/")) {
    return <video src={url} controls playsInline className="max-h-80 w-full rounded-lg bg-black" />;
  }
  if (doc.mime === "application/pdf") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="grid h-48 place-items-center rounded-lg bg-fundo text-sm font-medium text-marca">
        Abrir PDF
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Supabase */}
      <img src={url} alt="" className="max-h-80 w-full rounded-lg bg-fundo object-contain" />
    </a>
  );
}

export default async function PaginaSolicitacao({ params }: PageProps<"/solicitacoes/[id]">) {
  const { id } = await params;
  const supabase = await exigirAdmin();

  const { data: s } = await supabase.from("solicitacoes").select("*").eq("id", id).maybeSingle<Solicitacao>();
  if (!s) notFound();

  const [{ data: cliente }, { data: refs }, { data: docs }, site, config] = await Promise.all([
    s.cliente_id
      ? supabase.from("clientes").select("*").eq("id", s.cliente_id).maybeSingle<Cliente>()
      : Promise.resolve({ data: null }),
    s.cliente_id
      ? supabase.from("referencias").select("*").eq("cliente_id", s.cliente_id).returns<Referencia[]>()
      : Promise.resolve({ data: [] as Referencia[] }),
    supabase.from("documentos").select("*").eq("solicitacao_id", id).eq("ativo", true).returns<Documento[]>(),
    urlDoSite(),
    supabase.from("configuracoes").select("nome_empresa").limit(1).single(),
  ]);

  const paths = (docs ?? []).map((d) => d.path);
  const { data: assinadas } = paths.length
    ? await supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrls(paths, 3600)
    : { data: [] };
  const urlPorPath = new Map((assinadas ?? []).map((a) => [a.path, a.signedUrl]));
  const docPorTipo = new Map((docs ?? []).map((d) => [d.tipo, d]));

  const st = STATUS_SOLICITACAO[s.status];
  const aberta = ["aguardando", "correcao"].includes(s.status);
  const expirado = aberta && jaPassou(s.expira_em);
  const link = `${site}/s/${s.token}`;
  const nome = cliente?.nome ?? s.nome_indicado;
  const empresa = config.data?.nome_empresa ?? "Prime Cred";
  const mensagem =
    s.status === "correcao"
      ? `Olá${nome ? ` ${nome.split(" ")[0]}` : ""}! Alguns itens da sua documentação precisam ser reenviados. Acesse o link abaixo, que mostra só o que falta:`
      : `Olá${nome ? ` ${nome.split(" ")[0]}` : ""}! Para dar continuidade à sua análise na ${empresa}, preencha seus dados e envie a documentação pelo link abaixo:`;
  const endereco = cliente
    ? [cliente.logradouro, cliente.numero, cliente.bairro, cliente.cidade, cliente.uf].filter(Boolean).join(", ")
    : "";
  const avaliados = (docs ?? []).filter((d) => d.status !== "pendente").length;

  return (
    <>
      <CabecalhoPagina
        voltar="/solicitacoes"
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {nome ?? "Nova solicitação"} <Selo cor={st.cor}>{st.rotulo}</Selo>
          </span>
        }
        descricao={`Criada em ${formatarDataHora(s.criado_em)}`}
        acoes={
          <>
            {cliente && (
              <Link href={`/clientes/${cliente.id}`} className="btn">
                Ficha do cliente
              </Link>
            )}
            {s.status === "aprovada" && cliente && (
              <Link href={`/emprestimos/novo?cliente=${cliente.id}`} className="btn btn-primario">
                Criar empréstimo
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          {aberta && (
            <Cartao titulo="Link do cliente">
              {expirado ? (
                <div className="space-y-3">
                  <p className="text-sm text-perigo">Este link expirou em {formatarDataHora(s.expira_em)}.</p>
                  <form action={renovarValidade.bind(null, id)}>
                    <button className="btn btn-primario">Reativar link</button>
                  </form>
                </div>
              ) : (
                <>
                  <CompartilharLink link={link} telefone={cliente?.telefone ?? s.telefone_indicado} mensagem={mensagem} />
                  <p className="mt-3 text-xs text-suave">Válido até {formatarDataHora(s.expira_em)}.</p>
                </>
              )}
            </Cartao>
          )}

          {(s.cidade || s.tipo_renda || s.origem) && (
            <Cartao titulo="Pedido pelo site">
              <LinhaInfo rotulo="Nome">{s.nome_indicado ?? "—"}</LinhaInfo>
              <LinhaInfo rotulo="WhatsApp">
                {s.telefone_indicado ? (
                  <a href={linkWhatsApp(s.telefone_indicado)} target="_blank" rel="noopener noreferrer" className="text-marca">
                    {formatarTelefone(s.telefone_indicado)}
                  </a>
                ) : (
                  "—"
                )}
              </LinhaInfo>
              <LinhaInfo rotulo="Valor desejado">{formatarMoeda(s.valor_desejado_centavos)}</LinhaInfo>
              <LinhaInfo rotulo="Como quer pagar">
                {FORMAS_PAGAMENTO_PEDIDO.find((f) => f.valor === s.forma_pagamento)?.rotulo ?? "—"}
              </LinhaInfo>
              <LinhaInfo rotulo="Cidade">{s.cidade ? `${s.cidade} - ${UF_ATENDIDA}` : "—"}</LinhaInfo>
              <LinhaInfo rotulo="Renda mensal">{formatarMoeda(s.renda_centavos)}</LinhaInfo>
              <LinhaInfo rotulo="Tipo de renda">{s.tipo_renda ? TIPO_RENDA_POR_VALOR[s.tipo_renda].rotulo : "—"}</LinhaInfo>
              <LinhaInfo rotulo="Instagram">
                {s.instagram ? (
                  <a
                    href={`https://instagram.com/${encodeURIComponent(s.instagram)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-marca"
                  >
                    @{s.instagram}
                  </a>
                ) : (
                  "—"
                )}
              </LinhaInfo>
              <LinhaInfo rotulo="Como conheceu">
                {s.origem ? ORIGEM_POR_VALOR[s.origem].rotulo : "—"}
                {s.origem_detalhe && <span className="block text-xs font-normal text-suave">{s.origem_detalhe}</span>}
              </LinhaInfo>
            </Cartao>
          )}

          {(s.utm_source || s.utm_campaign || s.utm_content) && (
            <Cartao titulo="Anúncio de origem">
              <LinhaInfo rotulo="Fonte">{s.utm_source ?? "—"}</LinhaInfo>
              {(
                [
                  ["Campanha", s.utm_campaign],
                  ["Conjunto", s.utm_medium],
                  ["Anúncio", s.utm_content],
                ] as const
              ).map(([rotulo, valor]) => {
                const v = separarNomeId(valor);
                return (
                  <LinhaInfo key={rotulo} rotulo={rotulo}>
                    {v ? v.nome : "—"}
                    {v?.id && <span className="block text-xs font-normal text-suave">ID {v.id}</span>}
                  </LinhaInfo>
                );
              })}
              <LinhaInfo rotulo="Posicionamento">{s.utm_term ?? "—"}</LinhaInfo>
            </Cartao>
          )}

          <Cartao titulo="Dados informados">
            {cliente ? (
              <>
                <LinhaInfo rotulo="Nome">{cliente.nome}</LinhaInfo>
                <LinhaInfo rotulo="CPF">{formatarCpf(cliente.cpf)}</LinhaInfo>
                <LinhaInfo rotulo="Telefone">{formatarTelefone(cliente.telefone)}</LinhaInfo>
                <LinhaInfo rotulo="Endereço">{endereco || "—"}</LinhaInfo>
                <LinhaInfo rotulo="Renda">{formatarMoeda(cliente.renda_centavos)}</LinhaInfo>
                <LinhaInfo rotulo="Valor desejado">
                  {s.valor_desejado_centavos != null ? formatarMoeda(s.valor_desejado_centavos) : "—"}
                </LinhaInfo>
                {refs?.map((r) => (
                  <LinhaInfo key={r.id} rotulo={`Ref.: ${r.relacao ?? "contato"}`}>
                    {r.nome} · {formatarTelefone(r.telefone)}
                  </LinhaInfo>
                ))}
              </>
            ) : (
              <p className="text-sm text-suave">O cliente ainda não preencheu os dados.</p>
            )}
          </Cartao>

          {s.status === "em_analise" && (
            <Cartao titulo="Concluir análise">
              <p className="mb-3 text-sm text-suave">
                {avaliados} de {docs?.length ?? 0} itens avaliados. Se algum for recusado, o cliente poderá reenviar só
                ele pelo mesmo link.
              </p>
              <Formulario acao={concluirAnalise.bind(null, id)}>
                <BotaoEnviar className="btn btn-primario w-full" pendente="Concluindo…">
                  Concluir análise
                </BotaoEnviar>
              </Formulario>
            </Cartao>
          )}

          {!["recusada", "cancelada"].includes(s.status) && (
            <details className="cartao">
              <summary className="cursor-pointer text-sm font-medium text-suave">Recusar ou cancelar solicitação</summary>
              <Formulario acao={alterarStatusSolicitacao.bind(null, id, "recusada")} className="mt-3 space-y-2">
                <input name="observacao" className="campo" placeholder="Motivo (anotação interna)" />
                <div className="flex gap-2">
                  <BotaoEnviar className="btn btn-perigo flex-1">Recusar crédito</BotaoEnviar>
                </div>
              </Formulario>
              <Formulario acao={alterarStatusSolicitacao.bind(null, id, "cancelada")} className="mt-2">
                <BotaoEnviar className="btn w-full">Cancelar link</BotaoEnviar>
              </Formulario>
            </details>
          )}
          {s.observacao_admin && (
            <p className="rounded-lg bg-fundo p-3 text-sm">
              <span className="font-medium">Anotação:</span> {s.observacao_admin}
            </p>
          )}
        </div>

        <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-2">
          {DOCUMENTOS.map((def) => {
            const doc = docPorTipo.get(def.tipo);
            const sd = doc ? STATUS_DOCUMENTO[doc.status] : null;
            return (
              <section key={def.tipo} className="cartao space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{def.titulo}</h3>
                  {sd ? <Selo cor={sd.cor}>{sd.rotulo}</Selo> : <Selo cor="cinza">Não enviado</Selo>}
                </div>
                {doc && (
                  <>
                    <Previa doc={doc} url={urlPorPath.get(doc.path) ?? null} />
                    <p className="text-xs text-suave">Enviado {formatarDataHora(doc.criado_em)}</p>
                    {doc.latitude != null && doc.longitude != null && (
                      <div className="space-y-2">
                        <Mapa lat={doc.latitude} lng={doc.longitude} />
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          <a
                            className="inline-flex items-center gap-1 text-marca"
                            href={`https://www.google.com/maps?q=${doc.latitude},${doc.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MapPin className="size-3" /> Local da captura
                          </a>
                          {endereco && (
                            <a
                              className="text-marca"
                              href={`https://www.google.com/maps/search/${encodeURIComponent(endereco)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Endereço informado
                            </a>
                          )}
                          <span className="text-suave">
                            precisão ~{Math.round(doc.precisao_m ?? 0)} m · {formatarDataHora(doc.capturado_em)}
                          </span>
                        </div>
                      </div>
                    )}
                    {def.gps && doc.latitude == null && (
                      <p className="text-xs text-alerta">Sem localização registrada.</p>
                    )}
                    {doc.status === "recusado" && doc.motivo_recusa && (
                      <p className="text-xs text-perigo">Motivo: {doc.motivo_recusa}</p>
                    )}
                    {s.status === "em_analise" && (
                      <AvaliarDocumento
                        status={doc.status}
                        aprovar={avaliarDocumento.bind(null, doc.id, id, "aprovado")}
                        recusar={avaliarDocumento.bind(null, doc.id, id, "recusado")}
                      />
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
