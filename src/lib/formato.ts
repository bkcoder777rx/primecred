const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(centavos: number | null | undefined): string {
  return moeda.format((centavos ?? 0) / 100);
}

/** Converte "1.234,56", "1234.56" ou "R$ 1.000" em centavos. Retorna null se inválido. */
export function lerMoeda(texto: string | null | undefined): number | null {
  if (!texto) return null;
  let t = texto.replace(/[R$\s]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Máscara de dinheiro enquanto digita: os dígitos entram como centavos ("150000" → "1.500,00"). */
export function mascaraMoeda(texto: string): string {
  const d = somenteDigitos(texto).replace(/^0+/, "").slice(0, 9);
  if (!d) return "";
  const centavos = d.padStart(3, "0");
  const inteiro = centavos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${inteiro},${centavos.slice(-2)}`;
}

export function somenteDigitos(texto: string | null | undefined): string {
  return (texto ?? "").replace(/\D/g, "");
}

export function validarCpf(cpf: string): boolean {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function formatarCpf(cpf: string | null | undefined): string {
  const d = somenteDigitos(cpf);
  if (d.length !== 11) return cpf ?? "—";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarTelefone(tel: string | null | undefined): string {
  const d = somenteDigitos(tel);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel || "—";
}

/** Link que abre a conversa no WhatsApp com a mensagem já escrita. */
export function linkWhatsApp(telefone: string | null | undefined, texto?: string): string {
  let d = somenteDigitos(telefone);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  const base = d ? `https://wa.me/${d}` : "https://wa.me/";
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

export function formatarPercentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/** Monta a mensagem de cobrança trocando {nome}, {vencimento}, {so_juros}, {quitar}, {pix}, {empresa}. */
export function preencherModelo(modelo: string, valores: Record<string, string>): string {
  return modelo
    .replace(/\{(\w+)\}/g, (_, chave: string) => valores[chave] ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
