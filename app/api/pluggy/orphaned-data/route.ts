import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { revalidateFinancialPaths } from "@/lib/revalidateFinancialPaths";

/**
 * Apaga transações e investimentos importados do Pluggy que não têm mais
 * nenhuma conexão ativa associada (origem PLUGGY, pluggyItemId null) —
 * dado deixado pra trás por uma desconexão feita antes de existir a opção
 * de apagar junto, ou por uma conexão antiga de antes desse rastreamento
 * existir. Não mexe em lançamentos manuais nem em dados de conexões ainda
 * ativas. Ação permanente, disparada só por um clique explícito do usuário
 * em Contas Conectadas.
 */
export async function DELETE() {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const [resultadoTransacoes, resultadoInvestimentos] = await Promise.all([
    prisma.transaction.deleteMany({
      where: { userId, origem: "PLUGGY", pluggyItemId: null },
    }),
    prisma.investment.deleteMany({
      where: { userId, origem: "PLUGGY", pluggyItemId: null },
    }),
  ]);

  revalidateFinancialPaths();
  revalidatePath("/contas-conectadas");

  return NextResponse.json({
    transacoesApagadas: resultadoTransacoes.count,
    investimentosApagados: resultadoInvestimentos.count,
  });
}
