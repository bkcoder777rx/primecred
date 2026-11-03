// Identidade visual das páginas públicas (divulgação, pedido e envio de documentos):
// verde-escuro profundo, dourado metálico e linhas de luz douradas.
import { Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const OURO_TEXTO = "bg-gradient-to-b from-[#fbe7a1] via-[#e8bb52] to-[#b8862b] bg-clip-text text-transparent";
export const CARTAO = "rounded-2xl border border-[#1f5a3c]/80 bg-[#0a2618]/70 backdrop-blur-sm";
export const CARTAO_ATIVO =
  "rounded-2xl border border-[#e3b54e] bg-[#0f2a1a]/80 shadow-[0_0_0_1px_rgba(227,181,78,0.25),0_0_28px_-8px_rgba(227,181,78,0.6)]";
export const CARTAO_OURO =
  "rounded-2xl border border-[#e3b54e]/70 bg-[#0d2416]/70 shadow-[0_0_30px_-12px_rgba(227,181,78,0.55)]";

/** Fundo verde profundo com feixes de luz dourada nas bordas. */
export function FundoPremium() {
  const feixe = (d: string, opacidade: number, largura = 1.2) => (
    <path d={d} fill="none" stroke="url(#ouro)" strokeWidth={largura} strokeLinecap="round" opacity={opacidade} />
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,#0e3d26_0%,#072216_45%,#03110a_100%)]" />
      <div className="absolute -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-[#1d7a4b]/20 blur-3xl" />
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="ouro" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#8a5f1a" stopOpacity="0" />
            <stop offset="0.35" stopColor="#e8bb52" />
            <stop offset="0.7" stopColor="#fff1bf" />
            <stop offset="1" stopColor="#c8922f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="verde" x1="0" x2="1">
            <stop offset="0" stopColor="#2fae6a" stopOpacity="0" />
            <stop offset="0.5" stopColor="#35c27a" />
            <stop offset="1" stopColor="#2fae6a" stopOpacity="0" />
          </linearGradient>
          <filter id="brilho" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#brilho)">
          {feixe("M-40 790 C 90 730, 230 870, 440 740", 0.95, 1.6)}
          {feixe("M-40 812 C 110 760, 240 880, 440 770", 0.45)}
          {feixe("M-40 835 C 120 790, 260 900, 440 800", 0.25)}
          {feixe("M440 250 C 380 300, 360 380, 300 470", 0.55)}
          {feixe("M-30 420 C 20 470, 30 540, 90 610", 0.35)}
        </g>
        {Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            d={`M${-40 + i * 4} ${60 + i * 9} C 60 ${120 + i * 10}, 20 ${260 + i * 6}, -10 ${360 + i * 8}`}
            fill="none"
            stroke="url(#verde)"
            strokeWidth="0.6"
            opacity={0.25}
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <path
            key={`d${i}`}
            d={`M${440 - i * 4} ${520 + i * 7} C 360 ${560 + i * 8}, 390 ${660 + i * 6}, 330 ${760 + i * 5}`}
            fill="none"
            stroke="url(#verde)"
            strokeWidth="0.6"
            opacity={0.22}
          />
        ))}
      </svg>
    </div>
  );
}

