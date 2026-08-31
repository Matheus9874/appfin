import { describe, expect, it } from "vitest";
import {
  calcularFinanciamento,
  calcularImpactoMetas,
  calcularImpactoOrcamento,
  classificarComprometimento,
  simularCompraFinanciamento,
  taxaMensalEquivalente,
} from "./purchaseFinancing";

describe("taxaMensalEquivalente", () => {
  it("retorna a própria taxa quando já é mensal", () => {
    expect(taxaMensalEquivalente(2, "mensal")).toBeCloseTo(0.02);
  });

  it("converte taxa anual para mensal equivalente (juros compostos)", () => {
    // 12,6825% a.a. equivale a ~1% a.m.
    expect(taxaMensalEquivalente(12.6825, "anual")).toBeCloseTo(0.01, 3);
  });

  it("nunca retorna taxa negativa", () => {
    expect(taxaMensalEquivalente(-5, "mensal")).toBe(0);
  });
});

describe("calcularFinanciamento", () => {
  it("calcula parcela pelo sistema Price com juros (exemplo clássico)", () => {
    const resultado = calcularFinanciamento({
      valorCompra: 10000,
      entrada: 0,
      parcelas: 12,
      taxaJuros: 1,
      tipoTaxa: "mensal",
    });

    expect(resultado.valorFinanciado).toBe(10000);
    expect(resultado.valorParcela).toBeCloseTo(888.49, 1);
    expect(resultado.totalPago).toBeCloseTo(10661.85, 1);
    expect(resultado.totalJuros).toBeCloseTo(661.85, 1);
  });

  it("divide igualmente quando a taxa de juros é zero", () => {
    const resultado = calcularFinanciamento({
      valorCompra: 1200,
      entrada: 200,
      parcelas: 10,
      taxaJuros: 0,
      tipoTaxa: "mensal",
    });

    expect(resultado.valorFinanciado).toBe(1000);
    expect(resultado.valorParcela).toBe(100);
    expect(resultado.totalJuros).toBe(0);
  });

  it("soma custos adicionais ao valor financiado", () => {
    const resultado = calcularFinanciamento({
      valorCompra: 1000,
      entrada: 0,
      parcelas: 1,
      taxaJuros: 0,
      tipoTaxa: "mensal",
      custosAdicionais: 150,
    });

    expect(resultado.valorFinanciado).toBe(1150);
    expect(resultado.valorParcela).toBe(1150);
  });

  it("não financia valor negativo quando a entrada cobre a compra inteira", () => {
    const resultado = calcularFinanciamento({
      valorCompra: 1000,
      entrada: 1500,
      parcelas: 12,
      taxaJuros: 2,
      tipoTaxa: "mensal",
    });

    expect(resultado.valorFinanciado).toBe(0);
    expect(resultado.valorParcela).toBe(0);
    expect(resultado.totalPago).toBe(0);
    expect(resultado.totalJuros).toBe(0);
  });

  it("nunca usa menos de 1 parcela", () => {
    const resultado = calcularFinanciamento({
      valorCompra: 500,
      entrada: 0,
      parcelas: 0,
      taxaJuros: 0,
      tipoTaxa: "mensal",
    });

    expect(resultado.valorParcela).toBe(500);
  });
});

describe("calcularImpactoOrcamento", () => {
  it("calcula comprometimento, sobra e capacidade de poupança antes e depois", () => {
    const impacto = calcularImpactoOrcamento({
      rendaMensal: 9000,
      despesasAtuais: 3780, // 42%
      valorParcela: 1170, // total despesas após = 4950 = 55%
    });

    expect(impacto.comprometimentoAtual).toBeCloseTo(42, 5);
    expect(impacto.comprometimentoApos).toBeCloseTo(55, 5);
    expect(impacto.sobraAtual).toBeCloseTo(5220, 5);
    expect(impacto.sobraApos).toBeCloseTo(4050, 5);
    expect(impacto.capacidadePoupancaAtual).toBeCloseTo(58, 5);
    expect(impacto.capacidadePoupancaApos).toBeCloseTo(45, 5);
  });

  it("evita divisão por zero quando não há renda cadastrada", () => {
    const impacto = calcularImpactoOrcamento({
      rendaMensal: 0,
      despesasAtuais: 500,
      valorParcela: 100,
    });

    expect(impacto.comprometimentoAtual).toBe(0);
    expect(impacto.comprometimentoApos).toBe(0);
    expect(impacto.capacidadePoupancaAtual).toBe(0);
  });
});

describe("classificarComprometimento", () => {
  it("classifica como confortável até 30%", () => {
    expect(classificarComprometimento(0)).toBe("confortavel");
    expect(classificarComprometimento(30)).toBe("confortavel");
  });

  it("classifica como moderado entre 30% e 50%", () => {
    expect(classificarComprometimento(30.01)).toBe("moderado");
    expect(classificarComprometimento(50)).toBe("moderado");
  });

  it("classifica como alto acima de 50%", () => {
    expect(classificarComprometimento(50.01)).toBe("alto");
    expect(classificarComprometimento(90)).toBe("alto");
  });
});

describe("calcularImpactoMetas", () => {
  it("não aponta risco quando não há metas com aporte necessário", () => {
    const impacto = calcularImpactoMetas({ sobraApos: 100, aportesNecessarios: 0 });
    expect(impacto.metasEmRisco).toBe(false);
    expect(impacto.deficit).toBe(0);
  });

  it("não aponta risco quando a sobra cobre os aportes necessários", () => {
    const impacto = calcularImpactoMetas({ sobraApos: 500, aportesNecessarios: 300 });
    expect(impacto.metasEmRisco).toBe(false);
    expect(impacto.deficit).toBe(0);
  });

  it("aponta risco e calcula o déficit quando a sobra não cobre os aportes", () => {
    const impacto = calcularImpactoMetas({ sobraApos: 200, aportesNecessarios: 300 });
    expect(impacto.metasEmRisco).toBe(true);
    expect(impacto.deficit).toBe(100);
  });
});

describe("simularCompraFinanciamento", () => {
  it("combina financiamento, orçamento e classificação em um resultado só", () => {
    const resultado = simularCompraFinanciamento({
      dadosCompra: {
        valorCompra: 10000,
        entrada: 0,
        parcelas: 12,
        taxaJuros: 1,
        tipoTaxa: "mensal",
      },
      rendaMensal: 9000,
      despesasAtuais: 3000,
      aportesNecessariosMetas: 200,
    });

    expect(resultado.financiamento.valorParcela).toBeCloseTo(888.49, 1);
    expect(resultado.orcamento.despesasApos).toBeCloseTo(3888.49, 1);
    // 3888.49 / 9000 ≈ 43,2% -> acima dos 30% do limite "confortável"
    expect(resultado.classificacao).toBe("moderado");
    expect(resultado.metas.metasEmRisco).toBe(false);
  });
});
