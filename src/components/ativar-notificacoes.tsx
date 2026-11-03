"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useNavegador } from "@/lib/use-navegador";
import { removerInscricaoPush, salvarInscricaoPush, testarNotificacao } from "@/app/(painel)/configuracoes/actions";

function chaveParaBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function AtivarNotificacoes() {
  const temApi = useNavegador(() => "serviceWorker" in navigator && "PushManager" in window, null);
  const ios = useNavegador(() => /iPad|iPhone|iPod/.test(navigator.userAgent), false);
  const instalado = useNavegador(() => window.matchMedia("(display-mode: standalone)").matches, false);
  const [falhou, setFalhou] = useState(false);
  const [inscricao, setInscricao] = useState<PushSubscription | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const suportado = temApi === null ? null : temApi && !falhou;

  useEffect(() => {
    if (!temApi) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then(setInscricao)
      .catch(() => setFalhou(true));
  }, [temApi]);

  async function ativar() {
    setOcupado(true);
    setMsg(null);
    try {
      const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!chave) throw new Error("Chave de notificação não configurada no servidor (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") throw new Error("Permissão negada. Libere as notificações nas configurações do navegador.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) });
      await salvarInscricaoPush(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
      setInscricao(sub);
      setMsg("Notificações ativadas neste aparelho.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    if (!inscricao) return;
    setOcupado(true);
    await removerInscricaoPush(inscricao.endpoint);
    await inscricao.unsubscribe();
    setInscricao(null);
    setOcupado(false);
    setMsg("Notificações desativadas neste aparelho.");
  }

  if (suportado === null) return null;
  if (!suportado) {
    return (
      <p className="text-sm text-suave">
        {ios && !instalado
          ? "No iPhone, primeiro instale o app: toque em Compartilhar → “Adicionar à Tela de Início”, abra pelo ícone e volte aqui."
          : "Este navegador não suporta notificações."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ios && !instalado && (
        <p className="rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">
          No iPhone as notificações só funcionam com o app instalado: toque em Compartilhar → “Adicionar à Tela de Início”.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {inscricao ? (
          <>
            <button className="btn" disabled={ocupado} onClick={desativar}>
              <BellOff className="size-4" /> Desativar neste aparelho
            </button>
            <button
              className="btn"
              disabled={ocupado}
              onClick={async () => {
                const n = await testarNotificacao();
                setMsg(n ? "Notificação de teste enviada." : "Nenhum aparelho recebeu. Verifique as chaves VAPID.");
              }}
            >
              Enviar teste
            </button>
          </>
        ) : (
          <button className="btn btn-primario" disabled={ocupado} onClick={ativar}>
            <Bell className="size-4" /> Ativar notificações neste aparelho
          </button>
        )}
      </div>
      {msg && <p className="text-sm text-suave">{msg}</p>}
    </div>
  );
}
