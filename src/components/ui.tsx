import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, SearchX, type LucideIcon } from "lucide-react";
import type { CorSelo } from "@/lib/rotulos";

/** Linhas de luz douradas decorativas (canto direito dos banners e cartões). */
function LinhasDouradas({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 160" preserveAspectRatio="none" className={`pointer-events-none absolute ${className}`}>
      <defs>
        <linearGradient id="linha-ouro" x1="0" x2="1">
          <stop offset="0" stopColor="#e3b54e" stopOpacity="0" />
          <stop offset="0.6" stopColor="#e3b54e" stopOpacity="0.7" />
          <stop offset="1" stopColor="#f7dc8f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M${-20 + i * 6} ${170 - i * 3} C ${120 + i * 8} ${120 - i * 6}, ${220 + i * 4} ${60 + i * 2}, ${420} ${-10 + i * 5}`}
          fill="none"
          stroke="url(#linha-ouro)"
          strokeWidth={i === 4 ? 1.4 : 0.6}
          opacity={i === 4 ? 0.9 : 0.35}
        />
      ))}
    </svg>
  );
}

/** Banner do topo de cada tela: rótulo pequeno, título grande, descrição, ícone e ações. */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  voltar,
  rotulo,
  icone: Icone,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  voltar?: string;
  /** Texto pequeno acima do título, ex.: "Gestão de clientes". */
  rotulo?: string;
  /** Ícone decorativo grande à direita. */
  icone?: LucideIcon;
}) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl border border-marca/25 bg-gradient-to-br from-[#0d271c] via-[#081a12] to-[#06140e] px-5 py-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] sm:px-10 sm:py-9">
      <LinhasDouradas className="right-0 bottom-0 h-full w-2/3 opacity-60" />
      {Icone && (
        <div aria-hidden className="pointer-events-none absolute top-1/2 right-[32%] hidden -translate-y-1/2 lg:block">
          <div className="absolute inset-0 -m-6 rounded-full bg-[#e3b54e]/15 blur-2xl" />
          <Icone className="relative size-24 text-[#e8bb52] drop-shadow-[0_0_18px_rgba(232,187,82,0.55)]" strokeWidth={1.1} />
        </div>
      )}
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-xl">
          {voltar && (
            <Link href={voltar} className="mb-2 inline-flex items-center gap-1 text-sm text-suave hover:text-marca">
              <ChevronLeft className="size-4" /> Voltar
            </Link>
          )}
          {rotulo && <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-[#3fbf86] uppercase">{rotulo}</p>}
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            {typeof titulo === "string" ? (
              <span className="bg-gradient-to-r from-white via-[#f3efe2] to-[#e8bb52] bg-clip-text text-transparent">
                {titulo}
              </span>
            ) : (
              titulo
            )}
          </h1>
          {descricao && <p className="mt-3 text-sm text-texto/80 sm:text-base">{descricao}</p>}
        </div>
        {acoes && <div className="relative flex flex-wrap gap-3">{acoes}</div>}
      </div>
    </section>
  );
}

const CORES: Record<CorSelo, string> = {
  verde: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  vermelho: "bg-red-500/10 text-red-300 ring-red-400/30",
  amarelo: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  azul: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
  cinza: "bg-white/5 text-white/70 ring-white/15",
};

export function Selo({ cor, children }: { cor: CorSelo; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CORES[cor]}`}
    >
      {children}
    </span>
  );
}

export function Cartao({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`cartao ${className}`}>
      {(titulo || acao) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {titulo && <h2 className="text-base font-bold">{titulo}</h2>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom = "normal",
  href,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: "normal" | "perigo" | "alerta" | "marca";
  href?: string;
}) {
  const corValor = {
    normal: "text-texto",
    perigo: "text-perigo",
    alerta: "text-alerta",
    marca: "text-marca",
  }[tom];
  const conteudo = (
    <>
      <p className="text-[11px] font-semibold tracking-[0.18em] text-suave uppercase">{rotulo}</p>
      <p className={`mt-1.5 text-2xl font-black tabular-nums ${corValor}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-suave">{detalhe}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="cartao block transition hover:border-marca/50">
      {conteudo}
    </Link>
  ) : (
    <div className="cartao">{conteudo}</div>
  );
}

export function Campo({
  rotulo,
  ajuda,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { rotulo: string; ajuda?: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="rotulo">{rotulo}</span>
      <input className="campo" {...props} />
      {ajuda && <span className="mt-1 block text-xs text-suave">{ajuda}</span>}
    </label>
  );
}

export function CampoTexto({
  rotulo,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rotulo: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="rotulo">{rotulo}</span>
      <textarea className="campo min-h-20" {...props} />
    </label>
  );
}

export function CampoSelecao({
  rotulo,
  opcoes,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <label className={`block ${className}`}>
      <span className="rotulo">{rotulo}</span>
      <select className="campo" {...props}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Estado vazio com ícone. `dica` aparece em texto menor abaixo. */
export function Vazio({
  children,
  dica,
  icone: Icone = SearchX,
}: {
  children: ReactNode;
  dica?: ReactNode;
  icone?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 -m-3 rounded-full bg-[#e3b54e]/10 blur-xl" />
        <div className="relative grid size-16 place-items-center rounded-2xl border border-borda bg-gradient-to-br from-[#12301f] to-[#081a12]">
          <Icone className="size-8 text-[#e8bb52]" strokeWidth={1.5} />
        </div>
      </div>
      <p className="font-bold text-texto">{children}</p>
      {dica && <p className="mt-1 text-sm text-suave">{dica}</p>}
    </div>
  );
}

export function LinhaInfo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-borda py-2 text-sm last:border-b-0">
      <span className="text-suave">{rotulo}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
