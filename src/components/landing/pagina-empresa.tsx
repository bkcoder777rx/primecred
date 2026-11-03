// Página de divulgação de uma empresa (anúncios): "/" mostra a empresa padrão e "/<slug>" cada empresa.
import { notFound } from "next/navigation";
import { Landing } from "@/components/landing/landing";
import { PixelMeta } from "@/components/pixel-meta";
import { FundoPremium } from "@/components/publico/visual";
import { carregarConfiguracoes } from "@/lib/consultas";
import { criarClienteServico } from "@/lib/supabase/admin";

/** Empresa mostrada no endereço principal (onde os anúncios atuais apontam). */
export const EMPRESA_PADRAO = process.env.NEXT_PUBLIC_EMPRESA_PADRAO || "primecred";

type EmpresaPublica = {
  id: string;
  nome: string;
  slug: string;
  status: string;
  whatsapp: string | null;
  cnpj: string | null;
};

export async function buscarEmpresaPublica(slug: string): Promise<EmpresaPublica | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const { data } = await criarClienteServico()
    .from("empresas")
    .select("id, nome, slug, status, whatsapp, cnpj")
    .eq("slug", slug)
    .maybeSingle<EmpresaPublica>();
  return data;
}

export async function PaginaEmpresa({ slug }: { slug: string }) {
  const empresa = await buscarEmpresaPublica(slug);
  if (!empresa || empresa.status === "cancelada") notFound();

  if (!["teste", "ativa"].includes(empresa.status)) {
    return (
      <main className="relative grid min-h-dvh place-items-center px-5 text-center text-white">
        <FundoPremium />
        <div>
          <h1 className="text-2xl font-extrabold">{empresa.nome}</h1>
          <p className="mt-2 text-white/70">Atendimento indisponível no momento.</p>
        </div>
      </main>
    );
  }

  const config = await carregarConfiguracoes(criarClienteServico(), empresa.id);
  const padrao = empresa.slug === EMPRESA_PADRAO;
  return (
    <>
      {/* O Pixel configurado no servidor pertence à empresa padrão. */}
      {padrao && <PixelMeta />}
      <Landing
        empresaSlug={empresa.slug}
        empresa={config.nome_empresa || empresa.nome}
        whatsapp={empresa.whatsapp || (padrao ? (process.env.NEXT_PUBLIC_WHATSAPP_CONTATO ?? "") : "")}
        cnpj={empresa.cnpj || (padrao ? (process.env.NEXT_PUBLIC_CNPJ ?? "") : "")}
        taxa={config.taxa_padrao}
        prazo={config.prazo_padrao}
      />
    </>
  );
}
