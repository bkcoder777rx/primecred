// Proteção do login contra tentativas de adivinhar senha, e registro de todos os acessos.
// Usa a chave secreta (somente no servidor): quem tenta entrar ainda não está logado.
import type { SupabaseClient } from "@supabase/supabase-js";

/** Falhas de um mesmo IP em 15 minutos que bloqueiam o IP. */
export const LIMITE_IP = { falhas: 5, minutos: 15 };
/** Falhas no mesmo e-mail em 1 hora que bloqueiam o e-mail (protege contra vários IPs). */
export const LIMITE_EMAIL = { falhas: 10, minutos: 60 };

/** IP de quem fez a requisição (na Vercel vem no x-forwarded-for; o primeiro é o do usuário). */
export function ipDaRequisicao(h: Headers): string {
  const encaminhado = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (encaminhado || h.get("x-real-ip") || "desconhecido").slice(0, 64);
}

function desde(minutos: number): string {
  return new Date(Date.now() - minutos * 60_000).toISOString();
}

async function contarFalhas(supabase: SupabaseClient, campo: "ip" | "email", valor: string, minutos: number) {
  const { count, error } = await supabase
    .from("acessos_log")
    .select("id", { count: "exact", head: true })
    .eq(campo, valor)
    .eq("sucesso", false)
    .eq("motivo", "senha_incorreta")
    .eq("ignorar", false)
    .gte("criado_em", desde(minutos));
  if (error) throw error;
  return count ?? 0;
}

/** O IP ou o e-mail passou do limite de falhas recentes? */
export async function loginBloqueado(supabase: SupabaseClient, ip: string, email: string): Promise<boolean> {
  const [porIp, porEmail] = await Promise.all([
    contarFalhas(supabase, "ip", ip, LIMITE_IP.minutos),
    email ? contarFalhas(supabase, "email", email, LIMITE_EMAIL.minutos) : Promise.resolve(0),
  ]);
  return porIp >= LIMITE_IP.falhas || porEmail >= LIMITE_EMAIL.falhas;
}

export async function registrarAcesso(
  supabase: SupabaseClient,
  a: {
    email: string;
    ip: string;
    userAgent: string;
    sucesso: boolean;
    motivo: "ok" | "senha_incorreta" | "bloqueado";
    userId?: string;
    empresaId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("acessos_log").insert({
    email: a.email.slice(0, 200) || null,
    ip: a.ip,
    user_agent: a.userAgent.slice(0, 300),
    sucesso: a.sucesso,
    motivo: a.motivo,
    user_id: a.userId ?? null,
    empresa_id: a.empresaId ?? null,
  });
  if (error) console.error("Falha ao registrar acesso", error);
}

/** Resumo do aparelho a partir do user-agent ("Chrome · Windows"). */
export function descreverAparelho(ua: string | null | undefined): string {
  if (!ua) return "—";
  const navegador = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Navegador";
  const sistema = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iPhone"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return sistema ? `${navegador} · ${sistema}` : navegador;
}
