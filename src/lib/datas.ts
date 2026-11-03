// Datas civis ("YYYY-MM-DD") sem hora. A aritmética é feita em UTC para não sofrer com fuso/horário de verão.
const MS_DIA = 86_400_000;
export const FUSO = "America/Sao_Paulo";

function paraUtc(data: string): number {
  const [a, m, d] = data.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

function deUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function adicionarDias(data: string, dias: number): string {
  return deUtc(paraUtc(data) + dias * MS_DIA);
}

/** Quantos dias de `de` até `ate` (positivo se `ate` é depois). */
export function diferencaDias(de: string, ate: string): number {
  return Math.round((paraUtc(ate) - paraUtc(de)) / MS_DIA);
}

export function maiorData(a: string, b: string): string {
  return a >= b ? a : b;
}

/** Data de hoje no horário de Brasília. */
export function hojeBrasilia(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

export function formatarData(data: string | null | undefined): string {
  if (!data) return "—";
  const [a, m, d] = data.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** O instante ISO já passou? */
export function jaPassou(iso: string, agora: Date = new Date()): boolean {
  return new Date(iso).getTime() < agora.getTime();
}

/** Instante ISO de `minutos` atrás (para filtrar registros recentes). */
export function minutosAtras(minutos: number, agora: Date = new Date()): string {
  return new Date(agora.getTime() - minutos * 60_000).toISOString();
}

export function inicioDoMes(data: string): string {
  return `${data.slice(0, 7)}-01`;
}
