import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Selo, Vazio } from "@/components/ui";
import { linkCobranca, type EmprestimoSituacao } from "@/lib/consultas";
import { formatarData } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import type { Configuracoes } from "@/lib/tipos";

export function prazoTexto(e: EmprestimoSituacao) {
  const s = e.situacao;
  if (s.vencido) {
    return s.diasAtraso > 0 ? (
      <Selo cor="vermelho">{s.diasAtraso} dia{s.diasAtraso > 1 ? "s" : ""} de atraso</Selo>
    ) : (
      <Selo cor="vermelho">Vencido</Selo>
    );
  }
  if (s.venceHoje) return <Selo cor="amarelo">Vence hoje</Selo>;
  if (s.diasParaVencer === 1) return <Selo cor="amarelo">Vence amanhã</Selo>;
  return <Selo cor="cinza">Em {s.diasParaVencer} dias</Selo>;
}

export function ListaCobranca({
  itens,
  config,
  vazio = "Nada por aqui.",
}: {
  itens: EmprestimoSituacao[];
  config: Configuracoes;
  vazio?: string;
}) {
  if (itens.length === 0) return <Vazio>{vazio}</Vazio>;
  return (
    <ul className="divide-y divide-borda">
      {itens.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
          <Link href={`/emprestimos/${e.id}`} className="min-w-0 flex-1 basis-48">
            <p className="truncate font-medium">{e.clientes?.nome ?? "—"}</p>
            <p className="text-xs text-suave">
              #{e.numero} · venc. {formatarData(e.vencimento)} · principal {formatarMoeda(e.principal_centavos)}
            </p>
          </Link>
          <div className="flex items-center gap-3">
            {prazoTexto(e)}
            <div className="text-right">
              <p className="font-semibold tabular-nums">{formatarMoeda(e.situacao.soJurosCentavos)}</p>
              <p className="text-xs text-suave tabular-nums">quitar {formatarMoeda(e.situacao.quitarCentavos)}</p>
            </div>
            <a
              href={linkCobranca(config, e)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whats btn-pequeno"
              aria-label={`Cobrar ${e.clientes?.nome ?? ""} pelo WhatsApp`}
            >
              <MessageCircle className="size-4" aria-hidden />
              <span className="hidden sm:inline">Cobrar</span>
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
