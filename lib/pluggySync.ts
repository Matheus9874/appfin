import "server-only";
import { prisma } from "./prisma";
import { getPluggyClient } from "./pluggy";
import type { PluggyClient } from "pluggy-sdk";
import { encontrarCategoriaCorrespondente } from "./pluggyCategoryMapping";
import { resolveInvestmentType } from "./pluggyInvestmentMapping";
import { reconciliarContasFixas } from "./fixedBillService";
import {
  calcularTransferenciasInternas,
  categoriaPagamentoCartaoEhEnganosa,
  ehCategoriaDeTransferencia,
  ehTransferenciaParaPessoaFisica,
  extrairDocumentoContraparte,
  NOME_CATEGORIA_POR_OPERACAO,
} from "./pluggyTransferDetection";
import type {
  MeioPagamento,
  NaturezaCusto,
  TipoTransacao,
} from "@/app/generated/prisma/enums";

const DIAS_JANELA_PADRAO = 90;

function formatDateFrom(date: Date) {
  return date.toISOString().slice(0, 10);
}

type PluggyTransactionLike = {
  creditCardMetadata: unknown | null;
  operationType?: string | null;
};

/**
 * Identifies how a transaction was paid (Pix, débito, cartão de crédito...),
 * stored separately from the merchant category so both show independently.
 *
 * `operationType` (e.g. "PIX", "BOLETO", "CARTAO") is what's reliably
 * populated in practice — `paymentData.referenceNumber` is usually null.
 */
export function resolveMeioPagamento(t: PluggyTransactionLike): MeioPagamento {
  if (t.creditCardMetadata) return "CREDITO";

  const operacao = t.operationType?.toUpperCase();
  if (operacao === "PIX") return "PIX";
  if (operacao === "BOLETO") return "BOLETO";
  if (operacao === "TED") return "TED";
  if (operacao === "DOC") return "DOC";
  if (operacao === "CARTAO") return "DEBITO";

  return "OUTRO";
}

/**
 * Fetches Pluggy's official category catalog (English -> Portuguese) so
 * imported transactions land in a merchant category name in Portuguese
 * (e.g. "Restaurantes, bares e lanchonetes") instead of Pluggy's raw
 * English label.
 *
 * The API returns a `descriptionTranslated` field that pluggy-sdk's own
 * types don't declare yet, hence the local extension below.
 */
type PluggyCategoryWithTranslation = { id: string; descriptionTranslated?: string };

async function fetchCategoryTranslations(): Promise<Map<string, string>> {
  const client = getPluggyClient();
  const categorias = await client.fetchCategories();
  const traduzidas = categorias.results as unknown as PluggyCategoryWithTranslation[];
  return new Map(
    traduzidas
      .filter((c) => c.descriptionTranslated)
      .map((c) => [c.id, c.descriptionTranslated as string]),
  );
}

export type PluggySyncResult = {
  transacoesImportadas: number;
  investimentosImportados: number;
};

const STATUS_TERMINAIS = new Set([
  "UPDATED",
  "OUTDATED",
  "LOGIN_ERROR",
  "WAITING_USER_INPUT",
  "WAITING_USER_ACTION",
]);
const REFRESH_MAX_TENTATIVAS = 10;
const REFRESH_INTERVALO_MS = 2000;

/**
 * `fetchAccounts`/`fetchAllTransactions` só leem o que o Pluggy já tem em
 * cache da última execução do conector — sem isso, dados novos do banco só
 * apareceriam quando o Pluggy decidisse re-executar por conta própria
 * (`nextAutoSyncAt`). `updateItem` dispara uma nova coleta agora; como isso
 * roda em segundo plano no Pluggy, espera (com timeout) até o item sair de
 * "UPDATING" antes de buscar os dados, pra sincronizar de fato trazer
 * novidade em vez de só repetir o que já tínhamos.
 */
