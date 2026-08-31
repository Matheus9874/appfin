"use client";

import { AlertTriangle, Coins, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import InfoTooltip from "../components/InfoTooltip";
import StatCard from "../dashboard/StatCard";
import InvestmentChart, { type InvestmentChartPoint } from "./InvestmentChart";

type Preset = {
  id: string;
  label: string;
  taxa: number;
  descricao: string;
  risco?: boolean;
};

const PRESETS: Preset[] = [
  {
    id: "poupanca",
    label: "Poupança (~6% a.a.)",
    taxa: 6,
    descricao:
      "Aplicação mais tradicional dos bancos: baixa rentabilidade, mas liquidez imediata e garantia do FGC.",
  },
  {
    id: "tesouro",
    label: "Tesouro Direto / CDB (~11% a.a.)",
    taxa: 11,
    descricao:
      "Renda fixa considerada de baixo risco: títulos públicos ou empréstimos a bancos, geralmente com garantia do FGC.",
  },
  {
    id: "renda-variavel",
    label: "Renda Variável (~13% a.a.)",
    taxa: 13,
    descricao:
      "Ações, fundos imobiliários e afins: maior potencial de retorno, mas com risco real de perda.",
    risco: true,
  },
];

const TAXA_TOOLTIP_TEXT = PRESETS.map(
  (p) => `${p.label.replace(/\s*\(~.*\)$/, "")}: ${p.descricao}`,
).join("\n\n");

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function simularJurosCompostos({
  valorInicial,
  aporteMensal,
  taxaAnualPercent,
  prazoAnos,
}: {
  valorInicial: number;
  aporteMensal: number;
  taxaAnualPercent: number;
  prazoAnos: number;
}) {
  const taxaMensal = Math.pow(1 + taxaAnualPercent / 100, 1 / 12) - 1;
  const totalMeses = Math.max(1, Math.round(prazoAnos * 12));

  let saldo = valorInicial;
  let totalAportado = valorInicial;

  const pontos: InvestmentChartPoint[] = [
    { ano: 0, totalAportado, totalAcumulado: saldo },
  ];

  for (let mes = 1; mes <= totalMeses; mes++) {
    saldo = saldo * (1 + taxaMensal) + aporteMensal;
    totalAportado += aporteMensal;

    if (mes % 12 === 0) {
      pontos.push({ ano: mes / 12, totalAportado, totalAcumulado: saldo });
    }
  }

  const totalFinal = saldo;
  const totalRendimentos = totalFinal - totalAportado;

  return { totalFinal, totalAportado, totalRendimentos, pontos };
}

export default function InvestmentSimulator() {
  const [valorInicial, setValorInicial] = useState(1000);
  const [aporteMensal, setAporteMensal] = useState(200);
  const [taxaAnual, setTaxaAnual] = useState(11);
  const [prazoAnos, setPrazoAnos] = useState(10);
  const [presetSelecionado, setPresetSelecionado] = useState<string | null>(
    "tesouro",
  );

  const resultado = useMemo(
    () =>
      simularJurosCompostos({
        valorInicial: Math.max(0, valorInicial || 0),
        aporteMensal: Math.max(0, aporteMensal || 0),
        taxaAnualPercent: taxaAnual || 0,
        prazoAnos: Math.max(1, prazoAnos || 1),
      }),
    [valorInicial, aporteMensal, taxaAnual, prazoAnos],
  );

  const presetAtivo = PRESETS.find((p) => p.id === presetSelecionado);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="valorInicial" className={labelClass}>
              Valor inicial (R$)
            </label>
            <input
              id="valorInicial"
              type="number"
              min="0"
              step="100"
              value={valorInicial}
              onChange={(e) => setValorInicial(Number(e.target.value))}
              className={controlClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="aporteMensal" className={labelClass}>
              Aporte mensal (R$)
            </label>
            <input
              id="aporteMensal"
              type="number"
              min="0"
              step="50"
              value={aporteMensal}
              onChange={(e) => setAporteMensal(Number(e.target.value))}
              className={controlClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="taxaAnual" className="flex items-center gap-1.5">
              <span className={labelClass}>Taxa de rendimento anual (%)</span>
              <InfoTooltip text={TAXA_TOOLTIP_TEXT} />
            </label>
            <input
              id="taxaAnual"
              type="number"
              min="0"
              step="0.1"
              value={taxaAnual}
              onChange={(e) => {
                setTaxaAnual(Number(e.target.value));
                setPresetSelecionado(null);
              }}
              className={controlClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prazoAnos" className={labelClass}>
              Prazo (anos)
            </label>
            <input
              id="prazoAnos"
              type="number"
              min="1"
              max="60"
              step="1"
              value={prazoAnos}
              onChange={(e) => setPrazoAnos(Number(e.target.value))}
              className={controlClass}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <span className={labelClass}>Referências de rendimento</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const ativo = presetSelecionado === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.descricao}
                  onClick={() => {
                    setTaxaAnual(preset.taxa);
                    setPresetSelecionado(preset.id);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    ativo
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {presetAtivo?.risco && (
            <div className="mt-1 flex items-start gap-2 rounded-lg bg-negative-soft px-3 py-2 text-xs text-negative">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                13% a.a. é apenas uma estimativa de referência para renda
                variável. Rentabilidade passada não garante rentabilidade
                futura, e esse tipo de investimento envolve risco real de
                perda.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Valor total acumulado"
          value={formatMoeda(resultado.totalFinal)}
          icon={Wallet}
          tone="accent"
        />
        <StatCard
          label="Total investido (aportes)"
          value={formatMoeda(resultado.totalAportado)}
          icon={Coins}
          tone="neutral"
        />
        <StatCard
          label="Total em rendimentos"
          value={formatMoeda(resultado.totalRendimentos)}
          icon={TrendingUp}
          tone="positive"
          info="A parte do valor final que veio dos juros, não do seu bolso: total acumulado menos tudo o que você aportou."
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">
          Evolução do valor acumulado
        </h3>
        <InvestmentChart data={resultado.pontos} />
      </div>

      <p className="text-xs text-muted">
        Esta é uma simulação educativa baseada em juros compostos com aportes
        mensais fixos e taxa de rendimento constante. Não considera
        inflação, impostos ou taxas, e não constitui recomendação de
        investimento.
      </p>
    </div>
  );
}
