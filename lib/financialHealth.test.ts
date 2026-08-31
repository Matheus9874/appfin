import { describe, expect, it } from "vitest";
import { calcularSaudeFinanceira } from "./financialHealth";

describe("calcularSaudeFinanceira", () => {
  it("calcula os percentuais de despesas fixas e variáveis sobre a renda média", () => {
    const saude = calcularSaudeFinanceira({
      rendaMedia: 5000,
      despesaMedia: 4000,
      despesaFixaMedia: 2000,
      despesaVariavelMedia: 2000,
      reservaEmergencia: 12000,
    });

    expect(saude.percentualDespesasFixas).toBeCloseTo(40, 5);
    expect(saude.percentualDespesasVariaveis).toBeCloseTo(40, 5);
  });

  it("calcula quantos meses de despesas a reserva de emergência cobre", () => {
    const saude = calcularSaudeFinanceira({
      rendaMedia: 5000,
      despesaMedia: 4000,
      despesaFixaMedia: 2000,
      despesaVariavelMedia: 2000,
      reservaEmergencia: 12000,
    });

    expect(saude.mesesReservaEmergencia).toBeCloseTo(3, 5);
  });

  it("retorna null para meses de reserva quando não há despesa média (sem histórico)", () => {
    const saude = calcularSaudeFinanceira({
      rendaMedia: 0,
      despesaMedia: 0,
      despesaFixaMedia: 0,
      despesaVariavelMedia: 0,
      reservaEmergencia: 1000,
    });

    expect(saude.mesesReservaEmergencia).toBeNull();
  });

  it("alerta quando despesas fixas ultrapassam 60% da renda", () => {
    const saude = calcularSaudeFinanceira({
      rendaMedia: 5000,
      despesaMedia: 4000,
      despesaFixaMedia: 3100, // 62%
      despesaVariavelMedia: 900,
      reservaEmergencia: 20000,
    });

    expect(saude.percentualDespesasFixas).toBeCloseTo(62, 5);
    expect(saude.mensagens).toContainEqual({
      texto: "Suas despesas fixas estão consumindo uma parte grande da sua renda.",
      tipo: "alerta",
    });
  });

  it("não alerta despesas fixas exatamente em 60%", () => {
    const saude = calcularSaudeFinanceira({
      rendaMedia: 5000,
      despesaMedia: 4000,
      despesaFixaMedia: 3000, // 60%
      despesaVariavelMedia: 1000,
      reservaEmergencia: 20000,
    });

    expect(saude.mensagens).not.toContainEqual(
      expect.objectContaining({
        texto: "Suas despesas fixas estão consumindo uma parte grande da sua renda.",
      }),
    );
  });

  it("alerta quando a reserva de emergência cobre menos de 3 meses", () => {
    const saude = calcularSaudeFinanceira({
      rendaMedia: 5000,
      despesaMedia: 4000,
      despesaFixaMedia: 2000,
      despesaVariavelMedia: 2000,
      reservaEmergencia: 4000, // 1 mês
    });

    expect(saude.mensagens).toContainEqual({
      texto:
        "Sua reserva de emergência está abaixo do recomendado (3 a 6 meses de despesas).",
      tipo: "alerta",
    });
  });

  it("pode disparar os dois alertas ao mesmo tempo", () => {
    const saude = calcularSaudeFinanceira({
      rendaMedia: 5000,
      despesaMedia: 4000,
      despesaFixaMedia: 3500, // 70%
      despesaVariavelMedia: 500,
      reservaEmergencia: 2000, // 0,5 mês
    });

    expect(saude.mensagens).toHaveLength(2);
  });

  it("mostra mensagem positiva quando não há nenhum alerta", () => {
    const saude = calcularSaudeFinanceira({
      rendaMedia: 5000,
      despesaMedia: 3000,
      despesaFixaMedia: 1500, // 30%
      despesaVariavelMedia: 1500,
      reservaEmergencia: 18000, // 6 meses
    });

    expect(saude.mensagens).toEqual([
      {
        texto:
          "Sua situação financeira está equilibrada: despesas fixas sob controle e reserva de emergência dentro do recomendado.",
        tipo: "positiva",
      },
    ]);
  });

  it("não divide por renda zero", () => {
    const saude = calcularSaudeFinanceira({
      rendaMedia: 0,
      despesaMedia: 1000,
      despesaFixaMedia: 500,
      despesaVariavelMedia: 500,
      reservaEmergencia: 1000,
    });

    expect(saude.percentualDespesasFixas).toBe(0);
    expect(saude.percentualDespesasVariaveis).toBe(0);
  });
});
