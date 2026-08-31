"use client";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calculator,
  Receipt,
  TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import InfoTooltip from "@/app/components/InfoTooltip";
import {
  simularCompraFinanciamento,
  type Classificacao,
  type TipoTaxa,
} from "@/lib/purchaseFinancing";
import StatCard from "../../dashboard/StatCard";

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(valor: number) {
  return `${valor.toFixed(0)}%`;
}

const CLASSIFICACAO_INFO: Record<
  Classificacao,
  { emoji: string; label: string; className: string }
> = {
  confortavel: {
    emoji: "🟢",
    label: "Confortável",
    className: "border-positive/30 bg-positive-soft text-positive",
  },
  moderado: {
    emoji: "🟡",
    label: "Moderado",
    className: "border-warning/30 bg-warning-soft text-warning",
  },
  alto: {
    emoji: "🔴",
    label: "Alto comprometimento",
    className: "border-negative/30 bg-negative-soft text-negative",
  },
};

const CLASSIFICACAO_TOOLTIP =
  "Classificação baseada no percentual da sua renda mensal comprometido com despesas totais (incluindo a nova parcela):\n\n🟢 Confortável: até 30% da renda.\n🟡 Moderado: de 30% a 50%.\n🔴 Alto comprometimento: acima de 50%.";

function ImpactRow({
  label,
  antes,
  depois,
  piorou,
}: {
  label: string;
  antes: string;
  depois: string;
  piorou: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0 last:pb-0">
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-2 text-sm tabular-nums">
        <span className="text-muted">{antes}</span>
        <ArrowRight size={14} className="text-muted" />
        <span
          className={`font-semibold ${piorou ? "text-negative" : "text-positive"}`}
        >
          {depois}
        </span>
      </span>
    </div>
  );
}

