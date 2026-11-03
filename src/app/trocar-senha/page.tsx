import type { Metadata } from "next";
import { KeyRound, LogOut } from "lucide-react";
import { sair } from "@/app/login/actions";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo } from "@/components/ui";
import { meuAcesso } from "@/lib/supabase/server";
import { trocarSenha } from "./actions";

export const metadata: Metadata = { title: "Criar sua senha" };

/** Primeiro acesso com senha temporária (ou troca voluntária de senha). */
export default async function PaginaTrocarSenha() {
  const { acesso } = await meuAcesso();
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid size-16 place-items-center rounded-2xl border border-marca/40 bg-marca-suave">
            <KeyRound className="size-8 text-marca" />
          </span>
          <h1 className="text-2xl font-extrabold">{acesso.trocar_senha ? "Crie sua senha" : "Trocar senha"}</h1>
          <p className="text-sm text-suave">
            {acesso.trocar_senha
              ? "Você entrou com uma senha temporária. Escolha uma senha só sua para continuar."
              : `Conta: ${acesso.email}`}
          </p>
        </div>
        <Formulario acao={trocarSenha} className="cartao space-y-4">
          <Campo rotulo="Nova senha" name="senha" type="password" autoComplete="new-password" minLength={8} required />
          <Campo
            rotulo="Repita a nova senha"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            ajuda="Mínimo de 8 caracteres, com letras e números."
          />
          <BotaoEnviar className="btn btn-primario w-full" pendente="Salvando…">
            Salvar senha e entrar
          </BotaoEnviar>
        </Formulario>
        <form action={sair} className="mt-4 text-center">
          <button className="inline-flex items-center gap-1.5 text-sm text-suave hover:text-texto">
            <LogOut className="size-4" /> Sair
          </button>
        </form>
      </div>
    </main>
  );
}
