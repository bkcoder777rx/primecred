"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Resultado } from "@/lib/acao";
import { ipDaRequisicao, LIMITE_IP, loginBloqueado, registrarAcesso } from "@/lib/acessos";
import { criarClienteServico } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function entrar(_: Resultado, fd: FormData): Promise<Resultado> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  const h = await headers();
  const ip = ipDaRequisicao(h);
  const userAgent = h.get("user-agent") ?? "";
  const servico = criarClienteServico();

  // Muitas senhas erradas seguidas → bloqueia por um tempo (protege contra robôs adivinhando senha).
  if (await loginBloqueado(servico, ip, email)) {
    await registrarAcesso(servico, { email, ip, userAgent, sucesso: false, motivo: "bloqueado" });
    return {
      ok: false,
      mensagem: `Muitas tentativas sem sucesso. Por segurança, aguarde ${LIMITE_IP.minutos} minutos e tente de novo.`,
    };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) {
    await registrarAcesso(servico, { email, ip, userAgent, sucesso: false, motivo: "senha_incorreta" });
    return { ok: false, mensagem: "E-mail ou senha incorretos." };
  }

  const { data: empresaId } = await supabase.rpc("minha_empresa");
  await registrarAcesso(servico, {
    email,
    ip,
    userAgent,
    sucesso: true,
    motivo: "ok",
    userId: data.user.id,
    empresaId: (empresaId as string | null) ?? null,
  });
  redirect("/painel");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