async function atualizarItemEEsperar(
  client: PluggyClient,
  pluggyItemId: string,
): Promise<void> {
  try {
    await client.updateItem(pluggyItemId);
  } catch {
    // O conector "MeuPluggy" (o único disponível numa conta trial — ver
    // MEU_PLUGGY_CONNECTOR_ID em app/api/pluggy/items/route.ts) rejeita
    // updateItem de propósito ("MeuPluggy item cant be updated"): ele lê
    // contas já linkadas no app Meu Pluggy, e é o próprio Pluggy quem
    // decide quando re-executar (ver `nextAutoSyncAt` do item — hoje em
    // torno de 24h). Isso é esperado nesse plano, não um erro de verdade;
    // outros conectores (banco real, plano pago) devem aceitar o comando.
    return;
  }

  for (let tentativa = 0; tentativa < REFRESH_MAX_TENTATIVAS; tentativa++) {
    let item;
    try {
      item = await client.fetchItem(pluggyItemId);
    } catch (error) {
      console.error(`Pluggy: erro ao checar status de ${pluggyItemId}.`, error);
      return;
    }
    if (STATUS_TERMINAIS.has(item.status)) return;
    await new Promise((resolve) => setTimeout(resolve, REFRESH_INTERVALO_MS));
  }
}

/**
 * Imports transactions and investments from a connected Pluggy item into our
 * Transaction and Investment tables. Transactions dedupe via the unique
 * `pluggyTransactionId` column (skipDuplicates) — safe to call repeatedly.
 * Investments upsert via the unique `pluggyInvestmentId` column instead,
 * since a Pluggy investment is a live position whose balance changes over
 * time (unlike a transaction, which is an immutable past event) — each sync
 * updates the same row rather than piling up snapshots.
 */
