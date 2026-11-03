import { describe, expect, it } from "vitest";
import { formatarMoeda, lerMoeda, mascaraMoeda, linkWhatsApp, preencherModelo, validarCpf } from "./formato";

describe("validarCpf", () => {
  it("aceita CPF válido com ou sem máscara", () => {
    expect(validarCpf("529.982.247-25")).toBe(true);
    expect(validarCpf("52998224725")).toBe(true);
  });
  it("recusa dígitos verificadores errados, repetidos e tamanho errado", () => {
    expect(validarCpf("529.982.247-24")).toBe(false);
    expect(validarCpf("111.111.111-11")).toBe(false);
    expect(validarCpf("1234")).toBe(false);
  });
});

describe("lerMoeda", () => {
  it("entende formato brasileiro e com ponto decimal", () => {
    expect(lerMoeda("1.000,00")).toBe(100_000);
    expect(lerMoeda("R$ 1.234,56")).toBe(123_456);
    expect(lerMoeda("30")).toBe(3_000);
    expect(lerMoeda("430,5")).toBe(43_050);
    expect(lerMoeda("1234.56")).toBe(123_456);
  });
  it("retorna null para texto inválido", () => {
    expect(lerMoeda("")).toBeNull();
    expect(lerMoeda("abc")).toBeNull();
    expect(lerMoeda("1,2,3")).toBeNull();
  });
});

describe("formatarMoeda", () => {
  it("formata centavos em reais", () => {
    expect(formatarMoeda(143_000).replace(/\s/g, " ")).toBe("R$ 1.430,00");
  });
});

describe("linkWhatsApp", () => {
  it("adiciona o 55 e codifica a mensagem", () => {
    expect(linkWhatsApp("(11) 98888-7777", "Olá, tudo bem?")).toBe(
      "https://wa.me/5511988887777?text=Ol%C3%A1%2C%20tudo%20bem%3F",
    );
  });
});

describe("preencherModelo", () => {
  it("troca as variáveis e remove linhas vazias em excesso", () => {
    expect(preencherModelo("Oi {nome}!\n{pix}\n\n\nFim", { nome: "Ana", pix: "" })).toBe("Oi Ana!\n\nFim");
  });
});

describe("mascaraMoeda", () => {
  it("formata os dígitos como centavos", () => {
    expect(mascaraMoeda("1")).toBe("0,01");
    expect(mascaraMoeda("10000")).toBe("100,00");
    expect(mascaraMoeda("R$ 1.500,00")).toBe("1.500,00");
    expect(mascaraMoeda("")).toBe("");
    expect(lerMoeda(mascaraMoeda("150000"))).toBe(150_000);
  });
});
