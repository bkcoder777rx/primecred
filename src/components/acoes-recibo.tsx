"use client";

import { MessageCircle, Printer } from "lucide-react";
import { linkWhatsApp } from "@/lib/formato";

export function AcoesRecibo({ telefone, texto }: { telefone: string | null; texto: string }) {
  return (
    <div className="nao-imprimir flex flex-wrap justify-center gap-2">
      <button className="btn" onClick={() => window.print()}>
        <Printer className="size-4" /> Imprimir / salvar PDF
      </button>
      <a href={linkWhatsApp(telefone, texto)} target="_blank" rel="noopener noreferrer" className="btn btn-whats">
        <MessageCircle className="size-4" /> Enviar pelo WhatsApp
      </a>
    </div>
  );
}
