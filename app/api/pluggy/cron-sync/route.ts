import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncPluggyItem } from "@/lib/pluggySync";
import { revalidateFinancialPaths } from "@/lib/revalidateFinancialPaths";

/**
 * Rede de segurança para quando o webhook do Pluggy falha ou se perde:
 * sincroniza todos os itens conectados de todos os usuários. Chamado pelo
 * Vercel Cron (ver vercel.json) — não é autenticado por sessão, e sim por um
 * segredo compartilhado no header Authorization.
 */
export async function GET(request: Request) {
  const secretEsperado = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secretEsperado || auth !== `Bearer ${secretEsperado}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const itens = await prisma.pluggyItem.findMany();

  let sincronizados = 0;
  let falhas = 0;
  for (const item of itens) {
    try {
      await syncPluggyItem(item.userId, item);
      sincronizados++;
    } catch (error) {
      falhas++;
      console.error(`Pluggy cron: erro ao sincronizar item ${item.id}.`, error);
    }
  }

  if (sincronizados > 0) {
    revalidateFinancialPaths();
    revalidatePath("/contas-conectadas");
  }

  return NextResponse.json({ total: itens.length, sincronizados, falhas });
}
