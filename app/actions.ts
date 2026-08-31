"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/defaultUser";
import { NOVA_CATEGORIA_VALUE } from "@/lib/constants";

export async function createTransaction(formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "");
  const valor = String(formData.get("valor") ?? "");
  const categoriaSelecionada = String(formData.get("categoryId") ?? "");
  const novaCategoriaNome = String(
    formData.get("novaCategoriaNome") ?? "",
  ).trim();
  const descricao = String(formData.get("descricao") ?? "");
  const data = String(formData.get("data") ?? "");

  if (!tipo || !valor || !categoriaSelecionada || !descricao || !data) {
    throw new Error("Todos os campos são obrigatórios.");
  }

  const userId = await getDefaultUserId();

  let categoryId = categoriaSelecionada;

  if (categoriaSelecionada === NOVA_CATEGORIA_VALUE) {
    if (!novaCategoriaNome) {
      throw new Error("Informe o nome da nova categoria.");
    }
    const category = await prisma.category.upsert({
      where: { nome_tipo: { nome: novaCategoriaNome, tipo } },
      update: {},
      create: { nome: novaCategoriaNome, tipo },
    });
    categoryId = category.id;
  }

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