/** Símbolo + "PrimeCred / CRÉDITO PESSOAL". */
export function Marca({ tamanho = "md" }: { tamanho?: "md" | "lg" }) {
  const grande = tamanho === "lg";
  return (
    <div className={`flex items-center ${grande ? "flex-col gap-1" : "gap-2"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG estático com transparência */}
      <img
        src="/marca/emblema.png"
        alt=""
        className={`${grande ? "h-28" : "h-11"} w-auto drop-shadow-[0_6px_18px_rgba(232,187,82,0.35)]`}
      />
      <div className={grande ? "text-center" : "leading-none"}>
        <p className={`font-extrabold tracking-tight ${grande ? "text-[2.75rem] leading-none" : "text-2xl"}`}>
          <span className="bg-gradient-to-b from-white to-[#c9ccd1] bg-clip-text text-transparent">Prime</span>
          <span className={OURO_TEXTO}>Cred</span>
        </p>
        <p
          className={`font-semibold text-[#e8bb52] ${grande ? "mt-2 text-sm tracking-[0.45em]" : "mt-1 text-[9px] tracking-[0.35em]"}`}
        >
          CRÉDITO <span className="text-white/80">PESSOAL</span>
        </p>
      </div>
    </div>
  );
}

/** Barra de etapas numeradas com linha dourada. `atual` começa em 0. */
export function Etapas({ nomes, atual }: { nomes: string[]; atual: number }) {
  return (
    <ol className="flex items-start">
      {nomes.map((nome, i) => {
        const feito = i < atual;
        const ativo = i === atual;
        return (
          <li key={nome} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span className={`h-px flex-1 ${i === 0 ? "opacity-0" : i <= atual ? "bg-[#e3b54e]" : "bg-white/20"}`} />
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  ativo
                    ? "bg-gradient-to-b from-[#f7dc8f] to-[#d09a35] text-[#1a1204] shadow-[0_0_18px_-2px_rgba(232,187,82,0.8)]"
                    : feito
                      ? "border-2 border-[#e3b54e] bg-[#0b2a1b] text-[#f1d58a]"
                      : "border border-white/25 bg-[#0b2a1b]/60 text-white/60"
                }`}
              >
                {feito ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`h-px flex-1 ${i === nomes.length - 1 ? "opacity-0" : i < atual ? "bg-[#e3b54e]" : "bg-white/20"}`}
              />
            </div>
            <span className={`text-[11px] leading-tight ${ativo ? "font-bold text-[#f1d58a]" : "text-white/70"}`}>
              {i + 1}. {nome}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Título grande com a parte final em dourado. */
export function TituloDestaque({
  inicio,
  destaque,
  subtitulo,
}: {
  inicio: string;
  destaque: string;
  subtitulo?: string;
}) {
  return (
    <div>
      <h1 className="text-[2.1rem] leading-[1.05] font-black tracking-tight">
        {inicio} <span className={OURO_TEXTO}>{destaque}</span>
      </h1>
      {subtitulo && <p className="mt-2 text-[15px] text-white/75">{subtitulo}</p>}
    </div>
  );
}

export function BotaoDourado({
  children,
  disabled,
  onClick,
  tipo = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  tipo?: "button" | "submit";
}) {
  return (
    <button
      type={tipo}
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#fbe7a1]/60 bg-gradient-to-b from-[#f7dc8f] via-[#e5b54e] to-[#c8922f] px-5 py-4 text-lg font-extrabold text-[#1a1204] shadow-[0_12px_32px_-10px_rgba(229,181,78,0.75)] transition active:scale-[0.98] disabled:opacity-45 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

/** Ícone dourado dentro de um círculo com aro dourado. */
export function CirculoIcone({
  icone: Icone,
  tamanho = "md",
  children,
}: {
  icone?: LucideIcon;
  tamanho?: "sm" | "md";
  children?: ReactNode;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-[#e3b54e]/55 bg-gradient-to-b from-[#123524] to-[#07190f] text-[#e8bb52] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
        tamanho === "sm" ? "size-10" : "size-12"
      }`}
    >
      {Icone ? <Icone className={tamanho === "sm" ? "size-5" : "size-6"} strokeWidth={1.8} /> : children}
    </span>
  );
}

export function Rodape({ icone: Icone, children }: { icone: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 text-center text-[13px] text-white/65">
      <Icone className="size-5 shrink-0 text-[#e8bb52]" strokeWidth={1.8} /> {children}
    </p>
  );
}

export function IconeWhatsApp({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3.5 20.5l1.3-4.1A8.5 8.5 0 1 1 8 19.6z" strokeLinejoin="round" />
      <path
        d="M9 8.3c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4l.6 1.5c.1.2 0 .4-.1.6l-.4.5c-.1.1-.2.3 0 .5.5.9 1.2 1.6 2.1 2.1.2.1.4.1.5 0l.5-.5c.2-.2.4-.2.6-.1l1.4.7c.3.1.3.3.3.5 0 .4-.2 1.1-.8 1.4-.5.3-1.4.4-2.9-.3a8.7 8.7 0 0 1-3.6-3.6c-.6-1.2-.4-2.2 0-2.6z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function IconeInstagram({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
