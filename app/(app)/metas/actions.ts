"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { NENHUM_INVESTIMENTO_VALUE } from "@/lib/constants";

export async function createGoal(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const valorAlvo = String(formData.get("valorAlvo") ?? "");
  const prazo = String(formData.get("prazo") ?? "");
  const investmentIdSelecionado = String(formData.get("investmentId") ?? "");

  if (!nome || !valorAlvo || !prazo) {
    throw new Error("Preencha nome, valor-alvo e prazo da meta.");
  }

  const userId = await getCurrentUserId();

  const investmentId =
    investmentIdSelecionado && investmentIdSelecionado !== NENHUM_INVESTIMENTO_VALUE
      ? investmentIdSelecionado
      : null;

  await prisma.goal.create({
    data: {
      userId,
      nome,
      valorAlvo,
      prazo: new Date(prazo),
      investmentId,
    },
  });

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function updateGoal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const valorAlvo = String(formData.get("valorAlvo") ?? "");
  const prazo = String(formData.get("prazo") ?? "");
  const investmentIdSelecionado = String(formData.get("investmentId") ?? "");

  if (!id || !nome || !valorAlvo || !prazo) {
    throw new Error("Preencha nome, valor-alvo e prazo da meta.");
  }

  const userId = await getCurrentUserId();

  const investmentId =
    investmentIdSelecionado && investmentIdSelecionado !== NENHUM_INVESTIMENTO_VALUE
      ? investmentIdSelecionado
      : null;

  const { count } = await prisma.goal.updateMany({
    where: { id, userId },
    data: {
      nome,
      valorAlvo,
      prazo: new Date(prazo),
      investmentId,
    },
  });

  if (count === 0) {
    throw new Error("Meta não encontrada.");
  }

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function deleteGoal(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Meta inválida.");
  }

  const userId = await getCurrentUserId();
  const { count } = await prisma.goal.deleteMany({ where: { id, userId } });

  if (count === 0) {
    throw new Error("Meta não encontrada.");
  }

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}
