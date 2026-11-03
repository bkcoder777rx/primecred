"use client";

import { useActionState, useState } from "react";
import type { Resultado } from "@/lib/acao";
import type { StatusDocumento } from "@/lib/tipos";

type Acao = (anterior: Resultado, fd: FormData) => Promise<Resultado>;

export function AvaliarDocumento({
  status,
  aprovar,
  recusar,
}: {
  status: StatusDocumento;
  aprovar: Acao;
  recusar: Acao;
}) {
  const [recusando, setRecusando] = useState(false);
  const [estadoA, execAprovar, pendenteA] = useActionState(aprovar, null);
  const [estadoR, execRecusar, pendenteR] = useActionState(recusar, null);
  const erro = (!estadoA?.ok && estadoA?.mensagem) || (!estadoR?.ok && estadoR?.mensagem);

  if (recusando) {
    return (
      <form
        action={async (fd) => {
          await execRecusar(fd);
          setRecusando(false);
        }}
        className="space-y-2"
      >
        <input
          name="motivo"
          required
          autoFocus
          className="campo"
          placeholder="Motivo (o cliente vai ver). Ex.: foto ilegível"
        />
        <div className="flex gap-2">
          <button className="btn btn-perigo btn-pequeno flex-1" disabled={pendenteR}>
            Confirmar recusa
          </button>
          <button type="button" className="btn btn-pequeno" onClick={() => setRecusando(false)}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <form action={execAprovar} className="flex-1">
          <button
            className={`btn btn-pequeno w-full ${status === "aprovado" ? "btn-primario" : ""}`}
            disabled={pendenteA || status === "aprovado"}
          >
            {status === "aprovado" ? "Aprovado" : "Aprovar"}
          </button>
        </form>
        <button
          type="button"
          className={`btn btn-pequeno flex-1 ${status === "recusado" ? "btn-perigo" : ""}`}
          onClick={() => setRecusando(true)}
        >
          {status === "recusado" ? "Recusado" : "Recusar"}
        </button>
      </div>
      {erro && <p className="text-xs text-perigo">{erro}</p>}
    </div>
  );
}
