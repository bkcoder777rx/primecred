import type { Metadata, Viewport } from "next";
import { EMPRESA_PADRAO } from "@/components/landing/pagina-empresa";
import { PaginaEnvioDocumentos } from "@/components/publico/pagina-envio-documentos";

export const metadata: Metadata = {
  title: { absolute: "Envio de Documentos" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#06120e" };

// Sempre consulta a empresa na hora (nome e situação podem mudar sem novo deploy).
export const dynamic = "force-dynamic";

/** /envio-documentos: link de envio da empresa padrão. */
export default function EnvioDocumentos() {
  return <PaginaEnvioDocumentos slug={EMPRESA_PADRAO} />;
}
