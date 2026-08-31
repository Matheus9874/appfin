import { describe, expect, it } from "vitest";
import {
  parseNonNegativeNumber,
  parsePositiveNumber,
  parseRequiredDate,
  requireNonEmpty,
} from "./validation";

describe("requireNonEmpty", () => {
  it("returns the trimmed value when present", () => {
    expect(requireNonEmpty("  Mercado  ", "Descrição")).toBe("Mercado");
  });

  it("throws for an empty or whitespace-only value", () => {
    expect(() => requireNonEmpty("", "Descrição")).toThrow(
      "Descrição é obrigatório.",
    );
    expect(() => requireNonEmpty("   ", "Descrição")).toThrow(
      "Descrição é obrigatório.",
    );
  });
});

describe("parsePositiveNumber", () => {
  it("parses a valid positive number", () => {
    expect(parsePositiveNumber("150.50", "Valor")).toBe(150.5);
  });

  it("accepts comma as decimal separator", () => {
    expect(parsePositiveNumber("150,50", "Valor")).toBe(150.5);
  });

  it("rejects empty input", () => {
    expect(() => parsePositiveNumber("", "Valor")).toThrow(
      "Valor é obrigatório.",
    );
  });

  it("rejects non-numeric input", () => {
    expect(() => parsePositiveNumber("abc", "Valor")).toThrow(
      "Valor deve ser um número válido.",
    );
  });

  it("rejects zero", () => {
    expect(() => parsePositiveNumber("0", "Valor")).toThrow(
      "Valor deve ser maior que zero.",
    );
  });

  it("rejects negative numbers", () => {
    expect(() => parsePositiveNumber("-10", "Valor")).toThrow(
      "Valor deve ser maior que zero.",
    );
  });

  it("rejects Infinity and NaN-producing input", () => {
    expect(() => parsePositiveNumber("Infinity", "Valor")).toThrow(
      "Valor deve ser um número válido.",
    );
  });
});

describe("parseNonNegativeNumber", () => {
  it("accepts zero", () => {
    expect(parseNonNegativeNumber("0", "Valor")).toBe(0);
  });

  it("accepts positive numbers", () => {
    expect(parseNonNegativeNumber("42", "Valor")).toBe(42);
  });

  it("rejects negative numbers", () => {
    expect(() => parseNonNegativeNumber("-1", "Valor")).toThrow(
      "Valor não pode ser negativo.",
    );
  });

  it("rejects non-numeric input", () => {
    expect(() => parseNonNegativeNumber("R$ 10", "Valor")).toThrow(
      "Valor deve ser um número válido.",
    );
  });
});

describe("parseRequiredDate", () => {
  it("parses a valid ISO date", () => {
    const date = parseRequiredDate("2026-03-05", "Data");
    expect(date.getUTCFullYear()).toBe(2026);
  });

  it("rejects an empty value", () => {
    expect(() => parseRequiredDate("", "Data")).toThrow("Data é obrigatório.");
  });

  it("rejects an invalid date string", () => {
    expect(() => parseRequiredDate("não é uma data", "Data")).toThrow(
      "Data não é uma data válida.",
    );
  });
});
