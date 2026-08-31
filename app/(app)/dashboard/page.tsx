import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Landmark,
  Lock,
  Minus,
  PieChart,
  PiggyBank,
  Scale,
  Shuffle,
  Target,
  TrendingDown,
  TrendingUp,
  Umbrella,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getMonthlyTotals } from "@/lib/monthlyTotals";
import { getCurrentInvestments, investmentKey } from "@/lib/currentInvestments";
import { calcularProgressoMeta } from "@/lib/goalProgress";
import { calcularSaudeFinanceira } from "@/lib/financialHealth";
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

  const inicioJanelaSaude = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalPorTipo,
    totaisMensais,
    investimentos,
    despesasPorCategoriaDoMes,
    despesasPorNaturezaJanela,
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
    prisma.transaction.findMany({
      where: {
        userId,
        tipo: "DESPESA",
        data: { gte: inicioJanelaSaude, lt: inicioDoProximoMes },
      },
      select: { valor: true, category: { select: { natureza: true } } },
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

  const mesesConsiderados = totaisMensais.length || 1;
  const rendaMedia =
    totaisMensais.reduce((acc, m) => acc + m.receitas, 0) / mesesConsiderados;
  const despesaMedia =
    totaisMensais.reduce((acc, m) => acc + m.despesas, 0) / mesesConsiderados;
  const despesaFixaMedia =
    despesasPorNaturezaJanela
      .filter((t) => t.category.natureza === "FIXO")
      .reduce((acc, t) => acc + Number(t.valor), 0) / mesesConsiderados;
  const despesaVariavelMedia =
    despesasPorNaturezaJanela
      .filter((t) => t.category.natureza === "VARIAVEL")
      .reduce((acc, t) => acc + Number(t.valor), 0) / mesesConsiderados;
  const reservaEmergencia = investimentosAtuais
    .filter((i) => i.tipo === "RESERVA_EMERGENCIA")
    .reduce((acc, i) => acc + Number(i.valor), 0);

  const saudeFinanceira = calcularSaudeFinanceira({
    rendaMedia,
    despesaMedia,
    despesaFixaMedia,
    despesaVariavelMedia,
    reservaEmergencia,
  });

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Saldo total"
          value={formatMoeda(saldoTotal)}
          icon={Wallet}
          tone="accent"
          info="Soma de todas as receitas menos todas as despesas já registradas, desde a primeira transação. É o saldo acumulado, não o saldo de um período específico. Não inclui investimentos."
        />
        <StatCard
          label="Total investido"
          value={formatMoeda(valorInvestimentos)}
          icon={PiggyBank}
          tone="accent"
          info="Valor mais recente de cada investimento e reserva cadastrados, somados. Não inclui o saldo em conta."
        />
        <StatCard
          label="Patrimônio total"
          value={formatMoeda(patrimonioTotal)}
          icon={Landmark}
          tone="accent"
          info="Saldo total mais o valor investido. Uma visão geral de quanto você tem, somando conta corrente e investimentos."
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
        <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold">
          <HeartPulse size={16} className="text-muted" />
          Saúde financeira
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Despesas fixas"
            value={`${saudeFinanceira.percentualDespesasFixas.toFixed(0)}%`}
            icon={Lock}
            tone="accent"
            info="Percentual da sua renda média mensal comprometido com despesas de categorias marcadas como custo fixo, na média dos últimos meses."
          />
          <StatCard
            label="Despesas variáveis"
            value={`${saudeFinanceira.percentualDespesasVariaveis.toFixed(0)}%`}
            icon={Shuffle}
            tone="accent"
            info="Percentual da sua renda média mensal direcionado a despesas de categorias marcadas como custo variável, na média dos últimos meses."
          />
          <StatCard
            label="Reserva de emergência"
            value={
              saudeFinanceira.mesesReservaEmergencia === null
                ? "Sem dados"
                : `${saudeFinanceira.mesesReservaEmergencia.toFixed(1)} meses`
            }
            icon={Umbrella}
            tone="accent"
            info="Valor mais recente dos seus investimentos de reserva de emergência, dividido pela sua despesa média mensal. O recomendado geralmente é entre 3 e 6 meses de despesas."
          />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {saudeFinanceira.mensagens.map((mensagem) => {
            const positiva = mensagem.tipo === "positiva";
            const Icon = positiva ? CheckCircle2 : AlertTriangle;
            return (
              <div
                key={mensagem.texto}
                className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
                  positiva
                    ? "bg-positive-soft text-positive"
                    : "bg-warning-soft text-warning"
                }`}
              >
                <Icon size={16} className="mt-0.5 shrink-0" />
                <span>{mensagem.texto}</span>
              </div>
            );
          })}
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
