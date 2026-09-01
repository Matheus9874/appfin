import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { syncPluggyItem } from "@/lib/pluggySync";
import { garantirWebhooksRegistrados } from "@/lib/pluggyWebhook";
import { revalidateFinancialPaths } from "@/lib/revalidateFinancialPaths";

const RATE_LIMIT_MAX_CALLS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(
    `pluggy-sync:${userId}`,
    RATE_LIMIT_MAX_CALLS,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Muitas sincronizações. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let pluggyItemId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    pluggyItemId = body?.pluggyItemId ? String(body.pluggyItemId) : null;
  } catch {
    // no body is fine — means "sync everything"
  }

  const itens = await prisma.pluggyItem.findMany({
    where: pluggyItemId ? { id: pluggyItemId, userId } : { userId },
  });

  if (itens.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma conexão bancária encontrada." },
      { status: 404 },
    );
  }

  try {
    let totalTransacoes = 0;
    let totalInvestimentos = 0;
    for (const item of itens) {
      const resultado = await syncPluggyItem(userId, item);
      totalTransacoes += resultado.transacoesImportadas;
      totalInvestimentos += resultado.investimentosImportados;
    }

    // Best-effort: garante que o webhook automático fique registrado assim
    // que APP_URL/PLUGGY_WEBHOOK_SECRET estiverem configurados, sem exigir
    // que o usuário reconecte a conta pra isso acontecer.
    try {
      await garantirWebhooksRegistrados();
    } catch (error) {
      console.error("Pluggy: erro ao registrar webhook.", error);
    }

    revalidateFinancialPaths();
    revalidatePath("/contas-conectadas");

    return NextResponse.json({
      transacoesImportadas: totalTransacoes,
      investimentosImportados: totalInvestimentos,
    });
  } catch (error) {
    console.error("Pluggy: erro ao sincronizar transações.", error);
    return NextResponse.json(
      { error: "Não foi possível sincronizar agora. Tente novamente." },
      { status: 503 },
    );
  }
}