export async function syncPluggyItem(
  userId: string,
  pluggyItem: {
    id: string;
    pluggyItemId: string;
    connectorName: string;
    lastSyncedAt: Date | null;
  },
): Promise<PluggySyncResult> {
  const client = getPluggyClient();

  await atualizarItemEEsperar(client, pluggyItem.pluggyItemId);

  const dateFromBase =
    pluggyItem.lastSyncedAt ??
    new Date(Date.now() - DIAS_JANELA_PADRAO * 24 * 60 * 60 * 1000);
  const dateFrom = formatDateFrom(dateFromBase);

  const [accounts, categoriasTraduzidas] = await Promise.all([
    client.fetchAccounts(pluggyItem.pluggyItemId),
    fetchCategoryTranslations(),
  ]);

  type CategoriaResolvida = { id: string; natureza: NaturezaCusto | null };

  const categoriaPorChave = new Map<string, CategoriaResolvida>();
  const categoriasExistentesPorTipo = new Map<
    TipoTransacao,
    { id: string; nome: string; natureza: NaturezaCusto | null }[]
  >();

  async function carregarCategoriasExistentes(tipo: TipoTransacao) {
    const carregadas = categoriasExistentesPorTipo.get(tipo);
    if (carregadas) return carregadas;
    const categorias = await prisma.category.findMany({
      where: { userId, tipo },
      select: { id: true, nome: true, natureza: true },
    });
    categoriasExistentesPorTipo.set(tipo, categorias);
    return categorias;
  }

  /**
   * Resolves a Pluggy category name to one of our Category rows, preferring
   * a keyword match against the user's existing categories (see
   * pluggyCategoryMapping.ts) over creating a new one — avoids piling up
   * near-duplicates like "Restaurante" e "Restaurantes, bares e
   * lanchonetes" side by side.
   *
   * `evitarFuzzyMatch` desliga esse casamento por palavra-chave — usado pra
   * transferências internas (pagamento de fatura, aporte/resgate de
   * investimento) e, de forma mais ampla, pra qualquer transação cuja
   * categoria Pluggy seja da árvore "Transfers" (ver
   * ehCategoriaDeTransferencia), mesmo quando não é transferência interna
   * (ex.: Pix pra outra pessoa). Nomes desse tipo ("Pagamento de cartão de
   * crédito", "Transferência - Pix" etc.) compartilham palavras com
   * categorias de gasto real do usuário (ex.: "Cartão de Crédito", "Seguro
   * saúde") sem ser a mesma coisa — sem isso, um Pix de valor qualquer pra
   * um familiar podia cair silenciosamente numa categoria de consumo só por
   * coincidência de palavra-chave.
   */
  async function resolveCategoryId(
    nomeCandidato: string,
    tipo: TipoTransacao,
    evitarFuzzyMatch = false,
  ): Promise<CategoriaResolvida> {
    const chave = `${tipo}:${nomeCandidato}`;
    const cacheada = categoriaPorChave.get(chave);
    if (cacheada) return cacheada;

    const categoriasExistentes = await carregarCategoriasExistentes(tipo);

    const exata = categoriasExistentes.find((c) => c.nome === nomeCandidato);
    if (exata) {
      const resolvida = { id: exata.id, natureza: exata.natureza };
      categoriaPorChave.set(chave, resolvida);
      return resolvida;
    }

    if (!evitarFuzzyMatch) {
      const correspondencia = encontrarCategoriaCorrespondente(
        nomeCandidato,
        categoriasExistentes,
      );
      if (correspondencia) {
        const existente = categoriasExistentes.find(
          (c) => c.id === correspondencia.id,
        );
        const resolvida = {
          id: correspondencia.id,
          natureza: existente?.natureza ?? null,
        };
        categoriaPorChave.set(chave, resolvida);
        return resolvida;
      }
    }

    const nova = await prisma.category.create({
      data: {
        userId,
        nome: nomeCandidato,
        tipo,
        natureza: tipo === "DESPESA" ? "VARIAVEL" : undefined,
      },
    });
    categoriasExistentes.push({
      id: nova.id,
      nome: nova.nome,
      natureza: nova.natureza,
    });
    const resolvida = { id: nova.id, natureza: nova.natureza };
    categoriaPorChave.set(chave, resolvida);
    return resolvida;
  }

  // Persist each account's real balance, so "Saldo total" can use the
  // institution's own reported balance instead of reconstructing it from
  // imported transactions (which only cover the sync window).
  for (const account of accounts.results) {
    if (account.type !== "BANK" && account.type !== "CREDIT") continue;
    const vencimentoFatura = account.creditData?.balanceDueDate
      ? new Date(account.creditData.balanceDueDate)
      : null;
    await prisma.pluggyAccount.upsert({
      where: { pluggyAccountId: account.id },
      update: {
        tipo: account.type,
        nome: account.marketingName || account.name,
        saldo: account.balance,
        vencimentoFatura,
      },
      create: {
        userId,
        pluggyItemId: pluggyItem.id,
        pluggyAccountId: account.id,
        tipo: account.type,
        nome: account.marketingName || account.name,
        saldo: account.balance,
        vencimentoFatura,
      },
    });
  }

  // Busca as transações de todas as contas ANTES de decidir qualquer coisa —
  // o pareamento de pagamento de fatura (ver abaixo) precisa enxergar as
  // contas em conjunto (a saída sai da conta corrente, a entrada é no
  // cartão), não uma conta por vez.
  const todasTransacoesPluggy = [];
  for (const account of accounts.results) {
    const transacoesPluggy = await client.fetchAllTransactions(account.id, {
      dateFrom,
    });
    todasTransacoesPluggy.push(...transacoesPluggy);
  }

  // Sinal primário (pagamento de fatura de cartão / aporte-resgate de
  // investimento) + secundário (pareamento saída-entrada) — ver
  // calcularTransferenciasInternas em pluggyTransferDetection.ts.
  const transferenciaInternaPorId = calcularTransferenciasInternas(todasTransacoesPluggy);

  const linhas = [];
  for (const t of todasTransacoesPluggy) {
    const tipo: TipoTransacao = t.type === "CREDIT" ? "RECEITA" : "DESPESA";
    // Pix/TED/DOC pra pessoa física: ignora a categoria que o Pluggy deu
    // (pouco confiável nesse caso — ver ehTransferenciaParaPessoaFisica) e
    // usa um nome estável, em vez de arriscar cair numa categoria de
    // consumo sem relação nenhuma com a transação real.
    const ehPixPessoaFisica = ehTransferenciaParaPessoaFisica(t);
    const ehTransferenciaInterna = transferenciaInternaPorId.get(t.id) ?? false;
    // Compra real no débito com a categoria "Pagamento de cartão de
    // crédito" (não pareada como fatura de verdade): usar esse nome seria
    // enganoso, já que não é transferência — ver
    // categoriaPagamentoCartaoEhEnganosa.
    const nomeCategoria = ehPixPessoaFisica
      ? (NOME_CATEGORIA_POR_OPERACAO[t.operationType?.toUpperCase() ?? ""] ??
        "Transferências")
      : !ehTransferenciaInterna && categoriaPagamentoCartaoEhEnganosa(t)
        ? "Outros"
        : categoriasTraduzidas.get(t.categoryId ?? "") || t.category?.trim() || "Outros";
    const categoria = await resolveCategoryId(
      nomeCategoria,
      tipo,
      ehTransferenciaInterna ||
        ehCategoriaDeTransferencia(t.categoryId ?? null) ||
        ehPixPessoaFisica,
    );

    linhas.push({
      userId,
      tipo,
      valor: Math.abs(t.amount),
      categoryId: categoria.id,
      descricao: t.description || "Transação importada",
      data: new Date(t.date),
      origem: "PLUGGY" as const,
      pluggyTransactionId: t.id,
      meioPagamento: resolveMeioPagamento(t),
      // Herda a classificação já confirmada pra categoria (ver Planejamento
      // > Contas Fixas) — transferência interna fica sempre sem natureza,
      // já que não é gasto real.
      natureza: ehTransferenciaInterna ? null : categoria.natureza,
      // Categoria não vira "Transferência interna" — só este flag decide o
      // que entra nas somas de saldo.
      transferenciaInterna: ehTransferenciaInterna,
      // CPF/CNPJ da contraparte, quando disponível — usado como critério de
      // "mesmo destinatário" em Contas Fixas (ver lib/fixedBillMatching.ts).
      contraparteDocumento: extrairDocumentoContraparte(t),
      // Marca de qual conexão essa transação veio — permite apagar
      // seletivamente os dados de uma conexão específica ao desconectá-la.
      pluggyItemId: pluggyItem.id,
    });
  }

  const resultadoTransacoes = await prisma.transaction.createMany({
    data: linhas,
    skipDuplicates: true,
  });
  const novasTransacoes = resultadoTransacoes.count;

  // Vincula automaticamente as transações recém-importadas às Contas
  // Fixas do usuário (sem precisar abrir a tela) — cobre tanto contas
  // ainda sem padrão aprendido (mês atual, só por valor) quanto contas já
  // confirmadas (últimos 3 meses, valor + destinatário).
  if (novasTransacoes > 0) {
    await reconciliarContasFixas(userId);
  }

  let investimentosSincronizados = 0;
  // pageSize explícito: o padrão da API é 20 por página, e sem isso
  // investimentos além dos primeiros 20 ficariam de fora silenciosamente.
  const investimentosPluggy = await client.fetchInvestments(
    pluggyItem.pluggyItemId,
    undefined,
    { pageSize: 500 },
  );
  for (const inv of investimentosPluggy.results) {
    const tipo = resolveInvestmentType(inv);
    await prisma.investment.upsert({
      where: { pluggyInvestmentId: inv.id },
      update: {
        tipo,
        instituicao: inv.institution?.name || pluggyItem.connectorName,
        nome: inv.name,
        valor: inv.balance,
        data: inv.date ? new Date(inv.date) : new Date(),
        pluggyItemId: pluggyItem.id,
      },
      create: {
        userId,
        tipo,
        instituicao: inv.institution?.name || pluggyItem.connectorName,
        nome: inv.name,
        valor: inv.balance,
        data: inv.date ? new Date(inv.date) : new Date(),
        origem: "PLUGGY",
        pluggyInvestmentId: inv.id,
        pluggyItemId: pluggyItem.id,
      },
    });
    investimentosSincronizados++;
  }

  await prisma.pluggyItem.update({
    where: { id: pluggyItem.id },
    data: { lastSyncedAt: new Date() },
  });

  return {
    transacoesImportadas: novasTransacoes,
    investimentosImportados: investimentosSincronizados,
  };
}

