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

/**
 * "Credit card payment" — pensada pela Pluggy pra quitação de fatura, mas
 * dado real de produção (setembro/2026) mostrou compras reais no débito
 * também caindo aqui, não só a saída da conta pagando a fatura. Por isso só
 * é confiável sozinha do lado CREDIT (entrada no cartão, ver
 * `ehPagamentoDeFaturaCartao`) — do lado DEBIT precisa casar por
 * valor+data com uma entrada confirmada (sinal secundário, ver
 * `parearSaidasComPagamentoFatura`), senão uma compra de débito qualquer
 * que ganhe essa categoria por engano da Pluggy vira transferência interna
 * silenciosamente.
 */
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
 * Qualquer categoria da árvore "Transfers" do Pluggy (prefixo "05" —
 * pagamento de fatura, Pix/boleto/TED pra terceiro, transferência mesma
 * titularidade etc.), independente de contar ou não como transferência
 * interna (`ehPagamentoDeFaturaCartao`/`ehMovimentacaoDeInvestimento` só
 * cobrem os casos que sabemos excluir das somas). Usado pra decidir onde
 * NÃO aplicar o casador de categoria por palavra-chave (ver
 * lib/pluggySync.ts) — evita juntar uma transferência com uma categoria de
 * consumo só por coincidência de palavra-chave.
 */
export function ehCategoriaDeTransferencia(categoryId: string | null): boolean {
  return categoryId !== null && categoryId.startsWith("05");
}

type PluggyPaymentParticipant = {
  documentNumber?: { type?: "CPF" | "CNPJ" | null; value?: string | null } | null;
};

export type PluggyPixSignal = {
  type: "DEBIT" | "CREDIT";
  operationType?: string | null;
  paymentData?: {
    payer?: PluggyPaymentParticipant | null;
    receiver?: PluggyPaymentParticipant | null;
  } | null;
};

const OPERACOES_TRANSFERENCIA_DIRETA = new Set(["PIX", "TED", "DOC"]);

/** Nome de categoria estável pra usar quando `ehTransferenciaParaPessoaFisica` for verdadeiro. */
export const NOME_CATEGORIA_POR_OPERACAO: Record<string, string> = {
  PIX: "Transferência - PIX",
  TED: "Transferência - TED",
  DOC: "Transferência - DOC",
};

/**
 * Pix/TED/DOC cuja contraparte (quem recebe, se a transação é uma saída;
 * quem envia, se é uma entrada) é identificada por CPF — pessoa física
 * DIFERENTE do próprio usuário — não uma empresa (CNPJ) nem uma
 * transferência entre contas do próprio usuário (mesmo CPF nos dois lados;
 * o Pluggy já classifica isso de forma específica e confiável como "Same
 * person transfer", categoria "04000000" — não mexe nisso).
 *
 * Achado em dado real: o Pluggy classifica pagamento pra outra pessoa
 * física de forma pouco confiável — o mesmo par de pessoas, mesma direção
 * conceitual, teve uma perna (saída) caindo em "Health insurance" e a
 * outra (entrada) em "Transfer - PIX", só porque o modelo de categorização
 * deles não tem sinal forte pra esse caso. Por isso esse sinal ignora
 * inteiramente a categoria que o Pluggy deu e força um nome estável (ver
 * NOME_CATEGORIA_POR_OPERACAO) — vale pra qualquer usuário que mande
 * dinheiro pra outra pessoa física, não só um caso específico.
 */
export function ehTransferenciaParaPessoaFisica(t: PluggyPixSignal): boolean {
  const operacao = t.operationType?.toUpperCase();
  if (!operacao || !OPERACOES_TRANSFERENCIA_DIRETA.has(operacao)) return false;

  const contraparte = t.type === "DEBIT" ? t.paymentData?.receiver : t.paymentData?.payer;
  const proprio = t.type === "DEBIT" ? t.paymentData?.payer : t.paymentData?.receiver;
  if (contraparte?.documentNumber?.type !== "CPF") return false;

  const documentoContraparte = contraparte.documentNumber?.value;
  const documentoProprio = proprio?.documentNumber?.value;
  if (documentoContraparte && documentoProprio && documentoContraparte === documentoProprio) {
    return false;
  }

  return true;
}

export type PluggyContraparteSignal = {
  type: "DEBIT" | "CREDIT";
  merchant?: { cnpj?: string | null } | null;
  paymentData?: {
    payer?: PluggyPaymentParticipant | null;
    receiver?: PluggyPaymentParticipant | null;
  } | null;
};

