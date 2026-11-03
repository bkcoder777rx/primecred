import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { CabecalhoPagina, Selo, Vazio } from "@/components/ui";
import { formatarCpf, formatarMoeda, formatarTelefone, somenteDigitos } from "@/lib/formato";
import { SITUACAO_CLIENTE } from "@/lib/rotulos";
import { exigirAdmin } from "@/lib/supabase/server";
import type { ClienteView } from "@/lib/tipos";
import { Link2, Plus, UserPlus, UserSearch } from "lucide-react";

export const metadata: Metadata = { title: "Clientes" };

const FILTROS = [
  { valor: "", rotulo: "Todos" },
  { valor: "ativos", rotulo: "Ativos" },
  { valor: "atrasado", rotulo: "Atrasados" },
  { valor: "aprovado", rotulo: "Aprovados sem empréstimo" },
  { valor: "em_analise", rotulo: "Em análise" },
  { valor: "inativo", rotulo: "Inativos" },
  { valor: "bloqueado", rotulo: "Bloqueados" },
];

export default async function PaginaClientes({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").replace(/[,()%*]/g, " ").trim();
  const filtro = String(sp.situacao ?? "");
  const supabase = await exigirAdmin();

  let consulta = supabase.from("v_clientes").select("*").order("nome").limit(300);
  if (filtro === "ativos") consulta = consulta.in("situacao", ["ativo", "atrasado"]);
  else if (filtro) consulta = consulta.eq("situacao", filtro);
  if (q) {
    const d = somenteDigitos(q);
    consulta = d.length >= 3
      ? consulta.or(`nome.ilike.%${q}%,cpf.ilike.%${d}%,telefone.ilike.%${d}%`)
      : consulta.ilike("nome", `%${q}%`);
  }
  const { data, error } = await consulta.returns<ClienteView[]>();
  if (error) throw error;

  const href = (situacao: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (situacao) p.set("situacao", situacao);
    const s = p.toString();
    return s ? `/clientes?${s}` : "/clientes";
  };

  return (
    <>
      <CabecalhoPagina
        rotulo="Gestão de clientes"
        titulo="Clientes"
        descricao="Gerencie seus clientes, acompanhe status e tenha uma visão completa."
        icone={UserPlus}
        acoes={
          <>
            <Link href="/solicitacoes?novo=1" className="btn btn-contorno px-5 py-3">
              <Link2 className="size-4" /> Gerar link de cadastro
            </Link>
            <Link href="/clientes/novo" className="btn btn-primario px-5 py-3">
              <Plus className="size-4" strokeWidth={2.5} /> Novo cliente
            </Link>
          </>
        }
      />

      <form className="relative mb-4" action="/clientes">
        {filtro && <input type="hidden" name="situacao" value={filtro} />}
        <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-suave" />
        <input name="q" defaultValue={q} placeholder="Buscar por nome, CPF ou telefone..." className="campo rounded-2xl py-4 pl-14 sm:text-base" />
      </form>

      <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={href(f.valor)}
            className={`pilula ${
              filtro === f.valor ? "pilula-ativa" : ""
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      <div className="cartao p-0 sm:p-0">
        {data.length === 0 ? (
          <Vazio icone={UserSearch} dica="Utilize a busca ou os filtros acima para encontrar clientes.">Nenhum cliente encontrado</Vazio>
        ) : (
          <ul className="divide-y divide-borda">
            {data.map((c) => {
              const sit = SITUACAO_CLIENTE[c.situacao];
              return (
                <li key={c.id}>
                  <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fundo">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-marca-suave text-sm font-semibold text-marca-forte">
                      {c.nome.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.nome}</span>
                      <span className="block truncate text-xs text-suave">
                        {c.cpf ? formatarCpf(c.cpf) : "sem CPF"} · {formatarTelefone(c.telefone)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Selo cor={sit.cor}>{sit.rotulo}</Selo>
                      {Number(c.principal_aberto_centavos) > 0 && (
                        <span className="text-xs text-suave tabular-nums">
                          {formatarMoeda(Number(c.principal_aberto_centavos))}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
