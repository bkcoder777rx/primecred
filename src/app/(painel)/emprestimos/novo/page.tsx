import type { Metadata } from "next";
import { FormEmprestimo } from "@/components/form-emprestimo";
import { CabecalhoPagina } from "@/components/ui";
import { carregarConfiguracoes } from "@/lib/consultas";
import { hojeBrasilia } from "@/lib/datas";
import { exigirAdmin } from "@/lib/supabase/server";
import { criarEmprestimo } from "../actions";

export const metadata: Metadata = { title: "Novo empréstimo" };

export default async function PaginaNovoEmprestimo({ searchParams }: PageProps<"/emprestimos/novo">) {
  const sp = await searchParams;
  const supabase = await exigirAdmin();
  const [config, { data: clientes }] = await Promise.all([
    carregarConfiguracoes(supabase),
    supabase.from("clientes").select("id, nome, cpf").eq("bloqueado", false).order("nome"),
  ]);

  return (
    <>
      <CabecalhoPagina titulo="Novo empréstimo" voltar="/emprestimos" />
      <FormEmprestimo
        acao={criarEmprestimo}
        clientes={clientes ?? []}
        clienteInicial={typeof sp.cliente === "string" ? sp.cliente : undefined}
        padrao={{ taxa: config.taxa_padrao, prazo: config.prazo_padrao, diariaCentavos: Number(config.diaria_padrao_centavos) }}
        hoje={hojeBrasilia()}
      />
    </>
  );
}
