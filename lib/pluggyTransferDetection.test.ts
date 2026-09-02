import { describe, expect, it } from "vitest";
import {
  ehCategoriaDeTransferencia,
  ehMovimentacaoDeInvestimento,
  ehPagamentoDeFaturaCartao,
  ehTransferenciaParaPessoaFisica,
  parearSaidasComPagamentoFatura,
} from "./pluggyTransferDetection";

describe("ehCategoriaDeTransferencia", () => {
  it("is true for any category under the Transfers tree (prefix 05)", () => {
    expect(ehCategoriaDeTransferencia("05000000")).toBe(true);
    expect(ehCategoriaDeTransferencia("05100000")).toBe(true);
    expect(ehCategoriaDeTransferencia("05010000")).toBe(true);
  });

  it("is false for unrelated categories, including a Pix sent to a person that should not be conflated with a purchase category", () => {
    expect(ehCategoriaDeTransferencia("11010000")).toBe(false); // Eating out
    expect(ehCategoriaDeTransferencia("06000000")).toBe(false); // Health
    expect(ehCategoriaDeTransferencia(null)).toBe(false);
  });
});

describe("ehTransferenciaParaPessoaFisica", () => {
  // Dado real de produção: um Pix DEBIT pra uma pessoa física veio com
  // categoryId "200300000" ("Health insurance") do Pluggy — categoria
  // completamente sem relação, só porque o classificador deles não tem
  // sinal forte pra pagamento entre pessoas físicas.
  it("is true for an outgoing Pix to an individual (CPF receiver), regardless of the (unreliable) category Pluggy assigned", () => {
    expect(
      ehTransferenciaParaPessoaFisica({
        type: "DEBIT",
        operationType: "PIX",
        paymentData: {
          receiver: { documentNumber: { type: "CPF" } },
        },
      }),
    ).toBe(true);
  });

  it("is true for an incoming Pix from an individual (CPF payer)", () => {
    expect(
      ehTransferenciaParaPessoaFisica({
        type: "CREDIT",
        operationType: "PIX",
        paymentData: {
          payer: { documentNumber: { type: "CPF" } },
        },
      }),
    ).toBe(true);
  });

  it("is false for a real purchase from a business (CNPJ receiver)", () => {
    expect(
      ehTransferenciaParaPessoaFisica({
        type: "DEBIT",
        operationType: "PIX",
        paymentData: {
          receiver: { documentNumber: { type: "CNPJ" } },
        },
      }),
    ).toBe(false);
  });

  it("is false for a transfer between the user's own accounts (same CPF on both sides — Pluggy already classifies this reliably as 'Same person transfer')", () => {
    expect(
      ehTransferenciaParaPessoaFisica({
        type: "DEBIT",
        operationType: "PIX",
        paymentData: {
          payer: { documentNumber: { type: "CPF", value: "095.714.469-55" } },
          receiver: { documentNumber: { type: "CPF", value: "095.714.469-55" } },
        },
      }),
    ).toBe(false);
  });

  it("is false when there's no payment data or document type at all", () => {
    expect(ehTransferenciaParaPessoaFisica({ type: "DEBIT", operationType: "PIX" })).toBe(
      false,
    );
    expect(
      ehTransferenciaParaPessoaFisica({
        type: "DEBIT",
        operationType: "PIX",
        paymentData: { receiver: {} },
      }),
    ).toBe(false);
  });

  it("is false for operation types that aren't a direct transfer", () => {
    expect(
      ehTransferenciaParaPessoaFisica({
        type: "DEBIT",
        operationType: "CARTAO",
        paymentData: { receiver: { documentNumber: { type: "CPF" } } },
      }),
    ).toBe(false);
  });
});

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
