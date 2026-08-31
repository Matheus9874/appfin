"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function revalidateCategoriasEDependentes() {
  revalidatePath("/categorias");
  revalidatePath("/transacoes");
}

export async function createCategory(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");

  if (!nome || !tipo) {
    throw new Error("Preencha o nome e o tipo da categoria.");
  }

  await prisma.category.upsert({
    where: { nome_tipo: { nome, tipo } },
    update: {},
    create: { nome, tipo },
  });

  revalidateCategoriasEDependentes();
}

export async function deleteCategory(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "");

  if (!categoryId) {
    throw new Error("Categoria inválida.");
  }

  const emUso = await prisma.transaction.count({ where: { categoryId } });
  if (emUso > 0) {
    throw new Error(
      "Esta categoria está sendo usada em transações e não pode ser excluída.",
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });

  revalidateCategoriasEDependentes();
}
