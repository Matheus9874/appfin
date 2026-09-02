import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import ConnectedAccountsClient from "./ConnectedAccountsClient";

export default async function ContasConectadasPage() {
  const userId = await getCurrentUserId();

  const conexoes = await prisma.pluggyItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const conexoesIniciais = await Promise.all(
    conexoes.map(async (c) => {
      const [transacoesCount, investimentosCount] = await Promise.all([
        prisma.transaction.count({ where: { userId, pluggyItemId: c.id } }),
        prisma.investment.count({ where: { userId, pluggyItemId: c.id } }),
      ]);
      return {
        id: c.id,
        connectorName: c.connectorName,
        createdAt: c.createdAt.toISOString(),
        lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
        transacoesCount,
        investimentosCount,
      };
    }),
  );

  // Transações/investimentos importados do Pluggy sem nenhuma conexão ativa
  // (a conexão original já foi desconectada sem apagar os dados na época,
  // ou é dado antigo de antes de rastrear a conexão de origem) — mostra uma
  // opção separada pra limpar esse resíduo, já que não tem mais nenhum
  // "Desconectar" pra oferecer essa escolha.
  const [transacoesOrfasCount, investimentosOrfaosCount] = await Promise.all([
    prisma.transaction.count({ where: { userId, origem: "PLUGGY", pluggyItemId: null } }),
    prisma.investment.count({ where: { userId, origem: "PLUGGY", pluggyItemId: null } }),
  ]);

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

      <ConnectedAccountsClient
        conexoesIniciais={conexoesIniciais}
        dadosOrfaos={{
          transacoesCount: transacoesOrfasCount,
          investimentosCount: investimentosOrfaosCount,
        }}
      />
    </div>
  );
}
