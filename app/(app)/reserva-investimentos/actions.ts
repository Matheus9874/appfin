"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { INVESTMENT_TYPES } from "@/lib/investmentTypes";
import type { InvestmentType } from "@/app/generated/prisma/enums";

export async function createInvestmentEntry(formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "") as InvestmentType;
  const instituicao = String(formData.get("instituicao") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const valor = String(formData.get("valor") ?? "");
  const data = String(formData.get("data") ?? "");

  if (!INVESTMENT_TYPES.includes(tipo) || !instituicao || !valor || !data) {
    throw new Error("Preencha tipo, instituição, valor e data.");
  }

  const userId = await getCurrentUserId();

  await prisma.investment.create({
    data: {
      userId,
      tipo,
      instituicao,
      nome: nome || null,
      valor,
      data: new Date(data),
    },
  });

  revalidatePath("/reserva-investimentos");
}

export async function updateInvestmentEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tipo = String(formData.get("tipo") ?? "") as InvestmentType;
  const instituicao = String(formData.get("instituicao") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const valor = String(formData.get("valor") ?? "");
  const data = String(formData.get("data") ?? "");

  if (
    !id ||
    !INVESTMENT_TYPES.includes(tipo) ||
    !instituicao ||
    !valor ||
    !data
  ) {
    throw new Error("Preencha tipo, instituição, valor e data.");
  }

  const userId = await getCurrentUserId();
  const { count } = await prisma.investment.updateMany({
    where: { id, userId },
    data: {
      tipo,
      instituicao,
      nome: nome || null,
      valor,
      data: new Date(data),
    },
  });

  if (count === 0) {
    throw new Error("Lançamento não encontrado.");
  }

  revalidatePath("/reserva-investimentos");
  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function deleteInvestmentEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Lançamento inválido.");
  }

  const userId = await getCurrentUserId();
  const { count } = await prisma.investment.deleteMany({
    where: { id, userId },
  });

  if (count === 0) {
    throw new Error("Lançamento não encontrado.");
  }

  revalidatePath("/reserva-investimentos");
  revalidatePath("/metas");
  revalidatePath("/dashboard");
}
