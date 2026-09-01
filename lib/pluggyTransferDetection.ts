/**
 * Detecta transações do Pluggy que são, na verdade, movimentação de dinheiro
 * do próprio usuário entre suas contas/ativos — não receita/despesa real:
 *
 * 1. Pagamento de fatura de cartão de crédito: dinheiro sai da conta
 *    corrente e "entra" no cartão para quitar o que já foi gasto ali. Sem
 *    isso, a mesma compra é contada duas vezes (uma quando o cartão foi
 *    usado, outra quando a fatura foi paga).
 * 2. Aporte/resgate de investimento (principal): dinheiro sai da conta
 *    corrente para uma aplicação (ou volta dela) — não é consumo, é troca
 *    de "bolso".
 *
 * Baseado nos `categoryId` oficiais do Pluggy (taxonomia própria deles, não
 * texto/descrição, que varia por banco e idioma) — mas com cuidado: alguns
 * desses ids são categorias "guarda-chuva" largas demais para confiar
 * sozinhas, então cada uma tem uma condição extra que fecha o buraco
 * encontrado ao investigar dados reais (ver comentários abaixo).
 */

/** "Credit card payment" — categoria específica só usada para quitação de fatura, nos dois sentidos (saída da conta corrente ou entrada no cartão). Nenhuma compra real observada usando esta categoria. */
const CATEGORY_ID_PAGAMENTO_CARTAO = "05100000";

/**
 * "Transfers" — genérica demais para confiar sozinha: uma compra real no
 * cartão (ex.: assinatura cobrada no exterior) pode cair aqui por
 * categorização imprecisa do Pluggy, e toda transação de cartão (compra OU
 * pagamento) tem `creditCardMetadata` preenchido — não é um sinal exclusivo
 * de pagamento. Só é seguro combinado com `type === "CREDIT"`: toda compra
 * no cartão é sempre "DEBIT" (aumenta o que você deve); só pagamentos e
 * estornos reduzem o saldo devedor ("CREDIT").
 */
const CATEGORY_ID_TRANSFERENCIAS = "05000000";

/**
 * Subcategorias de "Investments" que representam movimentação de
 * principal (aporte ou resgate) — dinheiro trocando de "bolso", não
 * consumo nem ganho. Deliberadamente NÃO inclui "03060000" (Proceeds
 * interests and dividends): juros e dividendos são ganho real, devem
 * continuar contando como receita. "03050000" (Margin) e "03070000"
 * (Pension) também ficam de fora por falta de exemplos reais para validar.
 */
const CATEGORY_IDS_MOVIMENTACAO_PRINCIPAL_INVESTIMENTO = new Set([
  "03000000", // Investments (genérico)
  "03010000", // Automatic investment
  "03020000", // Fixed income (compra/venda de renda fixa)
  "03030000", // Mutual funds
  "03040000", // Variable income (compra/venda de ações etc.)
]);

export type PluggyTransactionSignal = {
  type: "DEBIT" | "CREDIT";
  categoryId: string | null;
  creditCardMetadata: unknown | null;
};

/**
 * Sinal primário — não depende de encontrar a outra ponta da transferência,
 * já é confiável sozinho (vem da própria classificação oficial do Pluggy).
 * Cobre os dois lados do pagamento: a saída da conta corrente e a entrada
 * no cartão.
 */
export function ehPagamentoDeFaturaCartao(t: PluggyTransactionSignal): boolean {
  if (t.categoryId === CATEGORY_ID_PAGAMENTO_CARTAO) return true;
  if (
    t.type === "CREDIT" &&
    t.categoryId === CATEGORY_ID_TRANSFERENCIAS &&
    t.creditCardMetadata != null
  ) {
    return true;
  }
  return false;
}

/** Sinal primário para aporte/resgate de investimento — mesma lógica. */
export function ehMovimentacaoDeInvestimento(t: {
  categoryId: string | null;
}): boolean {
  return (
    t.categoryId !== null &&
    CATEGORY_IDS_MOVIMENTACAO_PRINCIPAL_INVESTIMENTO.has(t.categoryId)
  );
}

export type CandidataSaida = { id: string; valor: number; data: Date };
export type EntradaConfirmada = { valor: number; data: Date };

/**
 * Sinal secundário: casa cada "entrada" já confirmada como pagamento de
 * fatura (sinal primário, sempre `type === "CREDIT"`) com a saída da conta
 * corrente correspondente — mesmo valor (±1 centavo) e até `maxDiffDias` de
 * diferença. Pareamento guloso 1:1 (cada saída é usada no máximo uma vez),
 * sempre com a saída de data mais próxima. Sem sinal próprio confiável do
 * lado da saída (a categoria que o Pluggy dá — "Empréstimos",
 * "Transferências" — também cobre casos reais), então só entra aqui quem
 * realmente casar com uma entrada já confirmada; nada é marcado "no escuro".
 */
export function parearSaidasComPagamentoFatura(
  entradas: EntradaConfirmada[],
  saidas: CandidataSaida[],
  maxDiffDias = 2,
): string[] {
  const usadas = new Set<number>();
  const pareados: string[] = [];

  for (const entrada of entradas) {
    let melhorIndice = -1;
    let melhorDiff = Infinity;

    saidas.forEach((saida, indice) => {
      if (usadas.has(indice)) return;
      if (Math.abs(saida.valor - entrada.valor) > 0.01) return;
      const diffDias =
        Math.abs(saida.data.getTime() - entrada.data.getTime()) /
        (1000 * 60 * 60 * 24);
      if (diffDias > maxDiffDias) return;
      if (diffDias < melhorDiff) {
        melhorDiff = diffDias;
        melhorIndice = indice;
      }
    });

    if (melhorIndice !== -1) {
      usadas.add(melhorIndice);
      pareados.push(saidas[melhorIndice].id);
    }
  }

  return pareados;
}
