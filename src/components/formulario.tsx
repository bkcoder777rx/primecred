"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { Resultado } from "@/lib/acao";

type Acao = (anterior: Resultado, fd: FormData) => Promise<Resultado>;

/** Formulário ligado a uma Server Action, mostrando erro/sucesso retornado por ela. */
export function Formulario({
  acao,
  children,
  className = "",
  confirmar,
}: {
  acao: Acao;
  children: ReactNode;
  className?: string;
  /** Texto de confirmação antes de enviar (ações irreversíveis). */
  confirmar?: string;
}) {
  const [estado, executar] = useActionState(acao, null);
  return (
    <form
      action={executar}
      className={className}
      onSubmit={(ev) => {
        if (confirmar && !window.confirm(confirmar)) ev.preventDefault();
      }}
    >
      {children}
      {estado?.mensagem && (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            estado.ok ? "bg-marca-suave text-marca-forte" : "bg-red-500/10 text-red-300"
          }`}
        >
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}

export function BotaoEnviar({
  children,
  className = "btn btn-primario",
  pendente = "Salvando…",
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  pendente?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? pendente : children}
    </button>
  );
}
