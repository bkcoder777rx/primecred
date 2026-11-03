"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/supabase/server";

export async function marcarTodasLidas() {
  const supabase = await exigirAdmin();
  await supabase.from("notificacoes").update({ lida: true }).eq("lida", false);
  revalidatePath("/", "layout");
}

/** Marca como lida e abre o destino da notificação. */
export async function abrirNotificacao(id: string) {
  const supabase = await exigirAdmin();
  const { data } = await supabase.from("notificacoes").update({ lida: true }).eq("id", id).select("link").maybeSingle();
  revalidatePath("/", "layout");
  const link = data?.link ?? "";
  // Só caminhos internos ("/algo"), nunca "//site-externo" ou "https://…".
  const interno = link.startsWith("/") && !link.startsWith("//") && !link.includes("\\") && !link.includes(":");
  redirect(interno ? link : "/notificacoes");
}
