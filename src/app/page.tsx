import type { Metadata, Viewport } from "next";
import { EMPRESA_PADRAO, PaginaEmpresa } from "@/components/landing/pagina-empresa";

const EMPRESA = process.env.NEXT_PUBLIC_NOME_EMPRESA || "Prime Cred";

export const metadata: Metadata = {
  title: { absolute: `${EMPRESA} | Empréstimo no Pix` },
  description: "Empréstimo no Pix com análise rápida pelo celular. Pague em 30 dias ou renove pagando só os juros.",
  openGraph: {
    title: `${EMPRESA} | Empréstimo no Pix`,
    description: "Análise rápida, tudo pelo celular. Negativado? Também analisamos.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = { themeColor: "#06120e" };

/** Endereço principal: página de divulgação da empresa padrão (onde os anúncios atuais apontam). */
export default function PaginaInicial() {
  return <PaginaEmpresa slug={EMPRESA_PADRAO} />;
}
