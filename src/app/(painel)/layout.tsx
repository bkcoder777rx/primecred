import { BarraSuperior, Navegacao } from "@/components/navegacao";
import { exigirAdmin } from "@/lib/supabase/server";

export default async function LayoutPainel({ children }: LayoutProps<"/">) {
  const supabase = await exigirAdmin();
  const [notif, solic] = await Promise.all([
    supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("lida", false),
    supabase.from("solicitacoes").select("id", { count: "exact", head: true }).eq("status", "em_analise"),
  ]);

  return (
    <div className="flex min-h-dvh">
      <Navegacao naoLidas={notif.count ?? 0} paraAnalisar={solic.count ?? 0} />
      <div className="min-w-0 flex-1">
        <BarraSuperior naoLidas={notif.count ?? 0} />
        <main className="mx-auto w-full max-w-[1400px] px-4 pt-5 pb-28 sm:px-8 lg:pt-7 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
