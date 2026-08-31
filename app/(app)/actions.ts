"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { NOVA_CATEGORIA_VALUE } from "@/lib/constants";
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
) {
  if (categoriaSelecionada !== NOVA_CATEGORIA_VALUE) {
    const categoria = await prisma.category.findFirst({
      where: { id: categoriaSelecionada, userId },
      select: { id: true },
    });
    if (!categoria) {
      throw new Error("Categoria inválida.");
    }
    return categoria.id;
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
  return category.id;
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
  const categoryId = await resolveCategoryId(
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
      categoryId,
      descricao,
      data,
      userId,
    },
  });

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
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
  const categoryId = await resolveCategoryId(
    categoriaValida,
    novaCategoriaNome,
    novaCategoriaNatureza,
    tipo,
    userId,
  );

  const { count } = await prisma.transaction.updateMany({
    where: { id, userId },
    data: {
      tipo,
      valor,
      categoryId,
      descricao,
      data,
    },
  });

  if (count === 0) {
    throw new Error("Transação não encontrada.");
  }

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
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

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
}
