"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { linkWhatsApp } from "@/lib/formato";

export function CompartilharLink({
  link,
  telefone,
  mensagem,
}: {
  link: string;
  telefone?: string | null;
  mensagem: string;
}) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-borda bg-fundo p-2">
        <code className="min-w-0 flex-1 truncate px-1 text-xs">{link}</code>
        <button
          type="button"
          className="btn btn-pequeno"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
        >
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <a
        href={linkWhatsApp(telefone, `${mensagem}\n\n${link}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-whats w-full sm:w-auto"
      >
        <MessageCircle className="size-4" /> Enviar pelo WhatsApp
      </a>
    </div>
  );
}
