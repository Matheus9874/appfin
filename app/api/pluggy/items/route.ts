import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getPluggyClient } from "@/lib/pluggy";
import { syncPluggyItem } from "@/lib/pluggySync";
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
