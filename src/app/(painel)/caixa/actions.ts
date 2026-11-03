"use server";

import { revalidatePath } from "next/cache";
import { mensagemDeErro, texto, type Resultado } from "@/lib/acao";
import { lerMoeda } from "@/lib/formato";
import { CATEGORIAS_MANUAIS } from "@/lib/rotulos";
import { exigirAdmin } from "@/lib/supabase/server";

export async function lancarMovimento(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await exigirAdmin();
  const tipo = texto(fd, "tipo");
  const categoria = texto(fd, "categoria");
  const valor = lerMoeda(texto(fd, "valor"));
  const data = texto(fd, "data");
  if (!["entrada", "saida"].includes(tipo)) return { ok: false, mensagem: "Escolha entrada ou saída." };
  if (!(CATEGORIAS_MANUAIS as readonly string[]).includes(categoria)) return { ok: false, mensagem: "Categoria inválida." };
  if (!valor || valor <= 0) return { ok: false, mensagem: "Informe o valor." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, mensagem: "Data inválida." };

  const { error } = await supabase.from("caixa_movimentos").insert({
    tipo,
    categoria,
    valor_centavos: valor,
    data,
    descricao: texto(fd, "descricao") || null,
  });
  if (error) return { ok: false, mensagem: mensagemDeErro(error) };
  revalidatePath("/caixa");
  return { ok: true, mensagem: "Lançamento registrado." };
}

export async function excluirMovimento(id: string) {
  const supabase = await exigirAdmin();
  // Só lançamentos manuais: os automáticos se corrigem pelo estorno do pagamento.
  const { error } = await supabase
    .from("caixa_movimentos")
    .delete()
    .eq("id", id)
    .in("categoria", [...CATEGORIAS_MANUAIS]);
  if (error) throw error;
  revalidatePath("/caixa");
}
