"use server";

import { redirect } from "next/navigation";
import type { Resultado } from "@/lib/acao";
import { criarClienteServico } from "@/lib/supabase/admin";
import { meuAcesso } from "@/lib/supabase/server";

export async function trocarSenha(_: Resultado, fd: FormData): Promise<Resultado> {
  const { supabase, acesso } = await meuAcesso();
  const nova = String(fd.get("senha") ?? "");
  const confirmacao = String(fd.get("confirmacao") ?? "");
  if (nova.length < 8) return { ok: false, mensagem: "A senha precisa ter pelo menos 8 caracteres." };
  if (!/[a-zA-Z]/.test(nova) || !/\d/.test(nova)) return { ok: false, mensagem: "Use letras e números na senha." };
  if (nova !== confirmacao) return { ok: false, mensagem: "As duas senhas não são iguais." };

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    return {
      ok: false,
      mensagem: /different|same/i.test(error.message)
        ? "A nova senha precisa ser diferente da senha temporária."
        : "Não foi possível trocar a senha. Tente novamente.",
    };
  }

  // A marca "trocar senha" não pode ser alterada pelo próprio usuário via banco: o servidor limpa.
  const servico = criarClienteServico();
  await servico.from("membros").update({ trocar_senha: false }).eq("user_id", acesso.user_id);
  redirect("/painel");
}
