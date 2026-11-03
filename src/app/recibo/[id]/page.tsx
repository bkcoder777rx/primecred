import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcoesRecibo } from "@/components/acoes-recibo";
import { LinhaInfo } from "@/components/ui";
import { carregarConfiguracoes, principalAposPagamento, textoRecibo } from "@/lib/consultas";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarCpf, formatarMoeda } from "@/lib/formato";
import { FORMA_PAGAMENTO, TIPO_PAGAMENTO } from "@/lib/rotulos";
import { exigirAdmin } from "@/lib/supabase/server";
import type { Pagamento } from "@/lib/tipos";

export const metadata: Metadata = { title: "Recibo" };

type PagamentoCompleto = Pagamento & {
  emprestimos: { id: string; numero: number; clientes: { nome: string; cpf: string | null; telefone: string | null } };
};

export default async function PaginaRecibo({ params }: PageProps<"/recibo/[id]">) {
  const { id } = await params;
  const supabase = await exigirAdmin();
  const [{ data: p }, config] = await Promise.all([
    supabase
      .from("pagamentos")
      .select("*, emprestimos(id, numero, clientes(nome, cpf, telefone))")
      .eq("id", id)
      .maybeSingle<PagamentoCompleto>(),
    carregarConfiguracoes(supabase),
  ]);
  if (!p) notFound();
  const cliente = p.emprestimos.clientes;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <Link href={`/emprestimos/${p.emprestimos.id}`} className="nao-imprimir mb-4 inline-block text-sm text-suave">
        ← Voltar ao empréstimo
      </Link>
      <article className="cartao space-y-4">
        <header className="flex items-start justify-between border-b border-borda pb-4">
          <div>
            <p className="text-lg font-semibold">{config.nome_empresa}</p>
            <p className="text-xs text-suave">Recibo de pagamento</p>
          </div>
          <p className="text-right text-sm">
            <span className="block font-semibold">Nº {p.numero}</span>
            <span className="text-xs text-suave">{formatarData(p.data)}</span>
          </p>
        </header>

        {p.estornado && (
          <p className="rounded-lg bg-red-500/10 p-2 text-center text-sm font-semibold text-perigo">
            PAGAMENTO ESTORNADO em {formatarDataHora(p.estornado_em)}
          </p>
        )}

        <p className="text-sm leading-relaxed">
          Recebemos de <strong>{cliente.nome}</strong>
          {cliente.cpf && <>, CPF {formatarCpf(cliente.cpf)}</>}, a quantia de{" "}
          <strong>{formatarMoeda(p.valor_centavos)}</strong> referente ao empréstimo nº {p.emprestimos.numero}.
        </p>

        <div>
          {p.diarias_centavos > 0 && <LinhaInfo rotulo="Diárias de atraso">{formatarMoeda(p.diarias_centavos)}</LinhaInfo>}
          {p.juros_centavos > 0 && <LinhaInfo rotulo="Juros">{formatarMoeda(p.juros_centavos)}</LinhaInfo>}
          {p.principal_centavos > 0 && (
            <LinhaInfo rotulo="Abatimento do principal">{formatarMoeda(p.principal_centavos)}</LinhaInfo>
          )}
          <LinhaInfo rotulo="Total pago">{formatarMoeda(p.valor_centavos)}</LinhaInfo>
          <LinhaInfo rotulo="Forma">{FORMA_PAGAMENTO[p.forma]}</LinhaInfo>
          <LinhaInfo rotulo="Tipo">{TIPO_PAGAMENTO[p.tipo]}</LinhaInfo>
        </div>

        <div className="rounded-lg bg-fundo p-3 text-sm">
          {p.tipo === "quitacao" ? (
            <p className="text-center font-semibold text-marca">Empréstimo quitado.</p>
          ) : p.tipo === "parcial" ? (
            <p>Pagamento parcial. Vencimento em aberto: {formatarData(p.vencimento_anterior)}.</p>
          ) : (
            <>
              <p>Próximo vencimento: <strong>{formatarData(p.vencimento_novo)}</strong></p>
              <p>Saldo devedor (principal): <strong>{formatarMoeda(principalAposPagamento(p))}</strong></p>
            </>
          )}
        </div>

        <p className="pt-6 text-center text-xs text-suave">
          ____________________________________
          <br />
          {config.nome_empresa}
        </p>
      </article>
      <div className="mt-4">
        <AcoesRecibo telefone={cliente.telefone} texto={textoRecibo(config.nome_empresa, p, cliente.nome)} />
      </div>
    </main>
  );
}
