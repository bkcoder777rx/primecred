"use server";

import { revalidatePath } from "next/cache";
import { mensagemDeErro, texto, type Resultado } from "@/lib/acao";
import { lerMoeda } from "@/lib/formato";
import { enviarPush } from "@/lib/notificar";
import { empresaAtual, exigirAdmin } from "@/lib/supabase/server";

export async function salvarConfiguracoes(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const taxa = Number(texto(fd, "taxa_padrao").replace(",", "."));
  const prazo = Number(texto(fd, "prazo_padrao"));
  const diaria = lerMoeda(texto(fd, "diaria_padrao"));
  const diasAviso = Number(texto(fd, "dias_aviso"));
  const validade = Number(texto(fd, "validade_link_dias"));
  if (!(taxa > 0) || !(prazo > 0) || diaria === null || !(diasAviso >= 0) || !(validade > 0)) {
    return { ok: false, mensagem: "Confira os valores preenchidos." };
  }
  const { error } = await supabase
    .from("configuracoes")
    .update({
      nome_empresa: texto(fd, "nome_empresa") || "Prime Cred",
      taxa_padrao: taxa,
      prazo_padrao: prazo,
      diaria_padrao_centavos: diaria,
      dias_aviso: diasAviso,
      validade_link_dias: validade,
      chave_pix: texto(fd, "chave_pix") || null,
      mensagem_cobranca: texto(fd, "mensagem_cobranca"),
      atualizado_em: new Date().toISOString(),
    })
    .eq("empresa_id", await empresaAtual(supabase));
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Configurações salvas." };
}

export async function salvarInscricaoPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, agente: string) {
  const supabase = await exigirAdmin();
  const { error } = await supabase.from("push_inscricoes").upsert(
    { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: agente.slice(0, 300) },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function removerInscricaoPush(endpoint: string) {
  const supabase = await exigirAdmin();
  await supabase.from("push_inscricoes").delete().eq("endpoint", endpoint);
}

export async function testarNotificacao(): Promise<number> {
  const supabase = await exigirAdmin();
  return enviarPush(supabase, {
    empresaId: await empresaAtual(supabase),
    titulo: "Prime Cred",
    corpo: "Notificações funcionando neste aparelho ✅",
    link: "/notificacoes",
  });
}
