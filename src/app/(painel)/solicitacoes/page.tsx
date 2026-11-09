import type { Metadata } from "next";
import Link from "next/link";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { CabecalhoPagina, Campo, Selo, Vazio } from "@/components/ui";
import { formatarDataHora, jaPassou } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { STATUS_SOLICITACAO } from "@/lib/rotulos";
import { exigirAdmin } from "@/lib/supabase/server";
import type { Solicitacao, StatusSolicitacao } from "@/lib/tipos";
import { gerarLink } from "./actions";
import { CompartilharLink } from "@/components/compartilhar-link";
import { EMPRESA_PADRAO } from "@/components/landing/pagina-empresa";
import { urlDoSite } from "@/lib/url";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Solicitações" };

const FILTROS: { valor: string; rotulo: string; status?: StatusSolicitacao[] }[] = [
  { valor: "", rotulo: "Em andamento", status: ["aguardando", "em_analise", "correcao"] },
  { valor: "analisar", rotulo: "Para analisar", status: ["em_analise"] },
  { valor: "aprovadas", rotulo: "Aprovadas", status: ["aprovada"] },
  { valor: "encerradas", rotulo: "Recusadas/canceladas", status: ["recusada", "cancelada"] },
];

export default async function PaginaSolicitacoes({ searchParams }: PageProps<"/solicitacoes">) {
  const sp = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === String(sp.filtro ?? "")) ?? FILTROS[0];
  const supabase = await exigirAdmin();
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("*, clientes(nome)")
    .in("status", filtro.status!)
    .order("criado_em", { ascending: false })
    .limit(200)
    .returns<(Solicitacao & { clientes: { nome: string } | null })[]>();
  if (error) throw error;

  // Link fixo "Envio de Documentos" (à parte do site): só para quem quer fechar.
  const [site, { data: empresa }, { data: config }] = await Promise.all([
    urlDoSite(),
    supabase.from("empresas").select("slug").limit(1).maybeSingle(),
    supabase.from("configuracoes").select("nome_empresa").limit(1).maybeSingle(),
  ]);
  const linkEnvio =
    !empresa || empresa.slug === EMPRESA_PADRAO ? `${site}/envio-documentos` : `${site}/envio-documentos/${empresa.slug}`;
  const mensagemEnvio = `Olá! Para fecharmos o seu empréstimo na ${config?.nome_empresa ?? "Prime Cred"}, envie seus documentos pelo link abaixo:`;

  return (
    <>
      <CabecalhoPagina
        rotulo="Documentação dos clientes"
        icone={FileText}
        titulo="Solicitações"
        descricao="Links de cadastro enviados aos clientes e documentação para conferir."
      />

      <section className="cartao mb-5">
        <h2 className="font-semibold">Link de Envio de Documentos</h2>
        <p className="mt-1 mb-3 text-sm text-suave">
          Link fixo, à parte do site. Mande só para quem quer fechar: o cliente informa nome e WhatsApp, preenche os dados
          e envia os documentos. Cada envio aparece aqui na lista.
        </p>
        <CompartilharLink link={linkEnvio} mensagem={mensagemEnvio} />
      </section>

      <details className="cartao mb-5" open={sp.novo === "1"}>
        <summary className="cursor-pointer font-semibold">+ Gerar link de cadastro</summary>
        <Formulario acao={gerarLink} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Campo rotulo="Nome do cliente (opcional)" name="nome" />
          <Campo rotulo="WhatsApp (opcional)" name="telefone" inputMode="tel" />
          <BotaoEnviar pendente="Gerando…">Gerar link</BotaoEnviar>
        </Formulario>
      </details>

      <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor ? `/solicitacoes?filtro=${f.valor}` : "/solicitacoes"}
            className={`pilula ${
              filtro.valor === f.valor ? "pilula-ativa" : ""
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      <div className="cartao p-0 sm:p-0">
        {data.length === 0 ? (
          <Vazio>Nenhuma solicitação aqui.</Vazio>
        ) : (
          <ul className="divide-y divide-borda">
            {data.map((s) => {
              const st = STATUS_SOLICITACAO[s.status];
              const expirado =
                ["aguardando", "correcao"].includes(s.status) && jaPassou(s.expira_em);
              return (
                <li key={s.id}>
                  <Link href={`/solicitacoes/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fundo">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {s.clientes?.nome ?? s.nome_indicado ?? "Cliente ainda não preencheu"}
                      </span>
                      <span className="block text-xs text-suave">
                        criado {formatarDataHora(s.criado_em)}
                        {s.valor_desejado_centavos != null && ` · pediu ${formatarMoeda(s.valor_desejado_centavos)}`}
                      </span>
                    </span>
                    {expirado ? <Selo cor="cinza">Link expirado</Selo> : <Selo cor={st.cor}>{st.rotulo}</Selo>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
