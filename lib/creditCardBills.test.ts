import { describe, expect, it } from "vitest";
import { agruparGastosCartaoPorMes } from "./creditCardBills";

describe("agruparGastosCartaoPorMes", () => {
  it("sums transactions within the same month", () => {
    const meses = [new Date(2026, 7, 1)];
    const transacoes = [
      { valor: 100, data: new Date(2026, 7, 5) },
      { valor: 50, data: new Date(2026, 7, 20) },
    ];
    const resultado = agruparGastosCartaoPorMes(transacoes, meses);
    expect(resultado).toEqual([
      { mesKey: "2026-7", label: expect.any(String), valor: 150 },
    ]);
  });

  it("returns 0 for months with no transactions", () => {
    const meses = [new Date(2026, 6, 1), new Date(2026, 7, 1)];
    const transacoes = [{ valor: 100, data: new Date(2026, 7, 5) }];
    const resultado = agruparGastosCartaoPorMes(transacoes, meses);
    expect(resultado[0].valor).toBe(0);
    expect(resultado[1].valor).toBe(100);
  });

  it("keeps requested month order", () => {
    const meses = [
      new Date(2026, 5, 1),
      new Date(2026, 6, 1),
      new Date(2026, 7, 1),
    ];
    const resultado = agruparGastosCartaoPorMes([], meses);
    expect(resultado.map((r) => r.mesKey)).toEqual([
      "2026-5",
      "2026-6",
      "2026-7",
    ]);
  });
});
