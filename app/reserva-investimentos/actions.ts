"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/defaultUser";
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

  const userId = await getDefaultUserId();

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
