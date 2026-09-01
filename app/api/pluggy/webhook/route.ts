import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncPluggyItem } from "@/lib/pluggySync";
import { revalidateFinancialPaths } from "@/lib/revalidateFinancialPaths";

// Eventos que indicam que há dado novo pra puxar. Outros eventos do Pluggy
// (pagamentos, boletos etc.) não se aplicam a este app e são só confirmados.
const EVENTOS_QUE_DISPARAM_SYNC = new Set([
  "item/updated",
  "transactions/created",
  "item/login_succeeded",
]);

/**
 * Endpoint público chamado pelo Pluggy quando há novidade em um item
 * conectado (ver lib/pluggyWebhook.ts para o registro do webhook).
 * Autenticado por um segredo compartilhado enviado como header customizado
 * na criação do webhook — não é uma rota autenticada por sessão de usuário.
 */
export async function POST(request: Request) {
  const secretEsperado = process.env.PLUGGY_WEBHOOK_SECRET;
  if (!secretEsperado || request.headers.get("x-webhook-secret") !== secretEsperado) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let payload: { event?: string; itemId?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  if (!payload.event || !payload.itemId || !EVENTOS_QUE_DISPARAM_SYNC.has(payload.event)) {
    return NextResponse.json({ ok: true });
  }

  const pluggyItem = await prisma.pluggyItem.findUnique({
    where: { pluggyItemId: payload.itemId },
  });
  if (!pluggyItem) {
    // Item desconhecido (ex.: já desconectado por aqui) — confirma sem
    // tentar de novo, já que não há o que sincronizar.
    return NextResponse.json({ ok: true });
  }

  try {
    await syncPluggyItem(pluggyItem.userId, pluggyItem);
    revalidateFinancialPaths();
    revalidatePath("/contas-conectadas");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Pluggy: erro ao sincronizar via webhook.", error);
    return NextResponse.json({ error: "Falha ao sincronizar." }, { status: 500 });
  }
}
