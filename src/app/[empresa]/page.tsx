import type { Metadata, Viewport } from "next";
import { buscarEmpresaPublica, PaginaEmpresa } from "@/components/landing/pagina-empresa";

export const viewport: Viewport = { themeColor: "#06120e" };

export async function generateMetadata({ params }: PageProps<"/[empresa]">): Promise<Metadata> {
  const { empresa: slug } = await params;
  const empresa = await buscarEmpresaPublica(slug);
  const nome = empresa?.nome ?? "Empréstimo";
  return {
    title: { absolute: `${nome} | Empréstimo no Pix` },
    description: "Empréstimo no Pix com análise rápida pelo celular. Pague em 30 dias ou renove pagando só os juros.",
    openGraph: { title: `${nome} | Empréstimo no Pix`, type: "website", locale: "pt_BR" },
  };
}

/** Página de divulgação de cada empresa: /primecred, /outra-financeira… */
export default async function PaginaDaEmpresa({ params }: PageProps<"/[empresa]">) {
  const { empresa } = await params;
  return <PaginaEmpresa slug={empresa} />;
}
