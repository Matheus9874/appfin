import "server-only";
import { prisma } from "./prisma";
import { getPluggyClient } from "./pluggy";
import type { PluggyClient } from "pluggy-sdk";
import { encontrarCategoriaCorrespondente } from "./pluggyCategoryMapping";
import { resolveInvestmentType } from "./pluggyInvestmentMapping";
import {
  ehMovimentacaoDeInvestimento,
  ehPagamentoDeFaturaCartao,
  parearSaidasComPagamentoFatura,
} from "./pluggyTransferDetection";
import type { MeioPagamento, TipoTransacao } from "@/app/generated/prisma/enums";

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

  const categoriaIdPorChave = new Map<string, string>();
  const categoriasExistentesPorTipo = new Map<
    TipoTransacao,
    { id: string; nome: string }[]
  >();

  async function carregarCategoriasExistentes(tipo: TipoTransacao) {
    const carregadas = categoriasExistentesPorTipo.get(tipo);
    if (carregadas) return carregadas;
    const categorias = await prisma.category.findMany({
      where: { userId, tipo },
      select: { id: true, nome: true },
    });
    categoriasExistentesPorTipo.set(tipo, categorias);
    return categorias;
  }

  /**
   * Resolves a Pluggy category name to one of our Category rows, preferring
   * a keyword match against the user's existing categories (see
   * pluggyCategoryMapping.ts) over creating a new one — avoids piling up
   * near-duplicates like "Restaurante" and "Restaurantes, bares e
   * lanchonetes" side by side.
   */
  async function resolveCategoryId(
    nomeCandidato: string,
    tipo: TipoTransacao,
  ): Promise<string> {
    const chave = `${tipo}:${nomeCandidato}`;
    const cacheada = categoriaIdPorChave.get(chave);
    if (cacheada) return cacheada;

    const categoriasExistentes = await carregarCategoriasExistentes(tipo);

    const exata = categoriasExistentes.find((c) => c.nome === nomeCandidato);
    if (exata) {
      categoriaIdPorChave.set(chave, exata.id);
      return exata.id;
    }

    const correspondencia = encontrarCategoriaCorrespondente(
      nomeCandidato,
      categoriasExistentes,
    );
    if (correspondencia) {
      categoriaIdPorChave.set(chave, correspondencia.id);
      return correspondencia.id;
    }

    const nova = await prisma.category.create({
      data: {
        userId,
        nome: nomeCandidato,
        tipo,
        natureza: tipo === "DESPESA" ? "VARIAVEL" : undefined,
      },
    });
    categoriasExistentes.push({ id: nova.id, nome: nova.nome });
    categoriaIdPorChave.set(chave, nova.id);
    return nova.id;
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

  // Sinal primário (confiável sozinho, não depende de achar a outra ponta):
  // pagamento de fatura de cartão ou aporte/resgate de investimento.
  const transferenciaInternaPorId = new Map<string, boolean>();
  for (const t of todasTransacoesPluggy) {
    if (ehPagamentoDeFaturaCartao(t) || ehMovimentacaoDeInvestimento(t)) {
      transferenciaInternaPorId.set(t.id, true);
    }
  }

  // Sinal secundário: casa a saída da conta corrente com a entrada do
  // cartão já confirmada acima — só entra aqui quem realmente parear.
  const entradasPagamentoFatura = todasTransacoesPluggy
    .filter((t) => t.type === "CREDIT" && ehPagamentoDeFaturaCartao(t))
    .map((t) => ({ valor: Math.abs(t.amount), data: new Date(t.date) }));
  const candidatasSaida = todasTransacoesPluggy
    .filter((t) => t.type === "DEBIT" && !transferenciaInternaPorId.get(t.id))
    .map((t) => ({ id: t.id, valor: Math.abs(t.amount), data: new Date(t.date) }));
  for (const id of parearSaidasComPagamentoFatura(entradasPagamentoFatura, candidatasSaida)) {
    transferenciaInternaPorId.set(id, true);
  }

  const linhas = [];
  for (const t of todasTransacoesPluggy) {
    const tipo: TipoTransacao = t.type === "CREDIT" ? "RECEITA" : "DESPESA";
    const nomeCategoria =
      categoriasTraduzidas.get(t.categoryId ?? "") || t.category?.trim() || "Outros";
    const categoryId = await resolveCategoryId(nomeCategoria, tipo);

    linhas.push({
      userId,
      tipo,
      valor: Math.abs(t.amount),
      categoryId,
      descricao: t.description || "Transação importada",
      data: new Date(t.date),
      origem: "PLUGGY" as const,
      pluggyTransactionId: t.id,
      meioPagamento: resolveMeioPagamento(t),
      // Left unclassified on purpose — see "Não classificadas" in the
      // transactions table, where the user reviews these one by one.
      natureza: null,
      // Categoria original preservada de propósito (não vira "Transferência
      // interna") — só este flag decide o que entra nas somas de saldo.
      transferenciaInterna: transferenciaInternaPorId.get(t.id) ?? false,
    });
  }

  const resultadoTransacoes = await prisma.transaction.createMany({
    data: linhas,
    skipDuplicates: true,
  });
  const novasTransacoes = resultadoTransacoes.count;

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
