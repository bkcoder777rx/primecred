import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole, LogOut } from "lucide-react";
import { sair } from "@/app/login/actions";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Acesso suspenso" };

/** Mostrada quando a empresa do usuário está bloqueada pela BK Software (ex.: mensalidade atrasada). */
export default async function PaginaSuspenso() {
  const supabase = await criarClienteServidor();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) redirect("/login");

  const { data: empresaId } = await supabase.rpc("minha_empresa");
  const { data: empresa } = empresaId
    ? await supabase.from("empresas").select("nome, status, motivo_bloqueio").eq("id", empresaId).maybeSingle()
    : { data: null };
  if (empresa && ["teste", "ativa"].includes(empresa.status)) redirect("/painel");

  const whatsappBk = process.env.NEXT_PUBLIC_BK_WHATSAPP;
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="cartao w-full max-w-md text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl border border-marca/40 bg-marca-suave">
          <LockKeyhole className="size-8 text-marca" />
        </span>
        <h1 className="text-2xl font-extrabold">Acesso suspenso</h1>
        <p className="mt-2 text-sm text-suave">
          O acesso {empresa?.nome ? `da ${empresa.nome} ` : ""}ao sistema está temporariamente suspenso.
          {empresa?.motivo_bloqueio ? ` Motivo: ${empresa.motivo_bloqueio}.` : ""} Regularize com a BK Software para liberar
          o acesso. Seus dados estão guardados e nada foi perdido.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {whatsappBk && (
            <a
              href={`https://wa.me/${whatsappBk.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Preciso regularizar o acesso ao sistema.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primario"
            >
              Falar com a BK Software
            </a>
          )}
          <form action={sair}>
            <button className="btn w-full">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
