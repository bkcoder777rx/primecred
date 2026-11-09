"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2, User } from "lucide-react";
import { iniciarEnvioDocumentos, type EntradaEnvioDocumentos } from "@/app/acoes-publicas";
import { mascaraTelefone } from "@/components/form-cliente";
import { somenteDigitos } from "@/lib/formato";
import { BotaoDourado, CARTAO_OURO, CirculoIcone, IconeWhatsApp } from "./visual";

const entrada = "w-full min-w-0 bg-transparent text-[17px] text-white outline-none placeholder:text-white/40";

export function FormEnvioDocumentos({ empresaSlug }: { empresaSlug: string }) {
  const router = useRouter();
  const [d, setD] = useState<EntradaEnvioDocumentos>({ nome: "", telefone: "", site: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ok = d.nome.trim().length >= 3 && [10, 11].includes(somenteDigitos(d.telefone).length);

  async function continuar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!ok || enviando) return;
    setErro(null);
    setEnviando(true);
    const r = await iniciarEnvioDocumentos(empresaSlug, d);
    if (!r.ok) {
      setEnviando(false);
      setErro(r.mensagem);
      return;
    }
    router.push(`/s/${r.token}`);
  }

  return (
    <form onSubmit={continuar} className="relative space-y-3">
      <Campo rotulo="Nome completo" icone={<User className="size-6" strokeWidth={1.8} />}>
        <input
          className={entrada}
          placeholder="Digite seu nome completo"
          autoComplete="name"
          value={d.nome}
          onChange={(e) => setD({ ...d, nome: e.target.value })}
          required
        />
      </Campo>
      <Campo rotulo="WhatsApp" icone={<IconeWhatsApp className="size-6" />}>
        <input
          className={entrada}
          placeholder="(71) 99999-9999"
          inputMode="tel"
          autoComplete="tel"
          value={d.telefone}
          onChange={(e) => setD({ ...d, telefone: mascaraTelefone(e.target.value) })}
          required
        />
      </Campo>

      {/* Campo-armadilha para robôs: invisível para pessoas. */}
      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        value={d.site}
        onChange={(e) => setD({ ...d, site: e.target.value })}
      />

      {erro && (
        <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {erro}
        </p>
      )}

      <div className="pt-2">
        <BotaoDourado tipo="submit" disabled={!ok || enviando}>
          {enviando ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Abrindo…
            </>
          ) : (
            <>
              Começar envio <ArrowRight className="size-5" />
            </>
          )}
        </BotaoDourado>
      </div>
    </form>
  );
}

function Campo({ rotulo, icone, children }: { rotulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className={`${CARTAO_OURO} flex items-center gap-3 px-3 py-3 focus-within:shadow-[0_0_28px_-6px_rgba(227,181,78,0.7)]`}>
      <CirculoIcone>{icone}</CirculoIcone>
      <span className="h-11 w-px shrink-0 bg-white/15" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{rotulo}</span>
        {children}
      </span>
    </label>
  );
}
