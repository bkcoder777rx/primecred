// Cliente com a chave secreta: ignora RLS. Usar SOMENTE no servidor
// (link público do cliente e rotina diária), sempre validando o acesso antes.
import { createClient } from "@supabase/supabase-js";

export function criarClienteServico() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("SUPABASE_SECRET_KEY não configurada.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