export default function PurchaseFinancingSimulator({
  rendaMensal,
  despesasAtuais,
  metas,
}: {
  rendaMensal: number;
  despesasAtuais: number;
  metas: { id: string; nome: string; porMes: number }[];
}) {
  const [valorCompra, setValorCompra] = useState(5000);
  const [entrada, setEntrada] = useState(1000);
  const [parcelas, setParcelas] = useState(12);
  const [taxaJuros, setTaxaJuros] = useState(2);
  const [tipoTaxa, setTipoTaxa] = useState<TipoTaxa>("mensal");
  const [custosAdicionais, setCustosAdicionais] = useState(0);

  const aportesNecessariosMetas = useMemo(
    () => metas.reduce((acc, m) => acc + m.porMes, 0),
    [metas],
  );

  const resultado = useMemo(
    () =>
      simularCompraFinanciamento({
        dadosCompra: {
          valorCompra: Math.max(0, valorCompra || 0),
          entrada: Math.max(0, entrada || 0),
          parcelas: Math.max(1, parcelas || 1),
          taxaJuros: Math.max(0, taxaJuros || 0),
          tipoTaxa,
          custosAdicionais: Math.max(0, custosAdicionais || 0),
        },
        rendaMensal,
        despesasAtuais,
        aportesNecessariosMetas,
      }),
    [
      valorCompra,
      entrada,
      parcelas,
      taxaJuros,
      tipoTaxa,
      custosAdicionais,
      rendaMensal,
      despesasAtuais,
      aportesNecessariosMetas,
    ],
  );

  const { financiamento, orcamento, classificacao, metas: impactoMetas } =
    resultado;
  const classInfo = CLASSIFICACAO_INFO[classificacao];
  const semRenda = rendaMensal <= 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="valorCompra" className={labelClass}>
              Valor da compra (R$)
            </label>
            <input
              id="valorCompra"
              type="number"
              min="0"
              step="100"
              value={valorCompra}
              onChange={(e) => setValorCompra(Number(e.target.value))}
              className={controlClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="entrada" className={labelClass}>
              Entrada (R$)
            </label>
            <input
              id="entrada"
              type="number"
              min="0"
              step="100"
              value={entrada}
              onChange={(e) => setEntrada(Number(e.target.value))}
              className={controlClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="parcelas" className={labelClass}>
              Número de parcelas
            </label>
            <input
              id="parcelas"
              type="number"
              min="1"
              max="360"
              step="1"
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              className={controlClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="taxaJuros" className={labelClass}>
              Taxa de juros
            </label>
            <div className="flex gap-2">
              <input
                id="taxaJuros"
                type="number"
                min="0"
                step="0.1"
                value={taxaJuros}
                onChange={(e) => setTaxaJuros(Number(e.target.value))}
                className={`${controlClass} flex-1`}
              />
              <select
                aria-label="Periodicidade da taxa de juros"
                value={tipoTaxa}
                onChange={(e) => setTipoTaxa(e.target.value as TipoTaxa)}
                className={controlClass}
              >
                <option value="mensal">% a.m.</option>
                <option value="anual">% a.a.</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="custosAdicionais"
              className="flex items-center gap-1.5"
            >
              <span className={labelClass}>Custos adicionais (R$)</span>
              <InfoTooltip text="Taxas, seguros, documentação e outros custos extras que entram no valor financiado." />
            </label>
            <input
              id="custosAdicionais"
              type="number"
              min="0"
              step="50"
              value={custosAdicionais}
              onChange={(e) => setCustosAdicionais(Number(e.target.value))}
              className={controlClass}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Valor financiado"
          value={formatMoeda(financiamento.valorFinanciado)}
          icon={Banknote}
          tone="neutral"
        />
        <StatCard
          label="Valor da parcela"
          value={formatMoeda(financiamento.valorParcela)}
          icon={Calculator}
          tone="accent"
        />
        <StatCard
          label="Total pago"
          value={formatMoeda(financiamento.totalPago)}
          icon={Receipt}
          tone="neutral"
        />
        <StatCard
          label="Total de juros"
          value={formatMoeda(financiamento.totalJuros)}
          icon={TrendingDown}
          tone="negative"
        />
      </div>

      <div
        className={`flex flex-col gap-3 rounded-2xl border p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between ${classInfo.className}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{classInfo.emoji}</span>
          <div>
            <p className="text-sm font-semibold">{classInfo.label}</p>
            <p className="text-xs opacity-80">
              {semRenda
                ? "Cadastre receitas neste mês para uma classificação precisa."
                : `${formatPercent(orcamento.comprometimentoApos)} da sua renda mensal comprometida após a compra.`}
            </p>
          </div>
        </div>
        <InfoTooltip text={CLASSIFICACAO_TOOLTIP} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold">
          Impacto no seu orçamento mensal
        </h3>
        {semRenda ? (
          <p className="text-sm text-muted">
            Nenhuma receita registrada este mês — cadastre suas receitas em
            Transações para ver o impacto real dessa compra no seu orçamento.
          </p>
        ) : (
          <div className="flex flex-col">
            <ImpactRow
              label="Renda comprometida"
              antes={formatPercent(orcamento.comprometimentoAtual)}
              depois={formatPercent(orcamento.comprometimentoApos)}
              piorou={orcamento.comprometimentoApos > orcamento.comprometimentoAtual}
            />
            <ImpactRow
              label="Sobra mensal"
              antes={formatMoeda(orcamento.sobraAtual)}
              depois={formatMoeda(orcamento.sobraApos)}
              piorou={orcamento.sobraApos < orcamento.sobraAtual}
            />
            <ImpactRow
              label="Capacidade de poupança"
              antes={formatPercent(orcamento.capacidadePoupancaAtual)}
              depois={formatPercent(orcamento.capacidadePoupancaApos)}
              piorou={
                orcamento.capacidadePoupancaApos <
                orcamento.capacidadePoupancaAtual
              }
            />
          </div>
        )}
      </div>

      {!semRenda && impactoMetas.aportesNecessarios > 0 && (
        <div
          className={`flex items-start gap-2 rounded-lg px-4 py-3 text-xs ${
            impactoMetas.metasEmRisco
              ? "bg-negative-soft text-negative"
              : "bg-positive-soft text-positive"
          }`}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {impactoMetas.metasEmRisco
              ? `Suas metas atuais (${metas.map((m) => m.nome).join(", ")}) precisam de ${formatMoeda(
                  impactoMetas.aportesNecessarios,
                )}/mês para ficarem no prazo. Com a sobra pós-compra, faltariam ${formatMoeda(
                  impactoMetas.deficit,
                )}/mês para mantê-las.`
              : `Mesmo após essa compra, sua sobra mensal ainda cobre os ${formatMoeda(
                  impactoMetas.aportesNecessarios,
                )}/mês necessários para suas metas (${metas
                  .map((m) => m.nome)
                  .join(", ")}).`}
          </span>
        </div>
      )}

      <p className="text-xs text-muted">
        Esta é uma simulação educativa. A renda e as despesas atuais usadas
        no cálculo vêm das suas transações deste mês. O simulador não
        registra nenhuma transação, dívida ou financiamento automaticamente.
      </p>
    </div>
  );
}
