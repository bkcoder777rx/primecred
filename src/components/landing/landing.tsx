"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { PedidoWizard } from "@/components/landing/pedido-wizard";
import { rastrear } from "@/components/pixel-meta";
import { BotaoDourado, OURO_TEXTO } from "@/components/publico/visual";
import { linkWhatsApp } from "@/lib/formato";
import { capturarUtms } from "@/lib/utm";

type Painel = null | "como" | "pedido";

const PASSOS = [
  { titulo: "Faça sua simulação", texto: "Escolha o valor, sua cidade e informe sua renda. Leva 1 minuto." },
  { titulo: "Envie os documentos", texto: "RG, comprovantes e fotos da residência, tudo pelo celular." },
  { titulo: "Análise rápida", texto: "Nossa equipe confere e fala com você pelo WhatsApp." },
  { titulo: "Dinheiro no Pix", texto: "Aprovado, o valor cai direto na sua conta." },
];

// A página é a própria arte (941 × 1672, formato wallpaper). Os botões desenhados nela recebem áreas clicáveis
// nas mesmas posições, em porcentagem, para acompanhar qualquer largura de tela.
const ARTE = { largura: 941, altura: 1672 };
const area = (x1: number, y1: number, x2: number, y2: number): React.CSSProperties => ({
  left: `${(x1 / ARTE.largura) * 100}%`,
  top: `${(y1 / ARTE.altura) * 100}%`,
  width: `${((x2 - x1) / ARTE.largura) * 100}%`,
  height: `${((y2 - y1) / ARTE.altura) * 100}%`,
});
const BOTAO_SOLICITAR = area(93, 1181, 849, 1280);
const BOTAO_WHATSAPP = area(93, 1470, 850, 1572);

const areaClicavel =
  "absolute rounded-2xl outline-none transition hover:bg-white/[0.06] active:scale-[0.985] active:bg-black/10 focus-visible:ring-2 focus-visible:ring-[#f7dc8f]";

export function Landing({
  empresaSlug,
  whatsapp,
  cnpj,
  empresa,
  taxa,
  prazo,
}: {
  empresaSlug: string;
  empresa: string;
  whatsapp: string;
  cnpj: string;
  taxa: number;
  prazo: number;
}) {
  const [painel, setPainel] = useState<Painel>(null);
  // Guarda as UTMs do anúncio assim que a pessoa chega, para enviar junto com o pedido.
  useEffect(() => capturarUtms(), []);
  const linkDuvidas = whatsapp
    ? linkWhatsApp(whatsapp, `Olá! Vim pelo site da ${empresa} e tenho uma dúvida.`)
    : null;

  return (
    <main className="min-h-dvh bg-[#000504] text-white">
      <div className="relative mx-auto w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element -- arte da página, exibida exatamente como foi enviada */}
        <img
          src="/marca/pagina-inicial.webp?v=2"
          width={ARTE.largura}
          height={ARTE.altura}
          alt=""
          draggable={false}
          fetchPriority="high"
          className="block h-auto w-full select-none"
        />
        {/* Funde a borda de baixo da arte com o fundo da página. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[#000504]" />
        <h1 className="sr-only">
          {empresa} — Empréstimo no Pix, com análise rápida pelo celular. Crédito direto, sem burocracia de banco.
        </h1>

        <button
          type="button"
          aria-label="Solicitar empréstimo"
          onClick={() => setPainel("pedido")}
          className={areaClicavel}
          style={BOTAO_SOLICITAR}
        />
        {linkDuvidas ? (
          <a
            href={linkDuvidas}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Tirar dúvidas no WhatsApp"
            onClick={() => rastrear("Contact")}
            className={areaClicavel}
            style={BOTAO_WHATSAPP}
          />
        ) : (
          <button
            type="button"
            aria-label="Tirar dúvidas"
            onClick={() => setPainel("como")}
            className={areaClicavel}
            style={BOTAO_WHATSAPP}
          />
        )}
      </div>

      <footer className="mx-auto max-w-md px-5 pt-4 pb-8 text-center text-[11px] leading-relaxed text-white/40">
        <p>
          {empresa}
          {cnpj && ` · CNPJ ${cnpj}`}
        </p>
        <p>Crédito sujeito a análise. Seus dados são usados apenas para a análise de crédito, conforme a LGPD.</p>
      </footer>

      {painel === "como" && <ComoFunciona onFechar={() => setPainel(null)} onSolicitar={() => setPainel("pedido")} />}
      {painel === "pedido" && <PedidoWizard empresaSlug={empresaSlug} taxa={taxa} prazo={prazo} whatsapp={whatsapp} onFechar={() => setPainel(null)} />}
    </main>
  );
}

function ComoFunciona({ onFechar, onSolicitar }: { onFechar: () => void; onSolicitar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label="Como funciona">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#1f5a3c] bg-[#06190f] px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">
            Como <span className={OURO_TEXTO}>funciona</span>
          </h2>
          <button onClick={onFechar} aria-label="Fechar" className="rounded-full p-1.5 hover:bg-white/10">
            <X className="size-5" />
          </button>
        </div>
        <ol className="space-y-4">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f7dc8f] to-[#d09a35] text-sm font-bold text-[#1a1204]">
                {i + 1}
              </span>
              <div>
                <p className="font-bold">{p.titulo}</p>
                <p className="text-sm text-white/65">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <BotaoDourado onClick={onSolicitar}>
            Solicitar agora <ArrowRight className="size-5" />
          </BotaoDourado>
        </div>
      </div>
    </div>
  );
}
