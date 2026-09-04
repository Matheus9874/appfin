import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { reclassificarTransferenciasInternas } from "@/lib/pluggySync";
import { revalidateFinancialPaths } from "@/lib/revalidateFinancialPaths";

const RATE_LIMIT_MAX_CALLS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Reprocessa transações já importadas do Pluggy que estão marcadas como
 * transferência interna, corrigindo os casos vítimas do falso positivo de
 * `ehPagamentoDeFaturaCartao` já consertado (categoria "05100000" também
 * usada pelo Pluggy pra compras reais no débito). Ação self-service, sob
 * demanda, disparada em Contas Conectadas.
 */
export async function POST() {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(
    `pluggy-reclassify:${userId}`,
    RATE_LIMIT_MAX_CALLS,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  try {
    const resultado = await reclassificarTransferenciasInternas(userId);

    if (resultado.transacoesCorrigidas > 0) {
      revalidateFinancialPaths();
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Pluggy: erro ao reclassificar transferências.", error);
    return NextResponse.json(
      { error: "Não foi possível corrigir agora. Tente novamente." },
      { status: 503 },
    );
  }
}
