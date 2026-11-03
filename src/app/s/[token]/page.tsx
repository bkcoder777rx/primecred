import type { Metadata, Viewport } from "next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { FluxoCadastro, type SituacaoItem } from "@/components/cliente/fluxo-cadastro";
import { jaPassou } from "@/lib/datas";
import { FundoPremium, Marca } from "@/components/publico/visual";
import { DOCUMENTOS } from "@/lib/documentos";
import { criarClienteServico } from "@/lib/supabase/admin";
import type { Documento, Solicitacao } from "@/lib/tipos";

export const metadata: Metadata = {
  title: "Envio de documentação",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#06120e" };

function Aviso({ icone, titulo, texto }: { icone: React.ReactNode; titulo: string; texto: string }) {
  return (
    <main className="relative grid min-h-dvh place-items-center px-5 text-white">
      <FundoPremium />
      <div className="w-full max-w-md rounded-2xl border border-[#1f5a3c]/80 bg-[#0a2618]/70 p-6 text-center backdrop-blur-sm">
        <div className="mb-6 flex justify-center">
          <Marca />
        </div>
        <div className="mb-3 flex justify-center">{icone}</div>
        <h1 className="text-2xl font-extrabold">{titulo}</h1>
        <p className="mt-2 text-sm text-white/70">{texto}</p>
      </div>
    </main>
  );
}

export default async function PaginaEnvio({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const supabase = criarClienteServico();
  const { data: s } = await supabase.from("solicitacoes").select("*").eq("token", token).maybeSingle<Solicitacao>();
  const [{ data: config }, { data: dadosEmpresa }] = s
    ? await Promise.all([
        supabase.from("configuracoes").select("nome_empresa").eq("empresa_id", s.empresa_id).maybeSingle(),
        supabase.from("empresas").select("status").eq("id", s.empresa_id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const empresa = config?.nome_empresa ?? "Prime Cred";

  if (s && !["teste", "ativa"].includes(dadosEmpresa?.status ?? "")) {
    return (
      <Aviso
        icone={<Clock className="size-12 text-[#d9b45a]" />}
        titulo="Atendimento indisponível"
        texto="No momento não é possível enviar documentos por este link. Fale com o atendente."
      />
    );
  }

  if (!s || s.status === "cancelada") {
    return (
      <Aviso
        icone={<XCircle className="size-12 text-red-400" />}
        titulo="Link inválido"
        texto="Este link não existe ou foi cancelado. Peça um novo link ao atendente."
      />
    );
  }
  if (s.status === "em_analise") {
    return (
      <Aviso
        icone={<Clock className="size-12 text-[#d9b45a]" />}
        titulo="Documentação em análise"
        texto="Recebemos seus documentos. Nossa equipe está conferindo e vai falar com você pelo WhatsApp."
      />
    );
  }
  if (s.status === "aprovada") {
    return (
      <Aviso
        icone={<CheckCircle2 className="size-12 text-[#d9b45a]" />}
        titulo="Documentação aprovada"
        texto="Tudo certo com seus documentos. Aguarde o contato da nossa equipe."
      />
    );
  }
  if (s.status === "recusada") {
    return (
      <Aviso
        icone={<XCircle className="size-12 text-white/50" />}
        titulo="Solicitação encerrada"
        texto="Esta solicitação foi encerrada. Em caso de dúvida, fale com o atendente."
      />
    );
  }
  if (jaPassou(s.expira_em)) {
    return (
      <Aviso
        icone={<Clock className="size-12 text-[#d9b45a]" />}
        titulo="Link expirado"
        texto="O prazo deste link terminou. Peça ao atendente para reativá-lo."
      />
    );
  }

  const { data: docs } = await supabase
    .from("documentos")
    .select("tipo, status, motivo_recusa")
    .eq("solicitacao_id", s.id)
    .eq("ativo", true)
    .returns<Pick<Documento, "tipo" | "status" | "motivo_recusa">[]>();
  const porTipo = new Map((docs ?? []).map((d) => [d.tipo, d]));
  const correcao = s.status === "correcao";

  const itens: SituacaoItem[] = DOCUMENTOS.map((def): SituacaoItem => {
    const d = porTipo.get(def.tipo);
    if (!d) return { tipo: def.tipo, estado: "faltando" };
    if (d.status === "recusado") return { tipo: def.tipo, estado: "recusado", motivo: d.motivo_recusa };
    return { tipo: def.tipo, estado: "enviado" };
  }).filter((i) => !correcao || i.estado !== "enviado");

  return (
    <>
      <FluxoCadastro
      token={token}
      empresa={empresa}
      etapaInicial={s.dados_enviados_em ? "documentos" : "dados"}
      correcao={correcao}
      itensIniciais={itens}
      pedido={{
        nome: s.nome_indicado,
        telefone: s.telefone_indicado,
        valorCentavos: s.valor_desejado_centavos,
        rendaCentavos: s.renda_centavos,
        cidade: s.cidade,
        tipoRenda: s.tipo_renda,
      }}
    />
    </>
  );
}
