"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type {
  NaturezaCusto,
  TipoTransacao,
} from "@/app/generated/prisma/enums";

const TIPOS_TRANSACAO: TipoTransacao[] = ["RECEITA", "DESPESA"];
const NATUREZAS_CUSTO: NaturezaCusto[] = ["FIXO", "VARIAVEL"];

function revalidateCategoriasEDependentes() {
  revalidatePath("/categorias");
  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
}

export async function createCategory(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "") as TipoTransacao;
  const naturezaBruta = String(formData.get("natureza") ?? "");

  if (!nome || !TIPOS_TRANSACAO.includes(tipo)) {
    throw new Error("Preencha o nome e o tipo da categoria.");
  }

  if (tipo === "DESPESA" && !NATUREZAS_CUSTO.includes(naturezaBruta as NaturezaCusto)) {
    throw new Error("Selecione se a categoria é um custo fixo ou variável.");
  }

  const natureza =
    tipo === "DESPESA" ? (naturezaBruta as NaturezaCusto) : undefined;

  const userId = await getCurrentUserId();

  await prisma.category.upsert({
    where: { userId_nome_tipo: { userId, nome, tipo } },
    update: {},
    create: { userId, nome, tipo, natureza },
  });

  revalidateCategoriasEDependentes();
}

export async function deleteCategory(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "");

  if (!categoryId) {
    throw new Error("Categoria inválida.");
  }

  const userId = await getCurrentUserId();

  const emUso = await prisma.transaction.count({
    where: { categoryId, userId },
  });
  if (emUso > 0) {
    throw new Error(
      "Esta categoria está sendo usada em transações e não pode ser excluída.",
    );
  }

  const { count } = await prisma.category.deleteMany({
    where: { id: categoryId, userId },
  });

  if (count === 0) {
    throw new Error("Categoria não encontrada.");
  }

  revalidateCategoriasEDependentes();
}
