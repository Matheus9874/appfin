"use client";

import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Lock,
  Minus,
  PieChart,
  Scale,
  Shuffle,
  TrendingDown,
  TrendingUp,
  Umbrella,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { calcularSaudeFinanceira } from "@/lib/financialHealth";
import { getCategoryIcon } from "@/lib/categoryIcons";
import MonthlyBarChart, { type MonthlyChartPoint } from "./MonthlyBarChart";
import StatCard from "./StatCard";
import type { MeioPagamento, NaturezaCusto } from "@/app/generated/prisma/enums";

type DespesaDetalhada = {
  valor: number;
  mesKey: string;
  categoryId: string;
  meioPagamento: MeioPagamento | null;
  natureza: NaturezaCusto | null;
};

type MesReceita = {
  mesKey: string;
  label: string;
  receitas: number;
};

type FiltroCartao = "todas" | "somente-cartao" | "sem-cartao";

const FILTROS: { key: FiltroCartao; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "somente-cartao", label: "Somente cartão de crédito" },
  { key: "sem-cartao", label: "Sem cartão de crédito" },
];

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function DashboardDespesasSection({
  despesasDetalhadas,
  totaisMensais,
  categoriaMap,
  dataReferenciaMesKey,
  mesAtualLabelCompleto,
  rendaMedia,
  reservaEmergencia,
  children,
  metasSection,
}: {
  despesasDetalhadas: DespesaDetalhada[];
  totaisMensais: MesReceita[];
  categoriaMap: Record<string, string>;
  dataReferenciaMesKey: string;
  mesAtualLabelCompleto: string;
  rendaMedia: number;
  reservaEmergencia: number;
  /** Seção "Cartão de crédito" (dado real, não afetado por este filtro) — renderizada entre "Saúde financeira" e o gráfico, mantendo a ordem visual original da página. */
  children?: ReactNode;
  /** Seção "Metas mais próximas" — renderizada ao lado de "Maiores despesas do mês", mantendo o layout de 2 colunas original. */
  metasSection?: ReactNode;
}) {
  const [filtroCartao, setFiltroCartao] = useState<FiltroCartao>("todas");

  const despesasFiltradas = useMemo(() => {
    if (filtroCartao === "somente-cartao") {
      return despesasDetalhadas.filter((d) => d.meioPagamento === "CREDITO");
    }
    if (filtroCartao === "sem-cartao") {
      return despesasDetalhadas.filter((d) => d.meioPagamento !== "CREDITO");
    }
    return despesasDetalhadas;
  }, [despesasDetalhadas, filtroCartao]);

  const despesaPorMes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const d of despesasFiltradas) {
      mapa.set(d.mesKey, (mapa.get(d.mesKey) ?? 0) + d.valor);
    }
    return mapa;
  }, [despesasFiltradas]);

  const mesesConsiderados = totaisMensais.length || 1;

  const chartData: MonthlyChartPoint[] = useMemo(
    () =>
      totaisMensais.map((m) => ({
        mes: m.label,
        receitas: m.receitas,
        despesas: despesaPorMes.get(m.mesKey) ?? 0,
      })),
    [totaisMensais, despesaPorMes],
  );

  const despesaMedia =
    totaisMensais.reduce(
      (acc, m) => acc + (despesaPorMes.get(m.mesKey) ?? 0),
      0,
    ) / mesesConsiderados;

  const despesaFixaMedia =
    despesasFiltradas
      .filter((d) => d.natureza === "FIXO")
      .reduce((acc, d) => acc + d.valor, 0) / mesesConsiderados;

  const despesaVariavelMedia =
    despesasFiltradas
      .filter((d) => d.natureza === "VARIAVEL")
      .reduce((acc, d) => acc + d.valor, 0) / mesesConsiderados;

  const saudeFinanceira = calcularSaudeFinanceira({
    rendaMedia,
    despesaMedia,
    despesaFixaMedia,
    despesaVariavelMedia,
    reservaEmergencia,
  });

  const indiceMesAtual = totaisMensais.findIndex(
    (m) => m.mesKey === dataReferenciaMesKey,
  );
  const mesAtual = totaisMensais[indiceMesAtual];
  const mesAnterior =
    indiceMesAtual > 0 ? totaisMensais[indiceMesAtual - 1] : undefined;
  const receitasDoMes = mesAtual?.receitas ?? 0;
  const despesasDoMes = mesAtual ? (despesaPorMes.get(mesAtual.mesKey) ?? 0) : 0;
  const despesasMesAnterior = mesAnterior
    ? (despesaPorMes.get(mesAnterior.mesKey) ?? 0)
    : 0;
  const saldoDoMes = receitasDoMes - despesasDoMes;

  const variacaoDespesas =
    mesAnterior && despesasMesAnterior > 0
      ? ((despesasDoMes - despesasMesAnterior) / despesasMesAnterior) * 100
      : null;

  const top5Despesas = useMemo(() => {
    if (!mesAtual) return [];
    const porCategoria = new Map<string, number>();
    for (const d of despesasFiltradas) {
      if (d.mesKey !== mesAtual.mesKey) continue;
      porCategoria.set(d.categoryId, (porCategoria.get(d.categoryId) ?? 0) + d.valor);
    }
    return Array.from(porCategoria.entries())
      .map(([categoryId, valor]) => ({
        categoryId,
        nome: categoriaMap[categoryId],
        valor,
      }))
      .filter((d) => d.nome)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [despesasFiltradas, mesAtual, categoriaMap]);
  const maiorDespesaDoTop5 = top5Despesas[0]?.valor ?? 0;

  const filtroAtivo = filtroCartao !== "todas";

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">
          Forma de pagamento
        </span>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltroCartao(f.key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                filtroCartao === f.key
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-base font-semibold">
          Resumo de {mesAtualLabelCompleto}
          {filtroAtivo && (
            <span className="ml-2 text-xs font-normal text-muted">
              (despesas filtradas por forma de pagamento)
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Receitas do mês"
            value={formatMoeda(receitasDoMes)}
            icon={TrendingUp}
            tone="positive"
            info={
              filtroAtivo
                ? "Receitas não são afetadas pelo filtro de forma de pagamento — mostra sempre o total do mês."
                : undefined
            }
          />
          <StatCard
            label="Despesas do mês"
            value={formatMoeda(despesasDoMes)}
            icon={TrendingDown}
            tone="negative"
            info={
              filtroAtivo
                ? `Considerando apenas ${filtroCartao === "somente-cartao" ? "despesas no cartão de crédito" : "despesas fora do cartão de crédito"}.`
                : undefined
            }
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

      {children}

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
                Nenhuma despesa registrada este mês
                {filtroAtivo ? " com esse filtro." : "."}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {top5Despesas.map(({ categoryId, nome, valor }) => {
                  const Icon = getCategoryIcon(nome);
                  const pct =
                    maiorDespesaDoTop5 > 0
                      ? (valor / maiorDespesaDoTop5) * 100
                      : 0;
                  return (
                    <li key={categoryId} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 font-medium">
                          <Icon size={14} className="text-muted" />
                          {nome}
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

        {metasSection}
      </div>
    </>
  );
}
