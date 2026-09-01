import { describe, expect, it } from "vitest";
import { paraCsv } from "./csvExport";

describe("paraCsv", () => {
  it("joins fields with semicolons and rows with CRLF", () => {
    const csv = paraCsv(
      ["Data", "Valor"],
      [
        ["01/08/2026", "100,00"],
        ["02/08/2026", "50,00"],
      ],
    );
    expect(csv).toContain("Data;Valor\r\n01/08/2026;100,00\r\n02/08/2026;50,00");
  });

  it("starts with a UTF-8 BOM", () => {
    const csv = paraCsv(["A"], [["1"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("quotes fields containing the delimiter", () => {
    const csv = paraCsv(["Descrição"], [["Mercado; Padaria"]]);
    expect(csv).toContain('"Mercado; Padaria"');
  });

  it("escapes embedded quotes by doubling them", () => {
    const csv = paraCsv(["Descrição"], [['Diz "oi"']]);
    expect(csv).toContain('"Diz ""oi"""');
  });

  it("leaves plain fields unquoted", () => {
    const csv = paraCsv(["Categoria"], [["Alimentação"]]);
    expect(csv).toContain("\r\nAlimentação");
    expect(csv).not.toContain('"Alimentação"');
  });
});
