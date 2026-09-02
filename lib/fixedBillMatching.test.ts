import { describe, expect, it } from "vitest";
import { buscarCorrespondencias, normalizarDescricao } from "./fixedBillMatching";

describe("buscarCorrespondencias — só por valor (sem padrão aprendido)", () => {
  it("resolves a single obvious match", () => {
    const resultado = buscarCorrespondencias(
      [{ id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: [] }],
      [
        { id: "t1", valor: 1250, descricaoNormalizada: "irrelevante" },
        { id: "t2", valor: 50, descricaoNormalizada: "irrelevante" },
      ],
    );
    expect(resultado.get("aluguel")).toEqual({
      tipo: "AUTOMATICO",
      transactionId: "t1",
    });
  });

  it("reports NENHUM when no transaction falls in range", () => {
    const resultado = buscarCorrespondencias(
      [{ id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: [] }],
      [{ id: "t1", valor: 50, descricaoNormalizada: "irrelevante" }],
    );
    expect(resultado.get("aluguel")).toEqual({ tipo: "NENHUM" });
  });

  it("reports AMBIGUO with all candidates when two transactions fit the same bill", () => {
    const resultado = buscarCorrespondencias(
      [{ id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: [] }],
      [
        { id: "t1", valor: 1210, descricaoNormalizada: "irrelevante" },
        { id: "t2", valor: 1290, descricaoNormalizada: "irrelevante" },
      ],
    );
    expect(resultado.get("aluguel")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [
        { id: "t1", valor: 1210, descricaoNormalizada: "irrelevante" },
        { id: "t2", valor: 1290, descricaoNormalizada: "irrelevante" },
      ],
    });
  });

  it("leaves both bills AMBIGUO when their overlapping ranges share the only transaction that fits (user's example: 1100-1150 and 1120-1180, one transaction at 1130)", () => {
    const resultado = buscarCorrespondencias(
      [
        { id: "parcelaCarro", valorMin: 1100, valorMax: 1150, textosAprendidos: [] },
        { id: "outraParcela", valorMin: 1120, valorMax: 1180, textosAprendidos: [] },
      ],
      [{ id: "t1", valor: 1130, descricaoNormalizada: "irrelevante" }],
    );
    expect(resultado.get("parcelaCarro")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [{ id: "t1", valor: 1130, descricaoNormalizada: "irrelevante" }],
    });
    expect(resultado.get("outraParcela")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [{ id: "t1", valor: 1130, descricaoNormalizada: "irrelevante" }],
    });
  });

  it("resolves overlapping ranges automatically when the real transactions are distinguishable (a second pass unblocks the first bill)", () => {
    const resultado = buscarCorrespondencias(
      [
        { id: "parcelaCarro", valorMin: 1100, valorMax: 1150, textosAprendidos: [] },
        { id: "outraParcela", valorMin: 1120, valorMax: 1180, textosAprendidos: [] },
      ],
      [
        { id: "t1105", valor: 1105, descricaoNormalizada: "irrelevante" },
        { id: "t1130", valor: 1130, descricaoNormalizada: "irrelevante" },
      ],
    );
    expect(resultado.get("outraParcela")).toEqual({
      tipo: "AUTOMATICO",
      transactionId: "t1130",
    });
    expect(resultado.get("parcelaCarro")).toEqual({
      tipo: "AUTOMATICO",
      transactionId: "t1105",
    });
  });

  it("does not let two bills claim the same transaction", () => {
    const resultado = buscarCorrespondencias(
      [
        { id: "a", valorMin: 100, valorMax: 200, textosAprendidos: [] },
        { id: "b", valorMin: 100, valorMax: 200, textosAprendidos: [] },
      ],
      [{ id: "t1", valor: 150, descricaoNormalizada: "irrelevante" }],
    );
    const a = resultado.get("a")!;
    const b = resultado.get("b")!;
    expect(a.tipo === "AUTOMATICO" && b.tipo === "AUTOMATICO").toBe(false);
  });
});

