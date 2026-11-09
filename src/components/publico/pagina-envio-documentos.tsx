import { notFound } from "next/navigation";
import { Clock, FileCheck2, ShieldCheck } from "lucide-react";
import { buscarEmpresaPublica } from "@/components/landing/pagina-empresa";
import { DOCUMENTOS } from "@/lib/documentos";
import { CARTAO, FundoPremium, Marca, Rodape, TituloDestaque } from "./visual";
import { FormEnvioDocumentos } from "./form-envio-documentos";

/** Página "Envio de Documentos": link à parte do site, enviado só para quem quer fechar. */
export async function PaginaEnvioDocumentos({ slug }: { slug: string }) {
  const empresa = await buscarEmpresaPublica(slug);
  if (!empresa || empresa.status === "cancelada") notFound();
  const disponivel = ["teste", "ativa"].includes(empresa.status);

  return (
    <main className="relative min-h-dvh text-white">
      <FundoPremium />
      <div className="mx-auto w-full max-w-md space-y-6 px-5 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="flex justify-center">
          <Marca />
        </div>

        <TituloDestaque
          inicio="Envio de"
          destaque="Documentos"
          subtitulo={`Falta pouco para fechar com a ${empresa.nome}. Informe seu nome e WhatsApp para começar.`}
        />

        {disponivel ? (
          <FormEnvioDocumentos empresaSlug={empresa.slug} />
        ) : (
          <div className={`${CARTAO} flex items-start gap-3 p-4 text-sm text-white/80`}>
            <Clock className="size-5 shrink-0 text-[#d9b45a]" />
            No momento não é possível enviar documentos por aqui. Fale com o atendente.
          </div>
        )}

        <section className={`${CARTAO} p-4`}>
          <h2 className="flex items-center gap-2 font-bold">
            <FileCheck2 className="size-5 text-[#e8bb52]" /> Tenha em mãos
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-white/80">
            {DOCUMENTOS.map((d) => (
              <li key={d.tipo} className="flex gap-2">
                <span className="text-[#e8bb52]">•</span> {d.titulo}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/55">
            Antes dos documentos, você confirma seus dados (CPF, endereço e duas referências). As fotos da residência
            pedem a localização do celular.
          </p>
        </section>

        <Rodape icone={ShieldCheck}>Seus dados e documentos ficam protegidos e só a nossa equipe tem acesso.</Rodape>
      </div>
    </main>
  );
}
