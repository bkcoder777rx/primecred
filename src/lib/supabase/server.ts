import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export async function criarClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o proxy já renova a sessão.
          }
        },
      },
    },
  );
}

/**
 * Cliente Supabase de quem usa o painel de uma empresa. As regras do banco (RLS) já limitam
 * tudo à empresa do usuário. Sem sessão → login; sem empresa → Painel BK (se for da equipe BK)
 * ou login; empresa bloqueada → tela de acesso suspenso.
 */
export const exigirAdmin = cache(async () => {
  const { supabase, acesso } = await meuAcesso();
  if (acesso.trocar_senha) redirect("/trocar-senha");
  if (!acesso.empresa_id) {
    // Conta sem empresa (ex.: só da equipe BK, que usa o painel próprio): não entra aqui.
    await supabase.auth.signOut();
    redirect("/login");
  }
  if (!acesso.liberada) redirect("/suspenso");
  return supabase;
});

export type Acesso = {
  user_id: string;
  email: string;
  empresa_id: string | null;
  liberada: boolean;
  bk: boolean;
  bk_dono: boolean;
  trocar_senha: boolean;
};

/** Quem está logado e o que pode acessar (uma consulta por requisição). Sem sessão → login. */
export const meuAcesso = cache(async () => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const { data: info, error } = await supabase.rpc("meu_acesso");
  if (error) throw error;
  const acesso: Acesso = {
    user_id: data.claims.sub,
    email: String(data.claims.email ?? ""),
    ...(info as Omit<Acesso, "user_id" | "email">),
  };
  return { supabase, acesso };
});

/** Id da empresa de quem está logado (usar depois de exigirAdmin). */
export async function empresaAtual(supabase: Awaited<ReturnType<typeof criarClienteServidor>>): Promise<string> {
  const { data, error } = await supabase.rpc("minha_empresa");
  if (error || !data) throw new Error("Empresa não encontrada para este usuário.");
  return data as string;
}
