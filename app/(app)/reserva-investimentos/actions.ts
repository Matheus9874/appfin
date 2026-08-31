"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { INVESTMENT_TYPES } from "@/lib/investmentTypes";
import {
  parseNonNegativeNumber,
  parseRequiredDate,
  requireNonEmpty,
} from "@/lib/validation";
import type { InvestmentType } from "@/app/generated/prisma/enums";

export async function createInvestmentEntry(formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "") as InvestmentType;
  if (!INVESTMENT_TYPES.includes(tipo)) {
    throw new Error("Selecione o tipo de investimento.");
  }
  const instituicao = requireNonEmpty(
    String(formData.get("instituicao") ?? ""),
    "Instituição",
  );
  const nome = String(formData.get("nome") ?? "").trim();
  const valor = parseNonNegativeNumber(
    String(formData.get("valor") ?? ""),
    "Valor",
  );
  const data = parseRequiredDate(String(formData.get("data") ?? ""), "Data");

  const userId = await getCurrentUserId();

  await prisma.investment.create({
    data: {
      userId,
      tipo,
      instituicao,
      nome: nome || null,
      valor,
      data,
    },
  });

  revalidatePath("/reserva-investimentos");
}

export async function updateInvestmentEntry(formData: FormData) {
  const id = requireNonEmpty(String(formData.get("id") ?? ""), "Lançamento");
  const tipo = String(formData.get("tipo") ?? "") as InvestmentType;
  if (!INVESTMENT_TYPES.includes(tipo)) {
    throw new Error("Selecione o tipo de investimento.");
  }
  const instituicao = requireNonEmpty(
    String(formData.get("instituicao") ?? ""),
    "Instituição",
  );
  const nome = String(formData.get("nome") ?? "").trim();
  const valor = parseNonNegativeNumber(
    String(formData.get("valor") ?? ""),
    "Valor",
  );
  const data = parseRequiredDate(String(formData.get("data") ?? ""), "Data");

  const userId = await getCurrentUserId();
  const { count } = await prisma.investment.updateMany({
    where: { id, userId },
    data: {
      tipo,
      instituicao,
      nome: nome || null,
      valor,
      data,
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
