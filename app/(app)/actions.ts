"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { NOVA_CATEGORIA_VALUE } from "@/lib/constants";
import { revalidateFinancialPaths } from "@/lib/revalidateFinancialPaths";
import { reconciliarContasFixas } from "@/lib/fixedBillService";
import {
  parsePositiveNumber,
  parseRequiredDate,
  requireNonEmpty,
} from "@/lib/validation";
import type {
  NaturezaCusto,
  TipoTransacao,
} from "@/app/generated/prisma/enums";

const TIPOS_TRANSACAO: TipoTransacao[] = ["RECEITA", "DESPESA"];
const NATUREZAS_CUSTO: NaturezaCusto[] = ["FIXO", "VARIAVEL"];

async function resolveCategoryId(
  categoriaSelecionada: string,
  novaCategoriaNome: string,
  novaCategoriaNatureza: string,
  tipo: TipoTransacao,
  userId: string,
): Promise<{ id: string; natureza: NaturezaCusto | null }> {
  if (categoriaSelecionada !== NOVA_CATEGORIA_VALUE) {
    const categoria = await prisma.category.findFirst({
      where: { id: categoriaSelecionada, userId },
      select: { id: true, natureza: true },
    });
    if (!categoria) {
      throw new Error("Categoria inválida.");
    }
    return categoria;
  }
  if (!novaCategoriaNome) {
    throw new Error("Informe o nome da nova categoria.");
  }
  const natureza =
    tipo === "DESPESA"
      ? (novaCategoriaNatureza as NaturezaCusto)
      : undefined;
  if (tipo === "DESPESA" && !NATUREZAS_CUSTO.includes(novaCategoriaNatureza as NaturezaCusto)) {
    throw new Error("Selecione se a nova categoria é um custo fixo ou variável.");
  }
  const category = await prisma.category.upsert({
    where: { userId_nome_tipo: { userId, nome: novaCategoriaNome, tipo } },
    update: {},
    create: { userId, nome: novaCategoriaNome, tipo, natureza },
  });
  return { id: category.id, natureza: category.natureza };
}

export async function createTransaction(formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "") as TipoTransacao;
  const categoriaSelecionada = String(formData.get("categoryId") ?? "");
  const novaCategoriaNome = String(
    formData.get("novaCategoriaNome") ?? "",
  ).trim();
  const novaCategoriaNatureza = String(
    formData.get("novaCategoriaNatureza") ?? "",
  );

  if (!TIPOS_TRANSACAO.includes(tipo)) {
    throw new Error("Selecione o tipo da transação.");
  }
  const valor = parsePositiveNumber(String(formData.get("valor") ?? ""), "Valor");
  const categoriaValida = requireNonEmpty(categoriaSelecionada, "Categoria");
  const descricao = requireNonEmpty(
    String(formData.get("descricao") ?? ""),
    "Descrição",
  );
  const data = parseRequiredDate(String(formData.get("data") ?? ""), "Data");

  const userId = await getCurrentUserId();
  const categoria = await resolveCategoryId(
    categoriaValida,
    novaCategoriaNome,
    novaCategoriaNatureza,
    tipo,
    userId,
  );

  await prisma.transaction.create({
    data: {
      tipo,
      valor,
      categoryId: categoria.id,
      descricao,
      data,
      userId,
      // Snapshot the category's natureza onto the transaction itself, since
      // natureza is now tracked per-transaction (so it can later be
      // reclassified individually without affecting the rest of the
      // category — see updateTransactionNatureza).
      natureza: categoria.natureza,
    },
  });

  // Vincula automaticamente a transação recém-lançada a alguma Conta Fixa,
  // se bater os critérios — sem precisar abrir a tela de Contas Fixas.
  if (tipo === "DESPESA") {
    await reconciliarContasFixas(userId);
  }

  revalidateFinancialPaths();
}

export async function updateTransaction(formData: FormData) {
  const id = requireNonEmpty(String(formData.get("id") ?? ""), "Transação");
  const tipo = String(formData.get("tipo") ?? "") as TipoTransacao;
  const categoriaSelecionada = String(formData.get("categoryId") ?? "");
  const novaCategoriaNome = String(
    formData.get("novaCategoriaNome") ?? "",
  ).trim();
  const novaCategoriaNatureza = String(
    formData.get("novaCategoriaNatureza") ?? "",
  );

  if (!TIPOS_TRANSACAO.includes(tipo)) {
    throw new Error("Selecione o tipo da transação.");
  }
  const valor = parsePositiveNumber(String(formData.get("valor") ?? ""), "Valor");
  const categoriaValida = requireNonEmpty(categoriaSelecionada, "Categoria");
  const descricao = requireNonEmpty(
    String(formData.get("descricao") ?? ""),
    "Descrição",
  );
  const data = parseRequiredDate(String(formData.get("data") ?? ""), "Data");

  const userId = await getCurrentUserId();
  const categoria = await resolveCategoryId(
    categoriaValida,
    novaCategoriaNome,
    novaCategoriaNatureza,
    tipo,
    userId,
  );

  // Deliberately leaves `natureza` untouched: it's a per-transaction
  // classification the user sets independently (at creation, or via
  // updateTransactionNatureza) — editing other fields here shouldn't reset
  // a classification they already made.
  const { count } = await prisma.transaction.updateMany({
    where: { id, userId },
    data: {
      tipo,
      valor,
      categoryId: categoria.id,
      descricao,
      data,
    },
  });

  if (count === 0) {
    throw new Error("Transação não encontrada.");
  }

  revalidateFinancialPaths();
}

/**
 * Quick per-transaction Fixo/Variável reclassification, used from the
 * transactions list (e.g. to review Pluggy imports one by one) — separate
 * from the full edit form so it doesn't touch anything else.
 */
export async function updateTransactionNatureza(
  id: string,
  natureza: NaturezaCusto | null,
) {
  if (!id) {
    throw new Error("Transação inválida.");
  }
  if (natureza !== null && !NATUREZAS_CUSTO.includes(natureza)) {
    throw new Error("Natureza inválida.");
  }

  const userId = await getCurrentUserId();
  const { count } = await prisma.transaction.updateMany({
    where: { id, userId, tipo: "DESPESA", transferenciaInterna: false },
    data: { natureza },
  });

  if (count === 0) {
    throw new Error("Transação não encontrada.");
  }

  revalidateFinancialPaths();
}

export async function deleteTransaction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Transação inválida.");
  }

  const userId = await getCurrentUserId();
  const { count } = await prisma.transaction.deleteMany({
    where: { id, userId },
  });

  if (count === 0) {
    throw new Error("Transação não encontrada.");
  }

  revalidateFinancialPaths();
}
