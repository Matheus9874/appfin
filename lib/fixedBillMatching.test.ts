import { describe, expect, it } from "vitest";
import { buscarCorrespondencias, normalizarDescricao } from "./fixedBillMatching";

describe("buscarCorrespondencias — só por valor (sem identidade aprendida)", () => {
  it("resolves a single obvious match", () => {
    const resultado = buscarCorrespondencias(
      [{ id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: [], documentosAprendidos: [] }],
      [
        { id: "t1", valor: 1250, descricaoNormalizada: "irrelevante", documento: null },
        { id: "t2", valor: 50, descricaoNormalizada: "irrelevante", documento: null },
      ],
    );
    expect(resultado.get("aluguel")).toEqual({
      tipo: "AUTOMATICO",
      transactionId: "t1",
    });
  });

  it("reports NENHUM when no transaction falls in range", () => {
    const resultado = buscarCorrespondencias(
      [{ id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: [], documentosAprendidos: [] }],
      [{ id: "t1", valor: 50, descricaoNormalizada: "irrelevante", documento: null }],
    );
    expect(resultado.get("aluguel")).toEqual({ tipo: "NENHUM" });
  });

  it("reports AMBIGUO with all candidates when two transactions fit the same bill", () => {
    const resultado = buscarCorrespondencias(
      [{ id: "aluguel", valorMin: 1200, valorMax: 1300, textosAprendidos: [], documentosAprendidos: [] }],
      [
        { id: "t1", valor: 1210, descricaoNormalizada: "irrelevante", documento: null },
        { id: "t2", valor: 1290, descricaoNormalizada: "irrelevante", documento: null },
      ],
    );
    expect(resultado.get("aluguel")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [
        { id: "t1", valor: 1210, descricaoNormalizada: "irrelevante", documento: null },
        { id: "t2", valor: 1290, descricaoNormalizada: "irrelevante", documento: null },
      ],
    });
  });

  it("leaves both bills AMBIGUO when their overlapping ranges share the only transaction that fits (user's example: 1100-1150 and 1120-1180, one transaction at 1130)", () => {
    const resultado = buscarCorrespondencias(
      [
        { id: "parcelaCarro", valorMin: 1100, valorMax: 1150, textosAprendidos: [], documentosAprendidos: [] },
        { id: "outraParcela", valorMin: 1120, valorMax: 1180, textosAprendidos: [], documentosAprendidos: [] },
      ],
      [{ id: "t1", valor: 1130, descricaoNormalizada: "irrelevante", documento: null }],
    );
    expect(resultado.get("parcelaCarro")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [{ id: "t1", valor: 1130, descricaoNormalizada: "irrelevante", documento: null }],
    });
    expect(resultado.get("outraParcela")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [{ id: "t1", valor: 1130, descricaoNormalizada: "irrelevante", documento: null }],
    });
  });

  it("resolves overlapping ranges automatically when the real transactions are distinguishable (a second pass unblocks the first bill)", () => {
    const resultado = buscarCorrespondencias(
      [
        { id: "parcelaCarro", valorMin: 1100, valorMax: 1150, textosAprendidos: [], documentosAprendidos: [] },
        { id: "outraParcela", valorMin: 1120, valorMax: 1180, textosAprendidos: [], documentosAprendidos: [] },
      ],
      [
        { id: "t1105", valor: 1105, descricaoNormalizada: "irrelevante", documento: null },
        { id: "t1130", valor: 1130, descricaoNormalizada: "irrelevante", documento: null },
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
        { id: "a", valorMin: 100, valorMax: 200, textosAprendidos: [], documentosAprendidos: [] },
        { id: "b", valorMin: 100, valorMax: 200, textosAprendidos: [], documentosAprendidos: [] },
      ],
      [{ id: "t1", valor: 150, descricaoNormalizada: "irrelevante", documento: null }],
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
        {
          id: "aluguel",
          valorMin: 1200,
          valorMax: 1300,
          textosAprendidos: ["imobiliaria xyz"],
          documentosAprendidos: [],
        },
        { id: "outraConta", valorMin: 1200, valorMax: 1300, textosAprendidos: [], documentosAprendidos: [] },
      ],
      [
        { id: "t1", valor: 1250, descricaoNormalizada: "imobiliaria xyz", documento: null },
        { id: "t2", valor: 1260, descricaoNormalizada: "outra coisa qualquer", documento: null },
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
      [
        {
          id: "aluguel",
          valorMin: 1200,
          valorMax: 1300,
          textosAprendidos: ["imobiliaria xyz"],
          documentosAprendidos: [],
        },
      ],
      [{ id: "t1", valor: 1250, descricaoNormalizada: "um texto totalmente diferente", documento: null }],
    );
    expect(resultado.get("aluguel")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [
        { id: "t1", valor: 1250, descricaoNormalizada: "um texto totalmente diferente", documento: null },
      ],
    });
  });

  it("surfaces a text-only match (value out of range) for confirmation instead of ignoring it", () => {
    const resultado = buscarCorrespondencias(
      [
        {
          id: "aluguel",
          valorMin: 1200,
          valorMax: 1300,
          textosAprendidos: ["imobiliaria xyz"],
          documentosAprendidos: [],
        },
      ],
      [{ id: "t1", valor: 1450, descricaoNormalizada: "imobiliaria xyz", documento: null }],
    );
    expect(resultado.get("aluguel")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [{ id: "t1", valor: 1450, descricaoNormalizada: "imobiliaria xyz", documento: null }],
    });
  });

  it("reports NENHUM when neither value nor text match", () => {
    const resultado = buscarCorrespondencias(
      [
        {
          id: "aluguel",
          valorMin: 1200,
          valorMax: 1300,
          textosAprendidos: ["imobiliaria xyz"],
          documentosAprendidos: [],
        },
      ],
      [{ id: "t1", valor: 50, descricaoNormalizada: "outra coisa", documento: null }],
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
          documentosAprendidos: [],
        },
      ],
      [{ id: "t1", valor: 1150, descricaoNormalizada: "pagamento boleto bco bradesco", documento: null }],
    );
    expect(resultado.get("parcelaCarro")).toEqual({
      tipo: "AUTOMATICO",
      transactionId: "t1",
    });
  });
});

