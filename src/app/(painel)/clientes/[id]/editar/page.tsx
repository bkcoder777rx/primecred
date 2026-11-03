import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormCliente } from "@/components/form-cliente";
import { Formulario, BotaoEnviar } from "@/components/formulario";
import { CabecalhoPagina } from "@/components/ui";
import { exigirAdmin } from "@/lib/supabase/server";
import type { Cliente, Referencia } from "@/lib/tipos";
import { excluirCliente, salvarCliente } from "../../actions";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function PaginaEditarCliente({ params }: PageProps<"/clientes/[id]/editar">) {
  const { id } = await params;
  const supabase = await exigirAdmin();
  const [{ data: cliente }, { data: referencias }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).maybeSingle<Cliente>(),
    supabase.from("referencias").select("*").eq("cliente_id", id).order("criado_em").returns<Referencia[]>(),
  ]);
  if (!cliente) notFound();

  return (
    <>
      <CabecalhoPagina titulo="Editar cliente" descricao={cliente.nome} voltar={`/clientes/${id}`} />
      <FormCliente acao={salvarCliente.bind(null, id)} cliente={cliente} referencias={referencias ?? []} />
      <Formulario
        acao={excluirCliente.bind(null, id)}
        confirmar="Excluir este cliente definitivamente?"
        className="mt-8 border-t border-borda pt-5"
      >
        <BotaoEnviar className="btn btn-perigo" pendente="Excluindo…">
          Excluir cliente
        </BotaoEnviar>
      </Formulario>
    </>
  );
}
