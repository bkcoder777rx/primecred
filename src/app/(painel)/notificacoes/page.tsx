import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Vazio } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { exigirAdmin } from "@/lib/supabase/server";
import type { Notificacao } from "@/lib/tipos";
import { abrirNotificacao, marcarTodasLidas } from "./actions";
import { Bell } from "lucide-react";

export const metadata: Metadata = { title: "Notificações" };

export default async function PaginaNotificacoes() {
  const supabase = await exigirAdmin();
  const { data } = await supabase
    .from("notificacoes")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(100)
    .returns<Notificacao[]>();
  const naoLidas = (data ?? []).filter((n) => !n.lida).length;

  return (
    <>
      <CabecalhoPagina
        rotulo="Avisos"
        icone={Bell}
        titulo="Notificações"
        descricao={
          <>
            Avisos de vencimentos e documentos recebidos.{" "}
            <Link href="/configuracoes#notificacoes" className="text-marca">
              Receber no celular
            </Link>
          </>
        }
        acoes={
          naoLidas > 0 && (
            <form action={marcarTodasLidas}>
              <button className="btn">Marcar todas como lidas</button>
            </form>
          )
        }
      />
      <div className="cartao p-0 sm:p-0">
        {data?.length ? (
          <ul className="divide-y divide-borda">
            {data.map((n) => (
              <li key={n.id}>
                <form action={abrirNotificacao.bind(null, n.id)}>
                  <button className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-fundo ${n.lida ? "opacity-60" : ""}`}>
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.lida ? "bg-transparent" : "bg-marca"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{n.titulo}</span>
                      {n.corpo && <span className="block text-sm whitespace-pre-line text-suave">{n.corpo}</span>}
                      <span className="block text-xs text-suave">{formatarDataHora(n.criado_em)}</span>
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio>Nenhuma notificação ainda.</Vazio>
        )}
      </div>
    </>
  );
}
