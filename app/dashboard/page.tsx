import { Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMonthlyTotals } from "@/lib/monthlyTotals";
import InfoTooltip from "../components/InfoTooltip";
import MonthlyBarChart, { type MonthlyChartPoint } from "./MonthlyBarChart";
import StatCard from "./StatCard";

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function sumFor(
  rows: { tipo: string; _sum: { valor: unknown } }[],
  tipo: string,
) {
  const row = rows.find((r) => r.tipo === tipo);
  return Number(row?._sum.valor ?? 0);
}

export default async function DashboardPage() {
  const now = new Date();

  const [totalPorTipo, totaisMensais] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["tipo"],
      _sum: { valor: true },
    }),
    getMonthlyTotals(6),
  ]);

  const totalReceitas = sumFor(totalPorTipo, "receita");
  const totalDespesas = sumFor(totalPorTipo, "despesa");
  const saldoTotal = totalReceitas - totalDespesas;

  const chartData: MonthlyChartPoint[] = totaisMensais.map((m) => ({
    mes: m.label,
    receitas: m.receitas,
    despesas: m.despesas,
  }));

  const mesAtual = totaisMensais.find(
    (m) =>
      m.data.getFullYear() === now.getFullYear() &&
      m.data.getMonth() === now.getMonth(),
  );
  const receitasDoMes = mesAtual?.receitas ?? 0;
  const despesasDoMes = mesAtual?.despesas ?? 0;
  const saldoDoMes = receitasDoMes - despesasDoMes;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Visão geral das suas finanças
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted">
          <Wallet size={16} />
          Saldo total
          <InfoTooltip text="Soma de todas as receitas menos todas as despesas já registradas, desde a primeira transação. É o saldo acumulado, não o saldo de um período específico." />
        </div>
        <p className="mt-3 text-4xl font-semibold tracking-tight">
          {formatMoeda(saldoTotal)}
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-base font-semibold">Resumo do mês atual</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Receitas do mês"
            value={formatMoeda(receitasDoMes)}
            icon={TrendingUp}
            tone="positive"
          />
          <StatCard
            label="Despesas do mês"
            value={formatMoeda(despesasDoMes)}
            icon={TrendingDown}
            tone="negative"
          />
          <StatCard
            label="Saldo do mês"
            value={formatMoeda(saldoDoMes)}
            icon={Scale}
            tone="accent"
            info="Receitas menos despesas apenas do mês atual — diferente do Saldo total, que é acumulado desde o início."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold">
          Receitas x despesas por mês
        </h2>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted">
              Sem dados suficientes para exibir o gráfico.
            </p>
          ) : (
            <MonthlyBarChart data={chartData} />
          )}
        </div>
      </section>
    </div>
  );
}
