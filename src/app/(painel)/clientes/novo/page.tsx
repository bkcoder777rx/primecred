import type { Metadata } from "next";
import { FormCliente } from "@/components/form-cliente";
import { CabecalhoPagina } from "@/components/ui";
import { salvarCliente } from "../actions";

export const metadata: Metadata = { title: "Novo cliente" };

export default function PaginaNovoCliente() {
  return (
    <>
      <CabecalhoPagina
        titulo="Novo cliente"
        descricao="Cadastro manual. Para o cliente enviar os documentos, gere um link em Solicitações."
        voltar="/clientes"
      />
      <FormCliente acao={salvarCliente.bind(null, null)} />
    </>
  );
}
