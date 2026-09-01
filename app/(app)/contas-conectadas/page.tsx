import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import ConnectedAccountsClient from "./ConnectedAccountsClient";

export default async function ContasConectadasPage() {
  const userId = await getCurrentUserId();

  const conexoes = await prisma.pluggyItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const conexoesIniciais = conexoes.map((c) => ({
    id: c.id,
    connectorName: c.connectorName,
    createdAt: c.createdAt.toISOString(),
    lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Contas Conectadas
        </h1>
        <p className="mt-1 text-sm text-muted">
          Conecte sua conta do Meu Pluggy e importe automaticamente as
          transações dos bancos que você já tem linkados lá
        </p>
      </div>

      <ConnectedAccountsClient conexoesIniciais={conexoesIniciais} />
    </div>
  );
}
