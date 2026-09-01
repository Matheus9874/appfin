import { describe, expect, it } from "vitest";
import {
  ehMovimentacaoDeInvestimento,
  ehPagamentoDeFaturaCartao,
  parearSaidasComPagamentoFatura,
} from "./pluggyTransferDetection";

describe("ehPagamentoDeFaturaCartao", () => {
  it("is true for the official 'Credit card payment' category, on the card side (CREDIT)", () => {
    expect(
      ehPagamentoDeFaturaCartao({
        type: "CREDIT",
        categoryId: "05100000",
        creditCardMetadata: null,
      }),
    ).toBe(true);
  });

  it("is true for 'Credit card payment' on the checking-account side too (DEBIT)", () => {
    // Real example found in production data: "DEBITO DE CARTAO" on the bank
    // account, DEBIT direction, categoryId 05100000 — the outgoing leg of
    // paying the card bill from the checking account.
    expect(
      ehPagamentoDeFaturaCartao({
        type: "DEBIT",
        categoryId: "05100000",
        creditCardMetadata: null,
      }),
    ).toBe(true);
  });

  it("is true for 'Transfers' + creditCardMetadata only when type is CREDIT (a payment/refund reducing what's owed)", () => {
    expect(
      ehPagamentoDeFaturaCartao({
        type: "CREDIT",
        categoryId: "05000000",
        creditCardMetadata: { cardNumber: "1234" },
      }),
    ).toBe(true);
  });

  it("is false for 'Transfers' + creditCardMetadata when type is DEBIT — a real purchase", () => {
    // Real example found in production data: "ANTHROPIC* CLAUDE SUB", a
    // genuine subscription charge, categorized by Pluggy as "Transfers"
    // (05000000) with creditCardMetadata present (as ALL card transactions
    // have, purchases included) and type DEBIT. Must stay a real expense.
    expect(
      ehPagamentoDeFaturaCartao({
        type: "DEBIT",
        categoryId: "05000000",
        creditCardMetadata: { cardNumber: "1234", installmentNumber: 1 },
      }),
    ).toBe(false);
  });

  it("is false for 'Transfers' category without creditCardMetadata (a real transfer)", () => {
    expect(
      ehPagamentoDeFaturaCartao({
        type: "DEBIT",
        categoryId: "05000000",
        creditCardMetadata: null,
      }),
    ).toBe(false);
  });

  it("is false for unrelated categories", () => {
    expect(
      ehPagamentoDeFaturaCartao({
        type: "DEBIT",
        categoryId: "02040000",
        creditCardMetadata: null,
      }),
    ).toBe(false);
  });

  it("is false for null categoryId", () => {
    expect(
      ehPagamentoDeFaturaCartao({
        type: "DEBIT",
        categoryId: null,
        creditCardMetadata: null,
      }),
    ).toBe(false);
  });
});

describe("ehMovimentacaoDeInvestimento", () => {
  it("is true for principal-movement subcategories (aporte/resgate)", () => {
    expect(ehMovimentacaoDeInvestimento({ categoryId: "03000000" })).toBe(true); // Investments
    expect(ehMovimentacaoDeInvestimento({ categoryId: "03010000" })).toBe(true); // Automatic investment
    expect(ehMovimentacaoDeInvestimento({ categoryId: "03020000" })).toBe(true); // Fixed income
    expect(ehMovimentacaoDeInvestimento({ categoryId: "03030000" })).toBe(true); // Mutual funds
    expect(ehMovimentacaoDeInvestimento({ categoryId: "03040000" })).toBe(true); // Variable income
  });

  it("is false for interest/dividends — real income, not a self-transfer", () => {
    expect(ehMovimentacaoDeInvestimento({ categoryId: "03060000" })).toBe(false);
  });

  it("is false for margin and pension (no real examples to validate against)", () => {
    expect(ehMovimentacaoDeInvestimento({ categoryId: "03050000" })).toBe(false);
    expect(ehMovimentacaoDeInvestimento({ categoryId: "03070000" })).toBe(false);
  });

  it("is false for other categories", () => {
    expect(ehMovimentacaoDeInvestimento({ categoryId: "05100000" })).toBe(false);
    expect(ehMovimentacaoDeInvestimento({ categoryId: null })).toBe(false);
  });
});

describe("parearSaidasComPagamentoFatura", () => {
  it("matches a same-day, same-value pair", () => {
    const entradas = [{ valor: 100, data: new Date("2026-08-10") }];
    const saidas = [{ id: "a", valor: 100, data: new Date("2026-08-10") }];
    expect(parearSaidasComPagamentoFatura(entradas, saidas)).toEqual(["a"]);
  });

  it("matches within maxDiffDias but not beyond it", () => {
    const entradas = [{ valor: 50, data: new Date("2026-08-10") }];
    const saidasDentro = [{ id: "a", valor: 50, data: new Date("2026-08-11") }];
    expect(parearSaidasComPagamentoFatura(entradas, saidasDentro, 2)).toEqual(["a"]);

    const saidasFora = [{ id: "b", valor: 50, data: new Date("2026-08-13") }];
    expect(parearSaidasComPagamentoFatura(entradas, saidasFora, 2)).toEqual([]);
  });

  it("does not match on value mismatch", () => {
    const entradas = [{ valor: 100, data: new Date("2026-08-10") }];
    const saidas = [{ id: "a", valor: 99, data: new Date("2026-08-10") }];
    expect(parearSaidasComPagamentoFatura(entradas, saidas)).toEqual([]);
  });

  it("leaves an entrada unmatched when no compatible saida exists (the orphan case)", () => {
    const entradas = [{ valor: 1836.74, data: new Date("2026-08-05") }];
    const saidas = [{ id: "a", valor: 500, data: new Date("2026-08-05") }];
    expect(parearSaidasComPagamentoFatura(entradas, saidas)).toEqual([]);
  });

  it("does not reuse the same saida for two entradas", () => {
    const entradas = [
      { valor: 100, data: new Date("2026-08-10") },
      { valor: 100, data: new Date("2026-08-11") },
    ];
    const saidas = [{ id: "a", valor: 100, data: new Date("2026-08-10") }];
    expect(parearSaidasComPagamentoFatura(entradas, saidas)).toEqual(["a"]);
  });

  it("picks the closest-date saida when multiple match", () => {
    const entradas = [{ valor: 100, data: new Date("2026-08-10") }];
    const saidas = [
      { id: "longe", valor: 100, data: new Date("2026-08-12") },
      { id: "perto", valor: 100, data: new Date("2026-08-10") },
    ];
    expect(parearSaidasComPagamentoFatura(entradas, saidas)).toEqual(["perto"]);
  });
});