describe("buscarCorrespondencias — com padrão de texto aprendido", () => {
  it("auto-resolves when both value and learned text match, even amid a value-only ambiguity for another bill", () => {
    const resultado = buscarCorrespondencias(
      [
        { id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: ["imobiliaria xyz"] },
        { id: "outraConta", valorMin: 1200, valorMax: 1300, textosAprendidos: [] },
      ],
      [
        { id: "t1", valor: 1250, descricaoNormalizada: "imobiliaria xyz" },
        { id: "t2", valor: 1260, descricaoNormalizada: "outra coisa qualquer" },
      ],
    );
    // "aluguel" tem um padrão de texto: mesmo com 2 valores na faixa (1250
    // e 1260), o match forte (valor + texto) já resolve na fase 0.
    expect(resultado.get("aluguel")).toEqual({
      tipo: "AUTOMATICO",
      transactionId: "t1",
    });
  });

  it("does NOT auto-resolve on value alone once a text pattern is learned, even with a unique value match (needs confirmation)", () => {
    const resultado = buscarCorrespondencias(
      [{ id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: ["imobiliaria xyz"] }],
      [{ id: "t1", valor: 1250, descricaoNormalizada: "um texto totalmente diferente" }],
    );
    expect(resultado.get("aluguel")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [
        { id: "t1", valor: 1250, descricaoNormalizada: "um texto totalmente diferente" },
      ],
    });
  });

  it("surfaces a text-only match (value out of range) for confirmation instead of ignoring it", () => {
    const resultado = buscarCorrespondencias(
      [{ id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: ["imobiliaria xyz"] }],
      [{ id: "t1", valor: 1450, descricaoNormalizada: "imobiliaria xyz" }],
    );
    expect(resultado.get("aluguel")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [{ id: "t1", valor: 1450, descricaoNormalizada: "imobiliaria xyz" }],
    });
  });

  it("reports NENHUM when neither value nor text match", () => {
    const resultado = buscarCorrespondencias(
      [{ id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: ["imobiliaria xyz"] }],
      [{ id: "t1", valor: 50, descricaoNormalizada: "outra coisa" }],
    );
    expect(resultado.get("aluguel")).toEqual({ tipo: "NENHUM" });
  });

  // Um mesmo estabelecimento pode cobrar em mais de um formato de texto
  // (ex.: débito direto vs. boleto do mesmo banco) — qualquer padrão já
  // aprendido deve auto-resolver, não só o mais recente.
  it("auto-resolves on any of multiple learned patterns for the same bill", () => {
    const resultado = buscarCorrespondencias(
      [
        {
          id: "parcelaCarro",
          valorMin: 1000,
          valorMax: 1200,
          textosAprendidos: ["banco bradesco financiamentos sa", "pagamento boleto bco bradesco"],
        },
      ],
      [{ id: "t1", valor: 1150, descricaoNormalizada: "pagamento boleto bco bradesco" }],
    );
    expect(resultado.get("parcelaCarro")).toEqual({
      tipo: "AUTOMATICO",
      transactionId: "t1",
    });
  });
});

describe("normalizarDescricao", () => {
  it("removes accents, digits, punctuation and a trailing country suffix", () => {
    expect(normalizarDescricao("PHARMA P F MANIPULACAO JARAGUA DO SU BRA")).toBe(
      "pharma p f manipulacao jaragua do su",
    );
  });

  it("keeps the same key for the same merchant across months", () => {
    const a = normalizarDescricao("ALAN VITOR DA COSTA EGEIA");
    const b = normalizarDescricao("ALAN VITOR DA COSTA EGEIA");
    expect(a).toBe(b);
  });

  // A normalização não pode depender do estado de um usuário específico —
  // precisa reconhecer qualquer UF brasileira, já que a aplicação atende
  // usuários de qualquer lugar do país (não só de Santa Catarina).
  it("strips a trailing UF for any Brazilian state, not just one", () => {
    expect(normalizarDescricao("MERCADO XYZ CURITIBA PR")).toBe("mercado xyz curitiba");
    expect(normalizarDescricao("FARMACIA ABC RECIFE PE")).toBe("farmacia abc recife");
    expect(normalizarDescricao("LOJA QUALQUER JOINVILLE SC")).toBe("loja qualquer joinville");
  });
});
