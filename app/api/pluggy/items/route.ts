import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getPluggyClient } from "@/lib/pluggy";
import { syncPluggyItem } from "@/lib/pluggySync";
import { garantirWebhooksRegistrados } from "@/lib/pluggyWebhook";
import { revalidateFinancialPaths } from "@/lib/revalidateFinancialPaths";

// Trial Pluggy clients only allow item creation through connector 200
// ("MeuPluggy"). Re-checked here even though the widget is already locked to
// it, in case that ever changes without a matching backend update.
const MEU_PLUGGY_CONNECTOR_ID = 200;

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let itemId: string;
  try {
    const body = await request.json();
    itemId = String(body?.itemId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!itemId) {
    return NextResponse.json({ error: "itemId é obrigatório." }, { status: 400 });
  }

  try {
    const client = getPluggyClient();
    const item = await client.fetchItem(itemId);

    // The connect token was created with clientUserId = our userId, and
    // Pluggy echoes it back on the item — verifying it here prevents anyone
    // from registering an item that wasn't created for their own session.
    if (item.clientUserId !== userId) {
      return NextResponse.json(
        { error: "Esta conexão não pertence à sua conta." },
        { status: 403 },
      );
    }

    if (item.connector.id !== MEU_PLUGGY_CONNECTOR_ID) {
      return NextResponse.json(
        { error: "Só é possível conectar contas via Meu Pluggy." },
        { status: 400 },
      );
    }

    const pluggyItem = await prisma.pluggyItem.upsert({
      where: { pluggyItemId: item.id },
      update: { connectorName: item.connector.name },
      create: {
        userId,
        pluggyItemId: item.id,
        connectorName: item.connector.name,
      },
    });

    const resultado = await syncPluggyItem(userId, pluggyItem);

    // Best-effort: se APP_URL/PLUGGY_WEBHOOK_SECRET não estiverem
    // configurados (ex.: ambiente local), não deve quebrar a conexão — só
    // significa que a sincronização automática fica desativada.
    try {
      await garantirWebhooksRegistrados();
    } catch (error) {
      console.error("Pluggy: erro ao registrar webhook.", error);
    }

    revalidateFinancialPaths();
    revalidatePath("/contas-conectadas");

    return NextResponse.json({
      connectorName: pluggyItem.connectorName,
      transacoesImportadas: resultado.transacoesImportadas,
      investimentosImportados: resultado.investimentosImportados,
    });
  } catch (error) {
    console.error("Pluggy: erro ao registrar item.", error);
    return NextResponse.json(
      { error: "Não foi possível concluir a conexão com o banco." },
      { status: 503 },
    );
  }
}

/**
 * Desconecta uma conta do Pluggy: revoga o item do lado do Pluggy (melhor
 * esforço — se já não existir lá ou a chamada falhar, segue mesmo assim
 * pra garantir que o usuário sempre consiga se desconectar do próprio
 * ponto de vista) e remove o PluggyItem local, que em cascata remove as
 * PluggyAccount associadas. Não apaga transações/investimentos já
 * importados — eles continuam como histórico, só param de ser atualizados.
 */
export async function DELETE(request: Request) {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let id: string;
  try {
    const body = await request.json();
    id = String(body?.id ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!id) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }

  const pluggyItem = await prisma.pluggyItem.findFirst({
    where: { id, userId },
  });
  if (!pluggyItem) {
    return NextResponse.json({ error: "Conexão não encontrada." }, { status: 404 });
  }

  try {
    const client = getPluggyClient();
    await client.deleteItem(pluggyItem.pluggyItemId);
  } catch (error) {
    console.error("Pluggy: erro ao revogar item no Pluggy (seguindo com a remoção local).", error);
  }

  await prisma.pluggyItem.delete({ where: { id: pluggyItem.id } });

  revalidatePath("/contas-conectadas");
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true });
}
