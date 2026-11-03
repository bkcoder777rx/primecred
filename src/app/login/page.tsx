import type { Metadata } from "next";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo } from "@/components/ui";
import { entrar } from "./actions";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaLogin() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- PNG estático com transparência */}
          <img src="/marca/emblema.png" alt="" className="h-20 w-auto drop-shadow-[0_6px_18px_rgba(232,187,82,0.4)]" />
          <h1 className="text-2xl font-extrabold">
            Prime<span className="text-[#e8bb52]">Cred</span>
          </h1>
          <p className="text-sm text-suave">Acesse o painel de controle</p>
        </div>
        <Formulario acao={entrar} className="cartao space-y-4">
          <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
          <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
          <BotaoEnviar className="btn btn-primario w-full" pendente="Entrando…">
            Entrar
          </BotaoEnviar>
        </Formulario>
      </div>
    </main>
  );
}
