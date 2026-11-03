import type { Metadata, Viewport } from "next";
import { CheckCircle2 } from "lucide-react";
import { PixelMeta } from "@/components/pixel-meta";
import { CARTAO, FundoPremium, Marca } from "@/components/publico/visual";

// Página final do envio. Fica num endereço sem o código do link do cliente, para que o
// Pixel da Meta registre a conversão sem receber o link de acesso aos documentos.
export const metadata: Metadata = {
  title: "Documentação enviada",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#06120e" };

export default function PaginaObrigado() {
  return (
    <main className="relative grid min-h-dvh place-items-center px-5 text-white">
      <PixelMeta evento="CompleteRegistration" />
      <FundoPremium />
      <div className={`${CARTAO} w-full max-w-md p-6 text-center`}>
        <div className="mb-6 flex justify-center">
          <Marca />
        </div>
        <CheckCircle2 className="mx-auto mb-3 size-14 text-[#e8bb52]" />
        <h1 className="text-2xl font-extrabold">Documentação enviada!</h1>
        <p className="mt-2 text-sm text-white/70">
          Recebemos tudo. Nossa equipe vai conferir e falar com você pelo WhatsApp. Você já pode fechar esta página.
        </p>
      </div>
    </main>
  );
}
