// Regras de cálculo dos empréstimos. Funções puras: nada aqui acessa banco ou relógio.
// Valores em centavos (inteiros) e datas como "YYYY-MM-DD" (dia civil em Brasília).
import { adicionarDias, diferencaDias, maiorData } from "@/lib/datas";

export type StatusEmprestimo = "ativo" | "quitado" | "cancelado";

export type EstadoEmprestimo = {
  principalCentavos: number;
  taxaPercent: number;
  prazoDias: number;
  diariaCentavos: number;
  /** Vencimento do ciclo atual. */
  vencimento: string;
  /** Diárias de atraso já cobradas até esta data (inclusive). */
  diariasPagasAte: string | null;
  /** Soma dos pagamentos parciais do ciclo atual que ainda não completaram diárias + juros. */
  pagoCicloCentavos: number;
  status: StatusEmprestimo;
  quitadoEm: string | null;
};

export type Situacao = {
  diasAtraso: number;
  diariasCentavos: number;
  jurosCentavos: number;
  /** Valor para pagar só diárias + juros e renovar. */
  soJurosCentavos: number;
  /** Valor para quitar tudo hoje. */
  quitarCentavos: number;
  vencido: boolean;
  venceHoje: boolean;
  diasParaVencer: number;
};

export type TipoPagamento = "parcial" | "juros" | "amortizacao" | "quitacao";

export type ResultadoPagamento = {
  tipo: TipoPagamento;
  diariasCentavos: number;
  jurosCentavos: number;
  principalCentavos: number;
  estado: EstadoEmprestimo;
};

export function novoEmprestimo(p: {
  principalCentavos: number;
  taxaPercent: number;
  prazoDias: number;
  diariaCentavos: number;
  dataInicio: string;
}): EstadoEmprestimo {
  return {
    principalCentavos: p.principalCentavos,
    taxaPercent: p.taxaPercent,
    prazoDias: p.prazoDias,
    diariaCentavos: p.diariaCentavos,
    vencimento: adicionarDias(p.dataInicio, p.prazoDias),
    diariasPagasAte: null,
    pagoCicloCentavos: 0,
    status: "ativo",
    quitadoEm: null,
  };
}

export function calcularJuros(principalCentavos: number, taxaPercent: number): number {
  return Math.round((principalCentavos * taxaPercent) / 100);
}

export function situacao(e: EstadoEmprestimo, hoje: string): Situacao {
  const diasParaVencer = diferencaDias(hoje, e.vencimento);
  if (e.status !== "ativo") {
    return {
      diasAtraso: 0,
      diariasCentavos: 0,
      jurosCentavos: 0,
      soJurosCentavos: 0,
      quitarCentavos: 0,
      vencido: false,
      venceHoje: false,
      diasParaVencer,
    };
  }
  const inicioAtraso = e.diariasPagasAte ? maiorData(e.vencimento, e.diariasPagasAte) : e.vencimento;
  const diasAtraso = Math.max(0, diferencaDias(inicioAtraso, hoje));
  const diariasCentavos = diasAtraso * e.diariaCentavos;
  const jurosCentavos = calcularJuros(e.principalCentavos, e.taxaPercent);
  const soJurosCentavos = Math.max(0, diariasCentavos + jurosCentavos - e.pagoCicloCentavos);
  return {
    diasAtraso,
    diariasCentavos,
    jurosCentavos,
    soJurosCentavos,
    quitarCentavos: soJurosCentavos + e.principalCentavos,
    vencido: diasParaVencer < 0,
    venceHoje: diasParaVencer === 0,
    diasParaVencer,
  };
}

export function aplicarPagamento(
  e: EstadoEmprestimo,
  valorCentavos: number,
  data: string,
): ResultadoPagamento {
  if (e.status !== "ativo") throw new Error("Empréstimo já quitado ou cancelado.");
  if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }
  const s = situacao(e, data);
  if (valorCentavos > s.quitarCentavos) {
    throw new Error(`Valor maior que o necessário para quitar (${s.quitarCentavos} centavos).`);
  }

  // O que já foi pago no ciclo cobriu primeiro as diárias, depois os juros.
  const diariasRestantes = Math.max(0, s.diariasCentavos - e.pagoCicloCentavos);
  const jurosRestantes = s.soJurosCentavos - diariasRestantes;

  const diarias = Math.min(valorCentavos, diariasRestantes);
  const juros = Math.min(valorCentavos - diarias, jurosRestantes);
  const principal = valorCentavos - diarias - juros;

  if (diarias + juros < s.soJurosCentavos) {
    return {
      tipo: "parcial",
      diariasCentavos: diarias,
      jurosCentavos: juros,
      principalCentavos: 0,
      estado: { ...e, pagoCicloCentavos: e.pagoCicloCentavos + valorCentavos },
    };
  }

  const principalRestante = e.principalCentavos - principal;
  if (principalRestante === 0) {
    return {
      tipo: "quitacao",
      diariasCentavos: diarias,
      jurosCentavos: juros,
      principalCentavos: principal,
      estado: {
        ...e,
        principalCentavos: 0,
        pagoCicloCentavos: 0,
        diariasPagasAte: data,
        status: "quitado",
        quitadoEm: data,
      },
    };
  }

  return {
    tipo: principal > 0 ? "amortizacao" : "juros",
    diariasCentavos: diarias,
    jurosCentavos: juros,
    principalCentavos: principal,
    estado: {
      ...e,
      principalCentavos: principalRestante,
      pagoCicloCentavos: 0,
      // Renovação segue o calendário original; as diárias até hoje já foram cobradas.
      vencimento: adicionarDias(e.vencimento, e.prazoDias),
      diariasPagasAte: data,
    },
  };
}