export type ReclassifyResult = { transacoesCorrigidas: number };

/**
 * Reprocessa, por conexão, as transações já importadas que hoje estão
 * marcadas como transferência interna (despesa) mas podem ter sido vítimas
 * do falso positivo corrigido em `ehPagamentoDeFaturaCartao` (categoria
 * "05100000" do Pluggy também usada por compras reais no débito, achado em
 * dado real de produção — ver lib/pluggyTransferDetection.ts). A
 * classificação é calculada uma vez, na sincronização, e fica gravada no
 * banco (`Transaction.transferenciaInterna`) — corrigir a função de
 * detecção sozinha não conserta o que já foi importado, por isso essa
 * função existe.
 *
 * Também corrige `categoryId` quando a transação era o caso enganoso
 * (`categoriaPagamentoCartaoEhEnganosa` — débito categorizado "Pagamento de
 * cartão de crédito" pela Pluggy sem ser fatura de verdade): sem isso, a
 * transação deixa de contar como transferência mas continua rotulada como
 * se fosse pagamento de cartão, o que ainda confunde o usuário (achado ao
 * revisar com dado real).
 */
export async function reclassificarTransferenciasInternas(
  userId: string,
): Promise<ReclassifyResult> {
  const client = getPluggyClient();
  const itens = await prisma.pluggyItem.findMany({ where: { userId } });

  let transacoesCorrigidas = 0;
  // Categoria genérica pra onde vão as compras de débito que a Pluggy
  // rotulou (errado) como "Pagamento de cartão de crédito" — resolvida uma
  // vez e reaproveitada entre conexões, já que é a mesma pro usuário todo.
  let categoriaOutros: { id: string; natureza: NaturezaCusto | null } | null = null;
  async function obterCategoriaOutros() {
    if (categoriaOutros) return categoriaOutros;
    const existente = await prisma.category.findFirst({
      where: { userId, tipo: "DESPESA", nome: "Outros" },
      select: { id: true, natureza: true },
    });
    categoriaOutros =
      existente ??
      (await prisma.category.create({
        data: { userId, nome: "Outros", tipo: "DESPESA", natureza: "VARIAVEL" },
        select: { id: true, natureza: true },
      }));
    return categoriaOutros;
  }

  for (const item of itens) {
    const candidatas = await prisma.transaction.findMany({
      where: {
        userId,
        pluggyItemId: item.id,
        origem: "PLUGGY",
        tipo: "DESPESA",
        transferenciaInterna: true,
      },
      select: {
        id: true,
        pluggyTransactionId: true,
        data: true,
        category: { select: { natureza: true } },
      },
    });
    if (candidatas.length === 0) continue;

    const dataMaisAntiga = candidatas.reduce(
      (min, c) => (c.data < min ? c.data : min),
      candidatas[0].data,
    );
    const dateFrom = formatDateFrom(dataMaisAntiga);

    const accounts = await client.fetchAccounts(item.pluggyItemId);
    const todasTransacoesPluggy = [];
    for (const account of accounts.results) {
      const transacoesPluggy = await client.fetchAllTransactions(account.id, {
        dateFrom,
      });
      todasTransacoesPluggy.push(...transacoesPluggy);
    }

    const transacaoPluggyPorId = new Map(todasTransacoesPluggy.map((t) => [t.id, t]));
    const transferenciaInternaPorId = calcularTransferenciasInternas(todasTransacoesPluggy);

    for (const candidata of candidatas) {
      if (!candidata.pluggyTransactionId) continue;
      const transacaoBruta = transacaoPluggyPorId.get(candidata.pluggyTransactionId);
      // Não achado na janela buscada: não confirma nem contradiz o que já
      // está salvo, então não mexe.
      if (!transacaoBruta) continue;
      // Continua sendo transferência real de verdade.
      if (transferenciaInternaPorId.get(candidata.pluggyTransactionId)) continue;

      const dadosAtualizacao: {
        transferenciaInterna: false;
        natureza: NaturezaCusto | null;
        categoryId?: string;
      } = {
        transferenciaInterna: false,
        natureza: candidata.category.natureza,
      };
      if (categoriaPagamentoCartaoEhEnganosa(transacaoBruta)) {
        const outros = await obterCategoriaOutros();
        dadosAtualizacao.categoryId = outros.id;
        dadosAtualizacao.natureza = outros.natureza;
      }

      await prisma.transaction.update({
        where: { id: candidata.id },
        data: dadosAtualizacao,
      });
      transacoesCorrigidas++;
    }
  }

  if (transacoesCorrigidas > 0) {
    await reconciliarContasFixas(userId);
  }

  return { transacoesCorrigidas };
}
