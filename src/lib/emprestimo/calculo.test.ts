import { describe, expect, it } from "vitest";
import {
  aplicarPagamento,
  novoEmprestimo,
  situacao,
  type EstadoEmprestimo,
} from "./calculo";

// R$ 1.000 a 40%, 30 dias, diária R$ 30, emprestado em 01/01/2026 → vence 31/01/2026
const base = (): EstadoEmprestimo =>
  novoEmprestimo({
    principalCentavos: 100_000,
    taxaPercent: 40,
    prazoDias: 30,
    diariaCentavos: 3_000,
    dataInicio: "2026-01-01",
  });

describe("novoEmprestimo", () => {
  it("vence após o prazo a partir da data de início", () => {
    const e = base();
    expect(e.vencimento).toBe("2026-01-31");
    expect(e.principalCentavos).toBe(100_000);
    expect(e.pagoCicloCentavos).toBe(0);
    expect(e.status).toBe("ativo");
  });
});

describe("situacao", () => {
  it("antes do vencimento: só juros R$ 400, quitar R$ 1.400", () => {
    const s = situacao(base(), "2026-01-15");
    expect(s.diasAtraso).toBe(0);
    expect(s.diariasCentavos).toBe(0);
    expect(s.jurosCentavos).toBe(40_000);
    expect(s.soJurosCentavos).toBe(40_000);
    expect(s.quitarCentavos).toBe(140_000);
    expect(s.vencido).toBe(false);
  });

  it("no dia do vencimento não cobra diária", () => {
    const s = situacao(base(), "2026-01-31");
    expect(s.diasAtraso).toBe(0);
    expect(s.soJurosCentavos).toBe(40_000);
    expect(s.venceHoje).toBe(true);
  });

  it("1 dia de atraso: R$ 430 / R$ 1.430", () => {
    const s = situacao(base(), "2026-02-01");
    expect(s.diasAtraso).toBe(1);
    expect(s.soJurosCentavos).toBe(43_000);
    expect(s.quitarCentavos).toBe(143_000);
    expect(s.vencido).toBe(true);
  });

  it("5 dias de atraso: R$ 550 / R$ 1.550", () => {
    const s = situacao(base(), "2026-02-05");
    expect(s.soJurosCentavos).toBe(55_000);
    expect(s.quitarCentavos).toBe(155_000);
  });

  it("empréstimo quitado não deve nada", () => {
    const { estado } = aplicarPagamento(base(), 140_000, "2026-01-31");
    const s = situacao(estado, "2026-03-01");
    expect(s.soJurosCentavos).toBe(0);
    expect(s.quitarCentavos).toBe(0);
    expect(s.diasAtraso).toBe(0);
  });
});

