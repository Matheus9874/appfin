import { describe, expect, it } from "vitest";
import { resolveInvestmentType } from "./pluggyInvestmentMapping";

describe("resolveInvestmentType", () => {
  it("maps FIXED_INCOME + TREASURY to TESOURO_DIRETO", () => {
    expect(
      resolveInvestmentType({ type: "FIXED_INCOME", subtype: "TREASURY" }),
    ).toBe("TESOURO_DIRETO");
  });

  it("maps FIXED_INCOME + CDB to CDB", () => {
    expect(resolveInvestmentType({ type: "FIXED_INCOME", subtype: "CDB" })).toBe(
      "CDB",
    );
  });

  it("maps other FIXED_INCOME subtypes to OUTRO", () => {
    expect(
      resolveInvestmentType({ type: "FIXED_INCOME", subtype: "LCI" }),
    ).toBe("OUTRO");
  });

  it("maps EQUITY to ACOES", () => {
    expect(resolveInvestmentType({ type: "EQUITY", subtype: "STOCK" })).toBe(
      "ACOES",
    );
  });

  it("maps MUTUAL_FUND to FUNDOS", () => {
    expect(resolveInvestmentType({ type: "MUTUAL_FUND", subtype: null })).toBe(
      "FUNDOS",
    );
  });

  it("maps ETF to FUNDOS", () => {
    expect(resolveInvestmentType({ type: "ETF", subtype: null })).toBe(
      "FUNDOS",
    );
  });

  it("maps SECURITY and COE to OUTRO", () => {
    expect(resolveInvestmentType({ type: "SECURITY", subtype: null })).toBe(
      "OUTRO",
    );
    expect(resolveInvestmentType({ type: "COE", subtype: null })).toBe(
      "OUTRO",
    );
  });

  it("falls back to OUTRO for unknown types", () => {
    expect(resolveInvestmentType({ type: "SOMETHING_NEW" })).toBe("OUTRO");
  });
});