describe("buscarCorrespondencias — com documento (CPF/CNPJ) aprendido", () => {
  // Caso real: o mesmo banco cobra a parcela do financiamento por débito
  // direto num mês ("BANCO BRADESCO FINANCIAMENTOS SA") e por boleto no
  // outro ("Pagamento Boleto BCO BRADESCO S.A.") — textos bem diferentes,
  // mas o CNPJ do recebedor é o mesmo nos dois. O documento resolve sem
  // precisar aprender os dois formatos de texto separadamente.
  it("auto-resolves via matching document even with a completely different description text", () => {
    const resultado = buscarCorrespondencias(
      [
        {
          id: "parcelaCarro",
          valorMin: 1068.75,
          valorMax: 1181.25,
          textosAprendidos: ["banco bradesco financiamentos sa"],
          documentosAprendidos: ["07207996000150"],
        },
      ],
      [
        {
          id: "t1",
          valor: 1149.89,
          descricaoNormalizada: "pagamento boleto bco bradesco s a",
          documento: "07207996000150",
        },
      ],
    );
    expect(resultado.get("parcelaCarro")).toEqual({
      tipo: "AUTOMATICO",
      transactionId: "t1",
    });
  });

  it("does not match on document when the transaction's document is different, even if the text happens to be similar", () => {
    const resultado = buscarCorrespondencias(
      [
        {
          id: "parcelaCarro",
          valorMin: 1000,
          valorMax: 1200,
          textosAprendidos: [],
          documentosAprendidos: ["11111111000111"],
        },
      ],
      [{ id: "t1", valor: 1100, descricaoNormalizada: "outra empresa", documento: "22222222000122" }],
    );
    expect(resultado.get("parcelaCarro")).toEqual({
      tipo: "AMBIGUO",
      candidatos: [{ id: "t1", valor: 1100, descricaoNormalizada: "outra empresa", documento: "22222222000122" }],
    });
  });

  it("falls back to text when the transaction has no document available", () => {
    const resultado = buscarCorrespondencias(
      [
        {
          id: "aluguel",
          valorMin: 1200,
          valorMax: 1300,
          textosAprendidos: ["imobiliaria xyz"],
          documentosAprendidos: ["99999999000199"],
        },
      ],
      [{ id: "t1", valor: 1250, descricaoNormalizada: "imobiliaria xyz", documento: null }],
    );
    expect(resultado.get("aluguel")).toEqual({
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
