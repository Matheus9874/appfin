import { describe, expect, it } from "vitest";
import { classificarDespesasPorFatia } from "./monthlyPlanActuals";

describe("classificarDespesasPorFatia", () => {
  it("soma despesas de transação fixa em essencial", () => {
    const resultado = classificarDespesasPorFatia([
      { valor: 100, transferenciaInterna: false, categoryNome: "Moradia", natureza: "FIXO" },
      { valor: 50, transferenciaInterna: false, categoryNome: "Internet", natureza: "FIXO" },
    ]);
    expect(resultado.essencial).toBe(150);
    expect(resultado.pessoal).toBe(0);
  });

  it("soma despesas sem natureza FIXO em pessoal, incluindo não classificadas", () => {
    const resultado = classificarDespesasPorFatia([
      { valor: 80, transferenciaInterna: false, categoryNome: "Restaurantes", natureza: "VARIAVEL" },
      { valor: 20, transferenciaInterna: false, categoryNome: "Diversos", natureza: null },
    ]);
    expect(resultado.pessoal).toBe(100);
    expect(resultado.essencial).toBe(0);
  });

  it("ignora transferência interna que não é categoria de investimento", () => {
    const resultado = classificarDespesasPorFatia([
      { valor: 500, transferenciaInterna: true, categoryNome: "Pagamento de cartão de crédito", natureza: null },
    ]);
    expect(resultado.essencial).toBe(0);
    expect(resultado.pessoal).toBe(0);
    expect(resultado.investimentoTransacoes).toBe(0);
  });

  it("conta transferência interna em categoria de investimento à parte", () => {
    const resultado = classificarDespesasPorFatia([
      { valor: 1000, transferenciaInterna: true, categoryNome: "Investimentos", natureza: null },
      { valor: 300, transferenciaInterna: true, categoryNome: "Renda fixa", natureza: null },
    ]);
    expect(resultado.investimentoTransacoes).toBe(1300);
    expect(resultado.essencial).toBe(0);
    expect(resultado.pessoal).toBe(0);
  });
});
