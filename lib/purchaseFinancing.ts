export type TipoTaxa = "mensal" | "anual";

export type DadosCompra = {
  valorCompra: number;
  entrada: number;
  parcelas: number;
  taxaJuros: number;
  tipoTaxa: TipoTaxa;
  custosAdicionais?: number;
};

export type ResultadoFinanciamento = {
  valorFinanciado: number;
  valorParcela: number;
  totalPago: number;
  totalJuros: number;
};

/** Converte uma taxa (mensal ou anual) para a taxa mensal equivalente, em fração (não %). */
export function taxaMensalEquivalente(
  taxaJuros: number,
  tipoTaxa: TipoTaxa,
): number {
  const taxa = Math.max(0, taxaJuros) / 100;
  if (tipoTaxa === "mensal") return taxa;
  return Math.pow(1 + taxa, 1 / 12) - 1;
}

/**
 * Financiamento pelo sistema de amortização Price (parcelas fixas).
 * Custos adicionais (documentação, seguros, taxas) entram no valor financiado.
 */
export function calcularFinanciamento(
  dados: DadosCompra,
): ResultadoFinanciamento {
  const custosAdicionais = Math.max(0, dados.custosAdicionais ?? 0);
  const valorFinanciado =
    Math.max(0, dados.valorCompra - dados.entrada) + custosAdicionais;
  const parcelas = Math.max(1, Math.round(dados.parcelas));

  if (valorFinanciado === 0) {
    return { valorFinanciado: 0, valorParcela: 0, totalPago: 0, totalJuros: 0 };
  }

  const i = taxaMensalEquivalente(dados.taxaJuros, dados.tipoTaxa);
  const valorParcela =
    i === 0
      ? valorFinanciado / parcelas
      : (valorFinanciado * i) / (1 - Math.pow(1 + i, -parcelas));

  const totalPago = valorParcela * parcelas;
  const totalJuros = totalPago - valorFinanciado;

  return { valorFinanciado, valorParcela, totalPago, totalJuros };
}

export type ImpactoOrcamento = {
  despesasAtuais: number;
  despesasApos: number;
  comprometimentoAtual: number;
  comprometimentoApos: number;
  sobraAtual: number;
  sobraApos: number;
  capacidadePoupancaAtual: number;
  capacidadePoupancaApos: number;
};

/** Compara o orçamento mensal atual com o orçamento após assumir a parcela simulada. */
export function calcularImpactoOrcamento({
  rendaMensal,
  despesasAtuais,
  valorParcela,
}: {
  rendaMensal: number;
  despesasAtuais: number;
  valorParcela: number;
}): ImpactoOrcamento {
  const renda = Math.max(0, rendaMensal);
  const despesas = Math.max(0, despesasAtuais);
  const despesasApos = despesas + Math.max(0, valorParcela);

  const sobraAtual = renda - despesas;
  const sobraApos = renda - despesasApos;

  const pct = (valor: number) => (renda > 0 ? (valor / renda) * 100 : 0);

  return {
    despesasAtuais: despesas,
    despesasApos,
    comprometimentoAtual: pct(despesas),
    comprometimentoApos: pct(despesasApos),
    sobraAtual,
    sobraApos,
    capacidadePoupancaAtual: pct(sobraAtual),
    capacidadePoupancaApos: pct(sobraApos),
  };
}

export type Classificacao = "confortavel" | "moderado" | "alto";

/** Limites de comprometimento de renda (despesas totais / renda) após a compra. */
export const LIMITE_CONFORTAVEL = 30;
export const LIMITE_MODERADO = 50;

export function classificarComprometimento(
  comprometimentoApos: number,
): Classificacao {
  if (comprometimentoApos <= LIMITE_CONFORTAVEL) return "confortavel";
  if (comprometimentoApos <= LIMITE_MODERADO) return "moderado";
  return "alto";
}

export type ImpactoMetas = {
  aportesNecessarios: number;
  metasEmRisco: boolean;
  deficit: number;
};

/** Verifica se a sobra mensal pós-compra ainda cobre os aportes que as metas atuais exigem. */
export function calcularImpactoMetas({
  sobraApos,
  aportesNecessarios,
}: {
  sobraApos: number;
  aportesNecessarios: number;
}): ImpactoMetas {
  const necessario = Math.max(0, aportesNecessarios);
  const deficit = Math.max(0, necessario - sobraApos);
  return {
    aportesNecessarios: necessario,
    metasEmRisco: necessario > 0 && deficit > 0,
    deficit,
  };
}

export type SimulacaoCompra = {
  financiamento: ResultadoFinanciamento;
  orcamento: ImpactoOrcamento;
  classificacao: Classificacao;
  metas: ImpactoMetas;
};

export function simularCompraFinanciamento({
  dadosCompra,
  rendaMensal,
  despesasAtuais,
  aportesNecessariosMetas,
}: {
  dadosCompra: DadosCompra;
  rendaMensal: number;
  despesasAtuais: number;
  aportesNecessariosMetas: number;
}): SimulacaoCompra {
  const financiamento = calcularFinanciamento(dadosCompra);
  const orcamento = calcularImpactoOrcamento({
    rendaMensal,
    despesasAtuais,
    valorParcela: financiamento.valorParcela,
  });
  const classificacao = classificarComprometimento(orcamento.comprometimentoApos);
  const metas = calcularImpactoMetas({
    sobraApos: orcamento.sobraApos,
    aportesNecessarios: aportesNecessariosMetas,
  });

  return { financiamento, orcamento, classificacao, metas };
}