/**
 * CPF/CNPJ (só dígitos) da contraparte de uma transação — quem recebe, se é
 * uma saída (DEBIT); quem envia, se é uma entrada (CREDIT). Prioriza o CNPJ
 * do `merchant` enriquecido pelo Pluggy: achado em dado real que ele
 * continua o mesmo entre lançamentos do mesmo estabelecimento mesmo quando
 * o formato da descrição muda (ex.: "BANCO BRADESCO FINANCIAMENTOS SA" via
 * débito direto num mês e "Pagamento Boleto BCO BRADESCO S.A." via boleto
 * no outro — mesmo CNPJ do recebedor nos dois). Cai pro documento de
 * `paymentData` quando `merchant` não vem preenchido (comum pra
 * transações sem esse enriquecimento). null quando nenhum dos dois está
 * disponível — usado como critério de "mesmo destinatário" pras Contas
 * Fixas (ver lib/fixedBillMatching.ts), com o texto da descrição como
 * fallback.
 */
export function extrairDocumentoContraparte(t: PluggyContraparteSignal): string | null {
  const contraparte = t.type === "DEBIT" ? t.paymentData?.receiver : t.paymentData?.payer;
  const documento = t.merchant?.cnpj ?? contraparte?.documentNumber?.value ?? null;
  if (!documento) return null;
  const digitos = documento.replace(/\D/g, "");
  return digitos || null;
}

/**
 * Sinal primário — não depende de encontrar a outra ponta da transferência,
 * já é confiável sozinho (vem da própria classificação oficial do Pluggy).
 * Só cobre o lado CREDIT (entrada no cartão): a saída da conta corrente com
 * essa mesma categoria (05100000) não entra aqui de propósito — precisa
 * casar com uma entrada confirmada (ver `parearSaidasComPagamentoFatura`
 * em pluggySync.ts), já que a Pluggy também usa essa categoria pra compras
 * reais no débito (achado em dado real).
 */
export function ehPagamentoDeFaturaCartao(t: PluggyTransactionSignal): boolean {
  if (t.type !== "CREDIT") return false;
  if (t.categoryId === CATEGORY_ID_PAGAMENTO_CARTAO) return true;
  if (t.categoryId === CATEGORY_ID_TRANSFERENCIAS && t.creditCardMetadata != null) {
    return true;
  }
  return false;
}

/**
 * Verdadeiro quando o nome de categoria que a Pluggy dá ("Pagamento de
 * cartão de crédito") seria enganoso pra mostrar como categoria de consumo —
 * o lado DEBIT de "05100000" quando NÃO for de fato pagamento de fatura (ver
 * calcularTransferenciasInternas: só sobrescreva o nome quando o id não
 * ficar marcado como transferência interna). Sem isso, uma compra real no
 * débito continuaria aparecendo rotulada "Pagamento de cartão de crédito"
 * mesmo depois de deixar de contar como transferência — achado em dado real
 * (setembro/2026): usuário via a categoria errada mesmo após a correção do
 * flag de transferência.
 */
export function categoriaPagamentoCartaoEhEnganosa(t: PluggyTransactionSignal): boolean {
  return t.type === "DEBIT" && t.categoryId === CATEGORY_ID_PAGAMENTO_CARTAO;
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

export type PluggyTransactionForClassification = PluggyTransactionSignal & {
  id: string;
  amount: number;
  date: string | Date;
};

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

/**
 * Combina o sinal primário (`ehPagamentoDeFaturaCartao`/
 * `ehMovimentacaoDeInvestimento`) com o secundário
 * (`parearSaidasComPagamentoFatura`) sobre um conjunto de transações Pluggy,
 * retornando quais ids são transferência interna. Usado tanto na
 * sincronização (lib/pluggySync.ts) quanto na reclassificação retroativa de
 * transações já importadas — mesma lógica, sem duplicar.
 */
export function calcularTransferenciasInternas(
  transacoes: PluggyTransactionForClassification[],
): Map<string, boolean> {
  const transferenciaInternaPorId = new Map<string, boolean>();
  for (const t of transacoes) {
    if (ehPagamentoDeFaturaCartao(t) || ehMovimentacaoDeInvestimento(t)) {
      transferenciaInternaPorId.set(t.id, true);
    }
  }

  const entradasPagamentoFatura = transacoes
    .filter((t) => t.type === "CREDIT" && ehPagamentoDeFaturaCartao(t))
    .map((t) => ({ valor: Math.abs(t.amount), data: new Date(t.date) }));
  const candidatasSaida = transacoes
    .filter((t) => t.type === "DEBIT" && !transferenciaInternaPorId.get(t.id))
    .map((t) => ({ id: t.id, valor: Math.abs(t.amount), data: new Date(t.date) }));
  for (const id of parearSaidasComPagamentoFatura(entradasPagamentoFatura, candidatasSaida)) {
    transferenciaInternaPorId.set(id, true);
  }

  return transferenciaInternaPorId;
}
