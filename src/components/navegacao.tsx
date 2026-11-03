"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Crown,
  FileText,
  HandCoins,
  House,
  KeyRound,
  LogOut,
  Menu,
  PhoneCall,
  Search,
  Settings,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { sair } from "@/app/login/actions";
import { CreditoDesenvolvedor } from "@/components/credito-desenvolvedor";

type Item = { href: string; rotulo: string; icone: LucideIcon; contador?: number };

const ITENS: Omit<Item, "contador">[] = [
  { href: "/painel", rotulo: "Início", icone: House },
  { href: "/emprestimos", rotulo: "Empréstimos", icone: HandCoins },
  { href: "/cobranca", rotulo: "Cobrança", icone: PhoneCall },
  { href: "/clientes", rotulo: "Clientes", icone: Users },
  { href: "/solicitacoes", rotulo: "Solicitações", icone: FileText },
  { href: "/caixa", rotulo: "Caixa", icone: Wallet },
  { href: "/notificacoes", rotulo: "Notificações", icone: Bell },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
];

function MarcaPainel() {
  return (
    <Link href="/painel" className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG estático com transparência */}
      <img src="/marca/emblema.png" alt="" className="h-11 w-auto drop-shadow-[0_4px_12px_rgba(232,187,82,0.35)]" />
      <span className="leading-none">
        <span className="block text-[22px] font-extrabold tracking-tight">
          <span className="text-white">Prime</span>
          <span className="bg-gradient-to-b from-[#fbe7a1] to-[#d09a35] bg-clip-text text-transparent">Cred</span>
        </span>
        <span className="mt-1 block text-[9px] font-semibold tracking-[0.3em] text-[#e8bb52]">CRÉDITO PESSOAL</span>
      </span>
    </Link>
  );
}

function Contador({ n }: { n: number }) {
  return (
    <span className="grid min-w-6 place-items-center rounded-full bg-gradient-to-b from-[#f7dc8f] to-[#e3b54e] px-1.5 text-xs leading-6 font-bold text-[#1a1204]">
      {n}
    </span>
  );
}

