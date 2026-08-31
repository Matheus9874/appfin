import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getMonthlyTotals } from "@/lib/monthlyTotals";
import { getCurrentInvestments, investmentKey } from "@/lib/currentInvestments";
import { calcularProgressoMeta } from "@/lib/goalProgress";
import ReportHeader from "../ReportHeader";
import PurchaseFinancingSimulator from "./PurchaseFinancingSimulator";

export default async function SimuladorCompraPage() {
  const userId = await getCurrentUserId();
  const agora = new Date();

  const [totaisMesAtual, goals, investimentos] = await Promise.all([
    getMonthlyTotals(userId, 1),
    prisma.goal.findMany({
      where: { userId },
      include: { investment: true },
      orderBy: { prazo: "asc" },
    }),
    prisma.investment.findMany({
      where: { userId },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
  ]);

  const mesAtual = totaisMesAtual[totaisMesAtual.length - 1];
  const rendaMensal = mesAtual?.receitas ?? 0;
  const despesasAtuais = mesAtual?.despesas ?? 0;

  const investimentosAtuais = getCurrentInvestments(investimentos);
  const valorAtualPorChave = new Map(
    investimentosAtuais.map((inv) => [investmentKey(inv), Number(inv.valor)]),
  );

  const metas = goals
    .map((goal) => calcularProgressoMeta(goal, valorAtualPorChave, agora))
    .filter((m) => m.porMes !== null && m.porMes > 0)
    .map((m) => ({ id: m.id, nome: m.nome, porMes: m.porMes as number }));

  return (
    <div className="flex flex-col gap-8">
      <ReportHeader
        title="Simulador de Compra e Financiamento"
        description="Veja o impacto real de uma compra parcelada no seu orçamento antes de assumir o compromisso."
      />
      <PurchaseFinancingSimulator
        rendaMensal={rendaMensal}
        despesasAtuais={despesasAtuais}
        metas={metas}
      />
    </div>
  );
}
