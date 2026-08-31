import { PiggyBank, ShieldCheck, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMonthlyTotals } from "@/lib/monthlyTotals";
import { INVESTMENT_TYPES, INVESTMENT_TYPE_ICONS, INVESTMENT_TYPE_LABELS } from "@/lib/investmentTypes";
import StatCard from "../dashboard/StatCard";
import InfoTooltip from "../components/InfoTooltip";
import InvestmentForm from "./InvestmentForm";
import InvestmentTypePieChart, {
  type InvestmentTypeSlice,
} from "./InvestmentTypePieChart";
import type { InvestmentType } from "@/app/generated/prisma/enums";

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

export default async function ReservaInvestimentosPage() {
  const [investimentos, totaisMensais] = await Promise.all([
    prisma.investment.findMany({
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
    getMonthlyTotals(6),
  ]);

  const maisRecentePorInvestimento = new Map<string, (typeof investimentos)[number]>();
  for (const inv of investimentos) {
    const chave = `${inv.tipo}|${inv.instituicao}|${inv.nome ?? ""}`;
    if (!maisRecentePorInvestimento.has(chave)) {
      maisRecentePorInvestimento.set(chave, inv);
    }
  }

  const investimentosAtuais = Array.from(
    maisRecentePorInvestimento.values(),
  ).sort((a, b) => Number(b.valor) - Number(a.valor));

  const valorTotalConsolidado = investimentosAtuais.reduce(
    (acc, i) => acc + Number(i.valor),
    0,
  );

  const valorPorTipo = new Map<InvestmentType, number>();
  for (const inv of investimentosAtuais) {
    valorPorTipo.set(
      inv.tipo,
      (valorPorTipo.get(inv.tipo) ?? 0) + Number(inv.valor),
    );
  }

  const distribuicaoPorTipo: InvestmentTypeSlice[] = INVESTMENT_TYPES.filter(
    (t) => (valorPorTipo.get(t) ?? 0) > 0,
  ).map((t) => ({ tipo: t, valor: valorPorTipo.get(t) ?? 0 }));

  const valorReserva = valorPorTipo.get("RESERVA_EMERGENCIA") ?? 0;
  const despesaMediaMensal =
    totaisMensais.length > 0
      ? totaisMensais.reduce((acc, m) => acc + m.despesas, 0) /
        totaisMensais.length
      : 0;
  const mesesCobertos =
    despesaMediaMensal > 0 ? valorReserva / despesaMediaMensal : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Reserva e Investimentos
        </h1>
        <p className="mt-1 text-sm text-muted">
          Registre e acompanhe onde o seu dinheiro está investido
        </p>
      </div>

      <InvestmentForm />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Valor total consolidado"
          value={formatMoeda(valorTotalConsolidado)}
          icon={Wallet}
          tone="accent"
          info="Soma do lançamento mais recente de cada investimento cadastrado (não soma o histórico inteiro, só o valor atual de cada um)."
        />

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-positive-soft text-positive">
              <ShieldCheck size={20} />
            </div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
              Cobertura da reserva de emergência
              <InfoTooltip text="Quantos meses de despesas a sua Reserva de Emergência atual cobriria, considerando a despesa média mensal dos últimos meses registrados. Quanto maior, mais tempo você aguenta sem receita." />
            </span>
          </div>
          {valorReserva === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Nenhum valor cadastrado em Reserva de Emergência ainda.
            </p>
          ) : mesesCobertos === null ? (
            <p className="mt-4 text-sm text-muted">
              Sem despesas registradas para calcular a cobertura.
            </p>
          ) : (
            <p className="mt-4 text-2xl font-semibold tracking-tight">
              {mesesCobertos.toFixed(1)} meses de despesas
            </p>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-base font-semibold">Distribuição por tipo</h2>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {distribuicaoPorTipo.length === 0 ? (
            <p className="text-sm text-muted">
              Sem investimentos cadastrados ainda.
            </p>
          ) : (
            <InvestmentTypePieChart data={distribuicaoPorTipo} />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold">Seus investimentos</h2>
        {investimentosAtuais.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-muted">
              <PiggyBank size={22} />
            </div>
            <p className="text-sm text-muted">
              Nenhum investimento cadastrado ainda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Instituição</th>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3 text-right">Valor atual</th>
                  <th className="px-6 py-3 text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {investimentosAtuais.map((inv, index) => {
                  const Icon = INVESTMENT_TYPE_ICONS[inv.tipo];
                  return (
                    <tr
                      key={inv.id}
                      className={`border-b border-border transition-colors last:border-0 hover:bg-surface-hover ${
                        index % 2 === 1 ? "bg-surface-hover/40" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted">
                            <Icon size={16} />
                          </span>
                          <span className="font-medium">
                            {INVESTMENT_TYPE_LABELS[inv.tipo]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {inv.instituicao}
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {inv.nome ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums">
                        {formatMoeda(Number(inv.valor))}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap text-muted">
                        {formatData(inv.data)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