export function Navegacao({ naoLidas, paraAnalisar }: { naoLidas: number; paraAnalisar: number }) {
  const caminho = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const itens: Item[] = ITENS.map((i) => ({
    ...i,
    contador: i.href === "/notificacoes" ? naoLidas : i.href === "/solicitacoes" ? paraAnalisar : undefined,
  }));
  const ativo = (href: string) => caminho.startsWith(href);

  const linkLateral = (i: Item) => {
    const Icone = i.icone;
    const on = ativo(i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        onClick={() => setMenuAberto(false)}
        className={`flex items-center gap-3.5 rounded-xl border px-4 py-3 text-[15px] font-medium transition ${
          on
            ? "border-[#e3b54e]/80 bg-gradient-to-r from-[#e3b54e]/20 to-[#e3b54e]/5 text-[#f7dc8f] shadow-[0_0_24px_-8px_rgba(227,181,78,0.6)]"
            : "border-transparent text-texto/90 hover:bg-white/[0.04]"
        }`}
      >
        <Icone className={`size-5 ${on ? "text-[#f7dc8f]" : "text-texto/80"}`} strokeWidth={1.8} />
        <span className="flex-1">{i.rotulo}</span>
        {!!i.contador && <Contador n={i.contador} />}
        {on && !i.contador && <ChevronRight className="size-4" />}
      </Link>
    );
  };

  return (
    <>
      {/* Computador: barra lateral */}
      <aside className="nao-imprimir sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-borda bg-gradient-to-b from-[#07170f] to-[#040e09] px-5 pt-7 pb-5 lg:flex">
        <div className="shrink-0 px-2">
          <MarcaPainel />
        </div>
        <nav className="mt-10 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">{itens.map(linkLateral)}</nav>
        <div className="relative mt-4 shrink-0 overflow-hidden rounded-2xl border border-marca/30 bg-gradient-to-br from-[#0f2a1c] to-[#06140d] p-4">
          <svg aria-hidden viewBox="0 0 200 120" className="pointer-events-none absolute right-0 bottom-0 h-full w-2/3 opacity-70">
            <path d="M0 120 C 80 110, 140 60, 200 0" fill="none" stroke="#e3b54e" strokeWidth="1.2" opacity="0.7" />
            <path d="M20 120 C 100 108, 150 70, 200 20" fill="none" stroke="#e3b54e" strokeWidth="0.6" opacity="0.4" />
          </svg>
          <span className="grid size-10 place-items-center rounded-full border border-marca/50 bg-[#0b2317]">
            <Crown className="size-5 text-[#e8bb52]" strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-lg font-extrabold">
            Prime<span className="text-[#e8bb52]">Cred</span>
          </p>
          <p className="relative text-sm leading-snug text-texto/75">Gestão completa do seu negócio de crédito pessoal.</p>
        </div>
        <CreditoDesenvolvedor />
      </aside>

      {/* Celular: barra inferior */}
      <nav className="nao-imprimir fixed inset-x-0 bottom-0 z-20 flex border-t border-borda bg-[#06140e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {itens.slice(0, 4).map((i) => {
          const Icone = i.icone;
          const on = ativo(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${on ? "text-[#f7dc8f]" : "text-suave"}`}
            >
              <Icone className="size-5" strokeWidth={1.8} />
              {i.rotulo}
            </Link>
          );
        })}
        <button
          onClick={() => setMenuAberto(true)}
          className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-suave"
        >
          <Menu className="size-5" />
          Mais
          {paraAnalisar + naoLidas > 0 && <span className="absolute top-1.5 right-[30%] size-2 rounded-full bg-[#e3b54e]" />}
        </button>
      </nav>

      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuAberto(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl border-t border-borda bg-[#06140e] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <MarcaPainel />
              <button onClick={() => setMenuAberto(false)} aria-label="Fechar" className="p-1">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">{itens.map(linkLateral)}</nav>
            <form action={sair} className="mt-2 border-t border-borda pt-2">
              <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-suave">
                <LogOut className="size-4" /> Sair
              </button>
            </form>
            <CreditoDesenvolvedor />
          </div>
        </div>
      )}
    </>
  );
}

/** Barra superior: título da tela com caminho, busca, notificações e perfil. */
export function BarraSuperior({ naoLidas }: { naoLidas: number }) {
  const caminho = usePathname();
  const router = useRouter();
  const busca = useRef<HTMLInputElement>(null);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const atual = ITENS.find((i) => caminho.startsWith(i.href)) ?? ITENS[0];
  const Icone = atual.icone;
  const detalhe = caminho !== atual.href && caminho.startsWith(`${atual.href}/`);

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        busca.current?.focus();
      }
    };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  return (
    <header className="nao-imprimir sticky top-0 z-20 border-b border-borda/60 bg-[#05110c]/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-8 lg:py-5">
        <div className="lg:hidden">
          <Link href="/painel" aria-label="Início">
            {/* eslint-disable-next-line @next/next/no-img-element -- PNG estático com transparência */}
            <img src="/marca/emblema.png" alt="" className="h-9 w-auto" />
          </Link>
        </div>
        <span className="hidden size-12 place-items-center rounded-xl border border-borda bg-gradient-to-br from-[#12301f] to-[#081a12] lg:grid">
          <Icone className="size-6 text-[#3fbf86]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold sm:text-2xl">{atual.rotulo}</p>
          <p className="flex items-center gap-1.5 text-xs text-suave sm:text-sm">
            <Link href="/painel" className="hover:text-marca">
              Início
            </Link>
            {atual.href !== "/painel" && (
              <>
                <ChevronRight className="size-3.5" />
                <Link href={atual.href} className={detalhe ? "hover:text-marca" : "text-texto/90"}>
                  {atual.rotulo}
                </Link>
              </>
            )}
            {detalhe && (
              <>
                <ChevronRight className="size-3.5" />
                <span className="text-texto/90">Detalhes</span>
              </>
            )}
          </p>
        </div>

        <form
          className="relative hidden w-96 md:block"
          onSubmit={(e) => {
            e.preventDefault();
            const q = busca.current?.value.trim();
            router.push(q ? `/clientes?q=${encodeURIComponent(q)}` : "/clientes");
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-suave" />
          <input
            ref={busca}
            placeholder="Buscar cliente por nome, CPF ou telefone…"
            className="w-full rounded-xl border border-borda bg-[#071610]/80 py-2.5 pr-20 pl-10 text-sm outline-none placeholder:text-suave/80 focus:border-marca/60"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-borda bg-white/5 px-1.5 py-0.5 text-[11px] text-suave">
            Ctrl K
          </kbd>
        </form>

        <Link href="/notificacoes" className="relative grid size-10 place-items-center rounded-xl hover:bg-white/5" aria-label="Notificações">
          <Bell className="size-5 text-texto/90" strokeWidth={1.8} />
          {naoLidas > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-[#e3b54e]" />}
        </Link>

        <div className="relative">
          <button
            onClick={() => setPerfilAberto((v) => !v)}
            className="flex items-center gap-3 rounded-xl py-1 pr-1 pl-1 hover:bg-white/5"
            aria-expanded={perfilAberto}
          >
            <span className="relative grid size-11 place-items-center rounded-full bg-gradient-to-b from-[#1d6b47] to-[#0d3d27] text-sm font-bold">
              PC
              <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-[#05110c] bg-[#3fbf86]" />
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block font-semibold">Prime Cred</span>
              <span className="block text-xs text-suave">Administrador</span>
            </span>
            <ChevronDown className="hidden size-4 text-suave sm:block" />
          </button>
          {perfilAberto && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-borda bg-[#0a1c14] shadow-2xl">
              <Link
                href="/configuracoes"
                onClick={() => setPerfilAberto(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/5"
              >
                <Settings className="size-4 text-suave" /> Configurações
              </Link>
              <Link
                href="/trocar-senha"
                onClick={() => setPerfilAberto(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/5"
              >
                <KeyRound className="size-4 text-suave" /> Trocar senha
              </Link>
              <form action={sair} className="border-t border-borda">
                <button className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-perigo hover:bg-white/5">
                  <LogOut className="size-4" /> Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
