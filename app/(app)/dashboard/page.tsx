import {
  Landmark,
  Minus,
  PieChart,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getMonthlyTotals } from "@/lib/monthlyTotals";
import { getCurrentInvestments, investmentKey } from "@/lib/currentInvestments";
import { calcularProgressoMeta } from "@/lib/goalProgress";
import { getCategoryIcon } from "@/lib/categoryIcons";
import InfoTooltip from "@/app/components/InfoTooltip";
import InsightsSection from "./InsightsSection";
import MonthlyBarChart, { type MonthlyChartPoint } from "./MonthlyBarChart";
import StatCard from "./StatCard";
import type { TipoTransacao } from "@/app/generated/prisma/enums";

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

function sumFor(
  rows: { tipo: TipoTransacao; _sum: { valor: unknown } }[],
  tipo: TipoTransacao,
) {
  const row = rows.find((r) => r.tipo === tipo);
  return Number(row?._sum.valor ?? 0);
}

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const now = new Date();
  const inicioDoMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const inicioDoProximoMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    totalPorTipo,
    totaisMensais,
    investimentos,
    despesasPorCategoriaDoMes,
    categorias,
    goals,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["tipo"],
      where: { userId },
      _sum: { valor: true },
    }),
    getMonthlyTotals(userId, 6),
    prisma.investment.findMany({
      where: { userId },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        tipo: "DESPESA",
        data: { gte: inicioDoMes, lt: inicioDoProximoMes },
      },
      _sum: { valor: true },
    }),
    prisma.category.findMany({ where: { userId } }),
    prisma.goal.findMany({
      where: { userId },
      include: { investment: true },
      orderBy: { prazo: "asc" },
      take: 3,
    }),
  ]);

  const totalReceitas = sumFor(totalPorTipo, "RECEITA");
  const totalDespesas = sumFor(totalPorTipo, "DESPESA");
  const saldoTotal = totalReceitas - totalDespesas;

  const investimentosAtuais = getCurrentInvestments(investimentos);
  const valorInvestimentos = investimentosAtuais.reduce(
    (acc, i) => acc + Number(i.valor),
    0,
  );
  const patrimonioTotal = saldoTotal + valorInvestimentos;

  const chartData: MonthlyChartPoint[] = totaisMensais.map((m) => ({
    mes: m.label,
    receitas: m.receitas,
    despesas: m.despesas,
  }));

  const indiceMesAtual = totaisMensais.findIndex(
    (m) =>
      m.data.getFullYear() === now.getFullYear() &&
      m.data.getMonth() === now.getMonth(),
  );
  const mesAtual = totaisMensais[indiceMesAtual];
  const mesAnterior =
    indiceMesAtual > 0 ? totaisMensais[indiceMesAtual - 1] : undefined;
  const receitasDoMes = mesAtual?.receitas ?? 0;
  const despesasDoMes = mesAtual?.despesas ?? 0;
  const saldoDoMes = receitasDoMes - despesasDoMes;

  const variacaoDespesas =
    mesAnterior && mesAnterior.despesas > 0
      ? ((despesasDoMes - mesAnterior.despesas) / mesAnterior.despesas) * 100
      : null;

  const categoriaMap = new Map(categorias.map((c) => [c.id, c]));
  const top5Despesas = despesasPorCategoriaDoMes
    .map((d) => ({
      categoria: categoriaMap.get(d.categoryId),
      valor: Number(d._sum.valor ?? 0),
    }))
    .filter((d) => d.categoria)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
  const maiorDespesaDoTop5 = top5Despesas[0]?.valor ?? 0;

  const valorAtualPorChave = new Map(
    investimentosAtuais.map((inv) => [investmentKey(inv), Number(inv.valor)]),
  );
  const metasProximas = goals.map((goal) =>
    calcularProgressoMeta(goal, valorAtualPorChave, now),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Visão geral das suas finanças
        </p>
      </div>

      <InsightsSection />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Saldo total"
          value={formatMoeda(saldoTotal)}
          icon={Wallet}
          tone="accent"
          info="Soma de todas as receitas menos todas as despesas já registradas, desde a primeira transação. É o saldo acumulado, não o saldo de um período específico."
        />
        <StatCard
          label="Patrimônio total"
          value={formatMoeda(patrimonioTotal)}
          icon={Landmark}
          tone="accent"
          info="Saldo total mais o valor mais recente de cada investimento e reserva cadastrados. Uma visão geral de quanto você tem, somando conta corrente e investimentos."
        />
      </div>

      <section>
        <h2 className="mb-4 text-base font-semibold">Resumo do mês atual</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <StatCard
            label="Despesas vs. mês anterior"
            value={
              variacaoDespesas === null
                ? "Sem comparação"
                : `${Math.abs(variacaoDespesas).toFixed(0)}% ${variacaoDespesas >= 0 ? "acima" : "abaixo"}`
            }
            icon={
              variacaoDespesas === null
                ? Minus
                : variacaoDespesas >= 0
                  ? TrendingUp
                  : TrendingDown
            }
            tone={
              variacaoDespesas === null
                ? "neutral"
                : variacaoDespesas >= 0
                  ? "negative"
                  : "positive"
            }
            info="Compara o total de despesas deste mês com o total de despesas do mês anterior."
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold">
            <PieChart size={16} className="text-muted" />
            Maiores despesas do mês
          </h2>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            {top5Despesas.length === 0 ? (
              <p className="text-sm text-muted">
                Nenhuma despesa registrada este mês.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {top5Despesas.map(({ categoria, valor }) => {
                  if (!categoria) return null;
                  const Icon = getCategoryIcon(categoria.nome);
                  const pct =
                    maiorDespesaDoTop5 > 0
                      ? (valor / maiorDespesaDoTop5) * 100
                      : 0;
                  return (
                    <li key={categoria.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 font-medium">
                          <Icon size={14} className="text-muted" />
                          {categoria.nome}
                        </span>
                        <span className="tabular-nums text-muted">
                          {formatMoeda(valor)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold">
            <Target size={16} className="text-muted" />
            Metas mais próximas
          </h2>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            {metasProximas.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma meta cadastrada.</p>
            ) : (
              <ul className="flex flex-col gap-5">
                {metasProximas.map((m) => (
                  <li key={m.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{m.nome}</span>
                      <span className="text-xs text-muted">
                        Prazo: {formatData(m.prazo)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className={`h-full rounded-full ${
                          m.percentual >= 100 ? "bg-positive" : "bg-accent"
                        }`}
                        style={{ width: `${m.percentual}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted">
                      {m.percentual.toFixed(0)}% concluído
                      {m.restante > 0 &&
                        ` · faltam ${formatMoeda(m.restante)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
