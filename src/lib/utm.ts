// Rastreamento dos anúncios: guarda as UTMs da URL de chegada para enviar junto com o pedido.

export const CAMPOS_UTM = ["utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term", "fbclid"] as const;
export type CampoUtm = (typeof CAMPOS_UTM)[number];
export type Utms = Partial<Record<CampoUtm, string>>;

const CHAVE = "primecred:utm";
const VALIDADE_MS = 30 * 86_400_000;

/** Lê as UTMs da URL atual. Se houver, guarda no navegador (vale por 30 dias; o último anúncio clicado vence). */
export function capturarUtms(): void {
  try {
    const url = new URLSearchParams(window.location.search);
    const achadas: Utms = {};
    for (const c of CAMPOS_UTM) {
      const v = url.get(c)?.trim();
      if (v) achadas[c] = v.slice(0, 300);
    }
    if (Object.keys(achadas).length) localStorage.setItem(CHAVE, JSON.stringify({ em: Date.now(), utms: achadas }));
  } catch {
    // Navegador sem armazenamento: segue sem rastreio.
  }
}

/** UTMs guardadas (ou as da URL atual, se o armazenamento falhar). */
export function lerUtms(): Utms {
  capturarUtms();
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as { em: number; utms: Utms } | null;
    if (salvo && Date.now() - salvo.em < VALIDADE_MS) return salvo.utms;
  } catch {
    // ignora
  }
  return {};
}

/** Limpa e limita as UTMs recebidas do navegador antes de gravar. */
export function limparUtms(u: Utms | undefined): Utms {
  const r: Utms = {};
  if (!u || typeof u !== "object") return r;
  for (const c of CAMPOS_UTM) {
    const v = u[c];
    if (typeof v === "string" && v.trim()) r[c] = v.trim().slice(0, 300);
  }
  return r;
}

/** Separa "nome|id" (formato usado nos parâmetros da Meta). */
export function separarNomeId(valor: string | null | undefined): { nome: string; id: string | null } | null {
  if (!valor) return null;
  const i = valor.lastIndexOf("|");
  if (i < 0) return { nome: valor, id: null };
  return { nome: valor.slice(0, i) || "—", id: valor.slice(i + 1) || null };
}
