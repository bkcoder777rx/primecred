/** Retorno padrão das Server Actions usadas com `useActionState`. */
export type Resultado = { ok: boolean; mensagem?: string } | null;

export function mensagemDeErro(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") return e.message;
  return "Não foi possível concluir. Tente novamente.";
}

export function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

export function textoOuNulo(fd: FormData, campo: string): string | null {
  return texto(fd, campo) || null;
}