describe("aplicarPagamento", () => {
  it("pagando só os juros renova 30 dias sobre o vencimento original, mesmo principal", () => {
    const r = aplicarPagamento(base(), 40_000, "2026-01-31");
    expect(r.tipo).toBe("juros");
    expect(r.jurosCentavos).toBe(40_000);
    expect(r.principalCentavos).toBe(0);
    expect(r.estado.principalCentavos).toBe(100_000);
    expect(r.estado.vencimento).toBe("2026-03-02");
    expect(r.estado.pagoCicloCentavos).toBe(0);
    expect(situacao(r.estado, "2026-03-02").soJurosCentavos).toBe(40_000);
  });

  it("pagando atrasado (R$ 430) quita diária + juros e renova sem empurrar o calendário", () => {
    const r = aplicarPagamento(base(), 43_000, "2026-02-01");
    expect(r.diariasCentavos).toBe(3_000);
    expect(r.jurosCentavos).toBe(40_000);
    expect(r.estado.vencimento).toBe("2026-03-02");
    expect(situacao(r.estado, "2026-02-10").soJurosCentavos).toBe(40_000);
  });

  it("excedente abate o principal: paga R$ 700 → principal R$ 700 e próximos juros R$ 280", () => {
    const r = aplicarPagamento(base(), 70_000, "2026-01-31");
    expect(r.tipo).toBe("amortizacao");
    expect(r.jurosCentavos).toBe(40_000);
    expect(r.principalCentavos).toBe(30_000);
    expect(r.estado.principalCentavos).toBe(70_000);
    const s = situacao(r.estado, "2026-03-02");
    expect(s.jurosCentavos).toBe(28_000);
    expect(s.quitarCentavos).toBe(98_000);
  });

  it("exemplo completo: atraso, amortização e quitação", () => {
    let e = base();
    e = aplicarPagamento(e, 43_000, "2026-02-01").estado; // 1 dia atrasado
    e = aplicarPagamento(e, 70_000, "2026-03-02").estado; // abate 300
    const s = situacao(e, "2026-04-01");
    expect(s.quitarCentavos).toBe(98_000);
    const r = aplicarPagamento(e, 98_000, "2026-04-01");
    expect(r.tipo).toBe("quitacao");
    expect(r.estado.status).toBe("quitado");
    expect(r.estado.principalCentavos).toBe(0);
    expect(r.estado.quitadoEm).toBe("2026-04-01");
  });

  it("pagamento menor que diárias + juros fica parcial e não renova", () => {
    const r = aplicarPagamento(base(), 20_000, "2026-02-01");
    expect(r.tipo).toBe("parcial");
    expect(r.diariasCentavos).toBe(3_000);
    expect(r.jurosCentavos).toBe(17_000);
    expect(r.estado.vencimento).toBe("2026-01-31");
    expect(r.estado.pagoCicloCentavos).toBe(20_000);
    // dois dias depois: 3 diárias (90) + 400 − 200 pagos = 290
    expect(situacao(r.estado, "2026-02-03").soJurosCentavos).toBe(29_000);
  });

  it("parciais somados completam o ciclo e renovam", () => {
    const e = aplicarPagamento(base(), 20_000, "2026-01-31").estado;
    const r = aplicarPagamento(e, 20_000, "2026-01-31");
    expect(r.tipo).toBe("juros");
    expect(r.estado.vencimento).toBe("2026-03-02");
    expect(r.estado.pagoCicloCentavos).toBe(0);
  });

  it("parcial seguido de pagamento com excedente abate o principal só com o que sobra", () => {
    const e = aplicarPagamento(base(), 10_000, "2026-01-31").estado;
    const r = aplicarPagamento(e, 50_000, "2026-01-31");
    expect(r.jurosCentavos).toBe(30_000);
    expect(r.principalCentavos).toBe(20_000);
    expect(r.estado.principalCentavos).toBe(80_000);
  });

  it("atraso maior que um ciclo: diárias contam uma vez e o ciclo seguinte já está vencido", () => {
    // vencia 31/01, paga em 07/03 (35 dias de atraso) → 35 × 30 + 400 = 1.450
    const antes = situacao(base(), "2026-03-07");
    expect(antes.soJurosCentavos).toBe(145_000);
    const r = aplicarPagamento(base(), 145_000, "2026-03-07");
    expect(r.estado.vencimento).toBe("2026-03-02");
    const s = situacao(r.estado, "2026-03-07");
    expect(s.vencido).toBe(true);
    expect(s.diasAtraso).toBe(0); // diárias até 07/03 já pagas
    expect(s.soJurosCentavos).toBe(40_000);
    expect(situacao(r.estado, "2026-03-08").soJurosCentavos).toBe(43_000);
  });

  it("pagamento antecipado dos juros também renova", () => {
    const r = aplicarPagamento(base(), 40_000, "2026-01-10");
    expect(r.estado.vencimento).toBe("2026-03-02");
    expect(situacao(r.estado, "2026-03-02").diasAtraso).toBe(0);
  });

  it("rejeita valor acima do necessário para quitar", () => {
    expect(() => aplicarPagamento(base(), 140_001, "2026-01-31")).toThrow(/quitar/);
  });

  it("rejeita valor zero ou negativo", () => {
    expect(() => aplicarPagamento(base(), 0, "2026-01-31")).toThrow();
    expect(() => aplicarPagamento(base(), -1, "2026-01-31")).toThrow();
  });

  it("rejeita pagamento em empréstimo quitado", () => {
    const { estado } = aplicarPagamento(base(), 140_000, "2026-01-31");
    expect(() => aplicarPagamento(estado, 100, "2026-02-01")).toThrow(/quitado/);
  });

  it("arredonda juros ao centavo", () => {
    const e = novoEmprestimo({
      principalCentavos: 33_333,
      taxaPercent: 40,
      prazoDias: 30,
      diariaCentavos: 0,
      dataInicio: "2026-01-01",
    });
    expect(situacao(e, "2026-01-01").jurosCentavos).toBe(13_333);
  });
});
