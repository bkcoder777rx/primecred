import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type NovaNotificacao = {
  /** Empresa dona do aviso: só os aparelhos dela recebem. */
  empresaId: string;
  /** Identificador único: evita avisar duas vezes sobre o mesmo evento. */
  chave: string;
  titulo: string;
  corpo?: string;
  link?: string;
};

/** Registra a notificação (se ainda não existir) e envia push para os aparelhos da empresa. */
export async function notificar(supabase: SupabaseClient, n: NovaNotificacao): Promise<void> {
  const { data, error } = await supabase
    .from("notificacoes")
    .upsert(
      { empresa_id: n.empresaId, chave: n.chave, titulo: n.titulo, corpo: n.corpo, link: n.link },
      { onConflict: "chave", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    console.error("Falha ao registrar notificação", error);
    return;
  }
  if (!data?.length) return; // já avisado antes
  await enviarPush(supabase, n);
}

export async function enviarPush(supabase: SupabaseClient, n: Omit<NovaNotificacao, "chave">): Promise<number> {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return 0;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contato@primecred.com.br", publica, privada);

  const { data: inscricoes } = await supabase
    .from("push_inscricoes")
    .select("id, endpoint, p256dh, auth")
    .eq("empresa_id", n.empresaId);
  const corpo = JSON.stringify({ titulo: n.titulo, corpo: n.corpo ?? "", link: n.link ?? "/painel" });
  let enviados = 0;
  await Promise.all(
    (inscricoes ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, corpo);
        enviados++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // Aparelho desinscrito ou expirado: remove para não tentar de novo.
        if (status === 404 || status === 410) await supabase.from("push_inscricoes").delete().eq("id", s.id);
        else console.error("Falha ao enviar push", e);
      }
    }),
  );
  return enviados;
}
