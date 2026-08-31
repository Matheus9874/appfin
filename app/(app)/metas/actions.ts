"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { NENHUM_INVESTIMENTO_VALUE } from "@/lib/constants";
import {
  parsePositiveNumber,
  parseRequiredDate,
  requireNonEmpty,
} from "@/lib/validation";

async function resolveInvestmentId(
  investmentIdSelecionado: string,
  userId: string,
) {
  if (
    !investmentIdSelecionado ||
    investmentIdSelecionado === NENHUM_INVESTIMENTO_VALUE
  ) {
    return null;
  }
  const investimento = await prisma.investment.findFirst({
    where: { id: investmentIdSelecionado, userId },
    select: { id: true },
  });
  if (!investimento) {
    throw new Error("Investimento inválido.");
  }
  return investimento.id;
}

export async function createGoal(formData: FormData) {
  const nome = requireNonEmpty(String(formData.get("nome") ?? ""), "Nome");
  const valorAlvo = parsePositiveNumber(
    String(formData.get("valorAlvo") ?? ""),
    "Valor-alvo",
  );
  const prazo = parseRequiredDate(String(formData.get("prazo") ?? ""), "Prazo");
  const investmentIdSelecionado = String(formData.get("investmentId") ?? "");

  const userId = await getCurrentUserId();
  const investmentId = await resolveInvestmentId(
    investmentIdSelecionado,
    userId,
  );

  await prisma.goal.create({
    data: {
      userId,
      nome,
      valorAlvo,
      prazo,
      investmentId,
    },
  });

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function updateGoal(formData: FormData) {
  const id = requireNonEmpty(String(formData.get("id") ?? ""), "Meta");
  const nome = requireNonEmpty(String(formData.get("nome") ?? ""), "Nome");
  const valorAlvo = parsePositiveNumber(
    String(formData.get("valorAlvo") ?? ""),
    "Valor-alvo",
  );
  const prazo = parseRequiredDate(String(formData.get("prazo") ?? ""), "Prazo");
  const investmentIdSelecionado = String(formData.get("investmentId") ?? "");

  const userId = await getCurrentUserId();
  const investmentId = await resolveInvestmentId(
    investmentIdSelecionado,
    userId,
  );

  const { count } = await prisma.goal.updateMany({
    where: { id, userId },
    data: {
      nome,
      valorAlvo,
      prazo,
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
