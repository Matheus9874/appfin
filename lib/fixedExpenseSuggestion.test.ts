import { describe, expect, it } from "vitest";
import {
  calcularCoeficienteVariacao,
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

describe("sugerirNatureza", () => {
  it("suggests VARIAVEL with fewer than 2 months of spending", () => {
    expect(sugerirNatureza([100])).toBe("VARIAVEL");
    expect(sugerirNatureza([])).toBe("VARIAVEL");
  });

  it("suggests FIXO for the same value across 3 months (ex.: Pix do Alan)", () => {
    expect(sugerirNatureza([55, 55, 55])).toBe("FIXO");
  });

  it("suggests FIXO within the 15% tolerance", () => {
    expect(sugerirNatureza([100, 108, 95])).toBe("FIXO");
  });

  it("suggests VARIAVEL outside the 15% tolerance (ex.: Uber, restaurante)", () => {
    expect(sugerirNatureza([100, 200, 150])).toBe("VARIAVEL");
  });

  it("suggests FIXO with only 2 consistent months", () => {
    expect(sugerirNatureza([93.44, 90.99])).toBe("FIXO");
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
