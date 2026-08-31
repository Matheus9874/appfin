"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { NOVA_CATEGORIA_VALUE } from "@/lib/constants";
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
    return categoriaSelecionada;
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
  const valor = String(formData.get("valor") ?? "");
  const categoriaSelecionada = String(formData.get("categoryId") ?? "");
  const novaCategoriaNome = String(
    formData.get("novaCategoriaNome") ?? "",
  ).trim();
  const novaCategoriaNatureza = String(
    formData.get("novaCategoriaNatureza") ?? "",
  );
  const descricao = String(formData.get("descricao") ?? "");
  const data = String(formData.get("data") ?? "");

  if (
    !TIPOS_TRANSACAO.includes(tipo) ||
    !valor ||
    !categoriaSelecionada ||
    !descricao ||
    !data
  ) {
    throw new Error("Todos os campos são obrigatórios.");
  }

  const userId = await getCurrentUserId();
  const categoryId = await resolveCategoryId(
    categoriaSelecionada,
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
      data: new Date(data),
      userId,
    },
  });

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
}

export async function updateTransaction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tipo = String(formData.get("tipo") ?? "") as TipoTransacao;
  const valor = String(formData.get("valor") ?? "");
  const categoriaSelecionada = String(formData.get("categoryId") ?? "");
  const novaCategoriaNome = String(
    formData.get("novaCategoriaNome") ?? "",
  ).trim();
  const novaCategoriaNatureza = String(
    formData.get("novaCategoriaNatureza") ?? "",
  );
  const descricao = String(formData.get("descricao") ?? "");
  const data = String(formData.get("data") ?? "");

  if (
    !id ||
    !TIPOS_TRANSACAO.includes(tipo) ||
    !valor ||
    !categoriaSelecionada ||
    !descricao ||
    !data
  ) {
    throw new Error("Todos os campos são obrigatórios.");
  }

  const userId = await getCurrentUserId();
  const categoryId = await resolveCategoryId(
    categoriaSelecionada,
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
      data: new Date(data),
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
