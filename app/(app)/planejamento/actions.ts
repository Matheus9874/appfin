"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { revalidateFinancialPaths } from "@/lib/revalidateFinancialPaths";
import {
  parseNonNegativeNumber,
  parsePositiveNumber,
} from "@/lib/validation";
import type { NaturezaCusto } from "@/app/generated/prisma/enums";

const NATUREZAS: NaturezaCusto[] = ["FIXO", "VARIAVEL"];
const TOLERANCIA_SOMA_PERCENTUAL = 0.5;

/**
 * Aplica a classificação Fixo/Variável escolhida (sugerida ou ajustada pelo
 * usuário) nas transações do grupo — ver lib/fixedExpenseSuggestion.ts pra
 * sugestão que alimenta essa tela. É por transação (não por categoria):
 * um comerciante recorrente como "ALAN VITOR DA COSTA" pode dividir
 * categoria com transações totalmente variáveis, então marcar a categoria
 * inteira erraria.
 */
export async function confirmarNaturezaTransacoes(
  transactionIds: string[],
  natureza: NaturezaCusto,
) {
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    throw new Error("Nenhuma transação selecionada.");
  }
  if (!NATUREZAS.includes(natureza)) {
    throw new Error("Natureza inválida.");
  }

  const userId = await getCurrentUserId();

  const { count } = await prisma.transaction.updateMany({
    where: {
      id: { in: transactionIds },
      userId,
      tipo: "DESPESA",
      transferenciaInterna: false,
    },
    data: { natureza },
  });
  if (count === 0) {
    throw new Error("Nenhuma transação encontrada.");
  }

  revalidateFinancialPaths();
  revalidatePath("/planejamento");
  revalidatePath("/planejamento/classificacao");
}

export async function saveMonthlyPlan(formData: FormData) {
  const mes = Number(formData.get("mes"));
  const ano = Number(formData.get("ano"));
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano)) {
    throw new Error("Mês/ano inválidos.");
  }

  const rendaPlanejada = parsePositiveNumber(
    String(formData.get("rendaPlanejada") ?? ""),
    "Renda planejada",
  );
  const percentualEssencial = parseNonNegativeNumber(
    String(formData.get("percentualEssencial") ?? ""),
    "Percentual Essencial",
  );
  const percentualPessoal = parseNonNegativeNumber(
    String(formData.get("percentualPessoal") ?? ""),
    "Percentual Pessoal",
  );
  const percentualReserva = parseNonNegativeNumber(
    String(formData.get("percentualReserva") ?? ""),
    "Percentual Reserva",
  );
  const percentualInvestimento = parseNonNegativeNumber(
    String(formData.get("percentualInvestimento") ?? ""),
    "Percentual Investimento",
  );

  const soma =
    percentualEssencial +
    percentualPessoal +
    percentualReserva +
    percentualInvestimento;
  if (Math.abs(soma - 100) > TOLERANCIA_SOMA_PERCENTUAL) {
    throw new Error(
      `Os percentuais precisam somar 100% (hoje soma ${soma.toFixed(1)}%).`,
    );
  }

  const userId = await getCurrentUserId();

  await prisma.monthlyPlan.upsert({
    where: { userId_mes_ano: { userId, mes, ano } },
    update: {
      rendaPlanejada,
      percentualEssencial,
      percentualPessoal,
      percentualReserva,
      percentualInvestimento,
    },
    create: {
      userId,
      mes,
      ano,
      rendaPlanejada,
      percentualEssencial,
      percentualPessoal,
      percentualReserva,
      percentualInvestimento,
    },
  });

  revalidateFinancialPaths();
  revalidatePath("/planejamento");
}
