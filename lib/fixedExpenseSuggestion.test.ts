import { describe, expect, it } from "vitest";
import {
  calcularCoeficienteVariacao,
  ehCategoriaNuncaFixa,
  normalizarDescricao,
  sugerirNatureza,
} from "./fixedExpenseSuggestion";

describe("calcularCoeficienteVariacao", () => {
  it("is zero for identical values", () => {
    expect(calcularCoeficienteVariacao([100, 100, 100])).toBe(0);
  });

  it("is high for wildly different values", () => {
    expect(calcularCoeficienteVariacao([10, 500])).toBeGreaterThan(0.5);
  });

  it("is Infinity when the average is zero or negative", () => {
    expect(calcularCoeficienteVariacao([0, 0])).toBe(Infinity);
  });
});

describe("ehCategoriaNuncaFixa", () => {
  it("blocks food and pharmacy categories regardless of spelling/accents", () => {
    expect(ehCategoriaNuncaFixa("Restaurantes, bares e lanchonetes")).toBe(true);
    expect(ehCategoriaNuncaFixa("Supermercado")).toBe(true);
    expect(ehCategoriaNuncaFixa("Farmácia")).toBe(true);
    expect(ehCategoriaNuncaFixa("farmacia")).toBe(true);
  });

  it("allows other categories", () => {
    expect(ehCategoriaNuncaFixa("Telecomunicação")).toBe(false);
    expect(ehCategoriaNuncaFixa("Moradia")).toBe(false);
  });
});

describe("sugerirNatureza", () => {
  it("suggests VARIAVEL with fewer than 2 months of spending", () => {
    expect(sugerirNatureza([100], "Telecomunicação")).toBe("VARIAVEL");
    expect(sugerirNatureza([], "Telecomunicação")).toBe("VARIAVEL");
  });

  it("suggests FIXO for the same value across 3 months (ex.: Pix do Alan)", () => {
    expect(sugerirNatureza([55, 55, 55], "Transferência - PIX")).toBe("FIXO");
  });

  it("suggests FIXO within the 15% tolerance", () => {
    expect(sugerirNatureza([100, 108, 95], "Telecomunicação")).toBe("FIXO");
  });

  it("suggests VARIAVEL outside the 15% tolerance (ex.: Uber)", () => {
    expect(sugerirNatureza([100, 200, 150], "Táxi e transporte privado urbano")).toBe(
      "VARIAVEL",
    );
  });

  it("suggests FIXO with only 2 consistent months", () => {
    expect(sugerirNatureza([93.44, 90.99], "Telecomunicação")).toBe("FIXO");
  });

  it("never suggests FIXO for food or pharmacy, even with identical values", () => {
    expect(sugerirNatureza([50, 50, 50], "Restaurantes, bares e lanchonetes")).toBe(
      "VARIAVEL",
    );
    expect(sugerirNatureza([102.99, 102.99, 102.99], "Farmácia")).toBe("VARIAVEL");
    expect(sugerirNatureza([200, 200, 200], "Supermercado")).toBe("VARIAVEL");
  });
});

describe("normalizarDescricao", () => {
  it("removes accents, digits, punctuation and a trailing city/state suffix", () => {
    expect(normalizarDescricao("PHARMA P F MANIPULACAO JARAGUA DO SU BRA")).toBe(
      "pharma p f manipulacao jaragua do su",
    );
  });

  it("keeps the same key for the same merchant across months", () => {
    const a = normalizarDescricao("ALAN VITOR DA COSTA EGEIA");
    const b = normalizarDescricao("ALAN VITOR DA COSTA EGEIA");
    expect(a).toBe(b);
  });
});
