import type { Metadata, Viewport } from "next";
import { PaginaEnvioDocumentos } from "@/components/publico/pagina-envio-documentos";

export const metadata: Metadata = {
  title: { absolute: "Envio de Documentos" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#06120e" };

/** /envio-documentos/<empresa>: link de envio de cada empresa. */
export default async function EnvioDocumentosDaEmpresa({ params }: PageProps<"/envio-documentos/[empresa]">) {
  const { empresa } = await params;
  return <PaginaEnvioDocumentos slug={empresa} />;
}
