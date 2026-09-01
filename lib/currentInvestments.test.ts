import { describe, expect, it } from "vitest";
import { getCurrentInvestments, investmentKey } from "./currentInvestments";

describe("investmentKey", () => {
  it("keys manual investments by tipo+instituicao+nome", () => {
    const inv = { tipo: "CDB", instituicao: "Banco X", nome: "Reserva" } as const;
    expect(investmentKey(inv)).toBe("CDB|Banco X|Reserva");
  });

  it("keys Pluggy investments by pluggyInvestmentId, even with identical tipo/instituicao/nome", () => {
    const a = {
      tipo: "CDB",
      instituicao: "Banco X",
      nome: "CDB",
      origem: "PLUGGY",
      pluggyInvestmentId: "inv-1",
    } as const;
    const b = {
      tipo: "CDB",
      instituicao: "Banco X",
      nome: "CDB",
      origem: "PLUGGY",
      pluggyInvestmentId: "inv-2",
    } as const;
    expect(investmentKey(a)).not.toBe(investmentKey(b));
  });
});

describe("getCurrentInvestments", () => {
  it("does not collapse two distinct Pluggy investments that share tipo/instituicao/nome", () => {
    const investimentos = [
      {
        id: "1",
        tipo: "CDB" as const,
        instituicao: "Banco X",
        nome: "CDB",
        origem: "PLUGGY" as const,
        pluggyInvestmentId: "inv-1",
        valor: 1000,
      },
      {
        id: "2",
        tipo: "CDB" as const,
        instituicao: "Banco X",
        nome: "CDB",
        origem: "PLUGGY" as const,
        pluggyInvestmentId: "inv-2",
        valor: 2000,
      },
    ];
    const resultado = getCurrentInvestments(investimentos);
    expect(resultado).toHaveLength(2);
  });

  it("still collapses manual investments with the same identity to the most recent", () => {
    const investimentos = [
      {
        id: "2",
        tipo: "POUPANCA" as const,
        instituicao: "Banco Y",
        nome: null,
        origem: "MANUAL" as const,
        pluggyInvestmentId: null,
        valor: 200,
      },
      {
        id: "1",
        tipo: "POUPANCA" as const,
        instituicao: "Banco Y",
        nome: null,
        origem: "MANUAL" as const,
        pluggyInvestmentId: null,
        valor: 100,
      },
    ];
    const resultado = getCurrentInvestments(investimentos);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe("2");
  });
});
