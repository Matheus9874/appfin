import {
  CreditCard,
  Landmark,
  PiggyBank,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getMonthlyTotals } from "@/lib/monthlyTotals";
import { getCurrentInvestments, investmentKey } from "@/lib/currentInvestments";
import { calcularProgressoMeta } from "@/lib/goalProgress";
import { agruparGastosCartaoPorMes } from "@/lib/creditCardBills";
import { paraMesLocal } from "@/lib/dateLocal";
import InfoTooltip from "@/app/components/InfoTooltip";
import InsightsSection from "./InsightsSection";
import DashboardDespesasSection from "./DashboardDespesasSection";
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

/**
 * A data de vencimento vem do Pluggy como string "YYYY-MM-DD" (sem horário),
 * que vira meia-noite UTC ao passar por `new Date(...)`. Formatando com o
 * fuso local (ex.: America/Sao_Paulo, UTC-3), isso volta um dia — por isso
 * usa UTC explicitamente aqui, para exibir o dia calendário correto.
 */
function formatDataCalendario(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
}

function sumFor(
  rows: { tipo: TipoTransacao; _sum: { valor: unknown } }[],
  tipo: TipoTransacao,
) {
  const row = rows.find((r) => r.tipo === tipo);
  return Number(row?._sum.valor ?? 0);
}

const MES_LABEL_COMPLETO_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const now = new Date();

  const ultimaTransacao = await prisma.transaction.aggregate({
    where: { userId },
    _max: { data: true },
  });
  // Usa o mês da transação mais recente como referência para os cards de
  // "mês atual" — evita que tudo fique zerado logo no início de um mês
  // civil novo, antes de qualquer lançamento/importação daquele mês.
  const dataReferencia = ultimaTransacao._max.data ?? now;
  const inicioDoProximoMes = new Date(
    dataReferencia.getFullYear(),
    dataReferencia.getMonth() + 1,
    1,
  );

  const inicioJanelaSaude = new Date(
    dataReferencia.getFullYear(),
    dataReferencia.getMonth() - 5,
    1,
  );

  const [
    totalPorTipoManual,
    pluggyAccounts,
    totaisMensais,
    investimentos,
    despesasDetalhadas,
    gastosCartaoJanela,
    categorias,
    goals,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["tipo"],
      where: { userId, origem: "MANUAL", transferenciaInterna: false },
      _sum: { valor: true },
    }),
    prisma.pluggyAccount.findMany({ where: { userId } }),
    getMonthlyTotals(userId, 6),
    prisma.investment.findMany({
      where: { userId },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
    // Janela larga o bastante para cobrir tanto "Maiores despesas do mês"
    // (só o mês de referência) quanto as médias de "Saúde financeira" (6
    // meses) — o detalhe por forma de pagamento é o que permite o filtro
    // "Somente cartão de crédito / Sem cartão de crédito" no client.
    prisma.transaction.findMany({
      where: {
        userId,
        tipo: "DESPESA",
        transferenciaInterna: false,
        data: { gte: inicioJanelaSaude, lt: inicioDoProximoMes },
      },
      select: {
        valor: true,
        data: true,
        categoryId: true,
        meioPagamento: true,
        natureza: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        tipo: "DESPESA",
        meioPagamento: "CREDITO",
        transferenciaInterna: false,
        data: { gte: inicioJanelaSaude, lt: inicioDoProximoMes },
      },
      select: { valor: true, data: true },
    }),
    prisma.category.findMany({ where: { userId } }),
    prisma.goal.findMany({
      where: { userId },
      include: { investment: true },
      orderBy: { prazo: "asc" },
      take: 3,
    }),
  ]);

  // Saldo de lançamentos manuais: continua sendo receitas menos despesas,
  // já que não há um saldo "real" de banco para eles.
  const totalReceitasManual = sumFor(totalPorTipoManual, "RECEITA");
  const totalDespesasManual = sumFor(totalPorTipoManual, "DESPESA");
  const saldoManual = totalReceitasManual - totalDespesasManual;

  // Saldo de contas conectadas via Open Finance: soma o saldo real informado
  // pela instituição (não reconstruído a partir de transações importadas,
  // que só cobrem a janela de sincronização). Contas de cartão de crédito
  // (tipo CREDIT) ficam de fora — o saldo delas é a fatura em aberto, já
  // mostrada separadamente no card "Cartão de crédito".
  const contasBancariasConectadas = pluggyAccounts.filter(
    (c) => c.tipo === "BANK",
  );
  const temContasConectadas = contasBancariasConectadas.length > 0;
  const saldoContasConectadas = contasBancariasConectadas.reduce(
    (acc, c) => acc + Number(c.saldo),
    0,
  );

  const saldoTotal = saldoContasConectadas + saldoManual;

  const investimentosAtuais = getCurrentInvestments(investimentos);
  const valorInvestimentos = investimentosAtuais.reduce(
    (acc, i) => acc + Number(i.valor),
    0,
  );
  const patrimonioTotal = saldoTotal + valorInvestimentos;

  const rendaMedia =
    totaisMensais.reduce((acc, m) => acc + m.receitas, 0) /
    (totaisMensais.length || 1);
  const reservaEmergencia = investimentosAtuais
    .filter((i) => i.tipo === "RESERVA_EMERGENCIA" || i.contaComoReserva)
    .reduce((acc, i) => acc + Number(i.valor), 0);

  const indiceMesAtual = totaisMensais.findIndex(
    (m) =>
      m.data.getFullYear() === dataReferencia.getFullYear() &&
      m.data.getMonth() === dataReferencia.getMonth(),
  );
  const mesAtualLabelCompleto = capitalizar(
    MES_LABEL_COMPLETO_FORMATTER.format(dataReferencia),
  );

  // Props para o DashboardDespesasSection (client component): ele reagrupa
  // as despesas por mês/categoria no próprio navegador conforme o filtro de
  // forma de pagamento (Todas/Somente cartão/Sem cartão), sem precisar de
  // uma nova ida ao servidor a cada troca.
  const totaisMensaisParaCliente = totaisMensais.map((m) => ({
    mesKey: paraMesLocal(m.data),
    label: m.label,
    receitas: m.receitas,
  }));
  const despesasDetalhadasParaCliente = despesasDetalhadas.map((d) => ({
    valor: Number(d.valor),
    mesKey: paraMesLocal(d.data),
    categoryId: d.categoryId,
    meioPagamento: d.meioPagamento,
    natureza: d.natureza,
  }));
  const categoriaMapParaCliente = Object.fromEntries(
    categorias.map((c) => [c.id, c.nome]),
  );

  // Fatura de cartão de crédito: contas conectadas via Open Finance dão o
  // valor real (e a data de vencimento), informado pela própria
  // instituição — muito mais preciso que aproximar por transações. Sem
  // conta conectada, cai de volta para a soma de despesas no cartão dentro
  // do mês de referência.
  const contasCartaoConectadas = pluggyAccounts.filter(
    (c) => c.tipo === "CREDIT",
  );
  const temCartaoConectado = contasCartaoConectadas.length > 0;
  const faturaContasConectadas = contasCartaoConectadas.reduce(
    (acc, c) => acc + Number(c.saldo),
    0,
  );
  const proximoVencimentoFatura =
    contasCartaoConectadas
      .map((c) => c.vencimentoFatura)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const faturasPorMes = agruparGastosCartaoPorMes(
    gastosCartaoJanela.map((t) => ({ valor: Number(t.valor), data: t.data })),
    totaisMensais.map((m) => m.data),
  );
  const faturaAproximadaDoMes = faturasPorMes[indiceMesAtual]?.valor ?? 0;
  const faturaAtual = temCartaoConectado
    ? faturaContasConectadas
    : faturaAproximadaDoMes;
  const historicoFaturas = faturasPorMes.slice(0, indiceMesAtual).reverse();

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
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Wallet size={20} />
            </div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
              Saldo total
              <InfoTooltip
                text={
                  temContasConectadas
                    ? "Saldo real das contas conectadas via Open Finance (informado pelo banco) mais o saldo de lançamentos manuais (receitas menos despesas). Não inclui investimentos."
                    : "Soma de todas as receitas menos todas as despesas lançadas manualmente, desde o início. Não inclui investimentos. Conecte uma conta via Open Finance para ver o saldo real do banco."
                }
              />
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-tight">
            {formatMoeda(saldoTotal)}
          </p>
          {temContasConectadas && (
            <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1">
                  <Sparkles size={10} />
                  Contas conectadas (saldo real)
                </span>
                <span className="tabular-nums">
                  {formatMoeda(saldoContasConectadas)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Lançamentos manuais</span>
                <span className="tabular-nums">{formatMoeda(saldoManual)}</span>
              </div>
            </div>
          )}
        </div>
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

      <DashboardDespesasSection
        despesasDetalhadas={despesasDetalhadasParaCliente}
        totaisMensais={totaisMensaisParaCliente}
        categoriaMap={categoriaMapParaCliente}
        dataReferenciaMesKey={paraMesLocal(dataReferencia)}
        mesAtualLabelCompleto={mesAtualLabelCompleto}
        rendaMedia={rendaMedia}
        reservaEmergencia={reservaEmergencia}
        metasSection={
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
        }
      >
        <section>
          <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold">
            <CreditCard size={16} className="text-muted" />
            Cartão de crédito
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <CreditCard size={20} />
                </div>
                <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
                  Fatura atual (em aberto)
                  <InfoTooltip
                    text={
                      temCartaoConectado
                        ? "Valor real da fatura em aberto do cartão de crédito conectado via Open Finance, informado diretamente pela instituição."
                        : `Soma das despesas pagas no cartão de crédito em ${mesAtualLabelCompleto.toLowerCase()} (mês civil, aproximado). Conecte um cartão via Open Finance para ver o valor real da fatura.`
                    }
                  />
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                {formatMoeda(faturaAtual)}
              </p>
              {temCartaoConectado && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Sparkles size={10} />
                    Dado real (Open Finance)
                  </span>
                  <span>
                    {proximoVencimentoFatura
                      ? `Vencimento: ${formatDataCalendario(proximoVencimentoFatura)}`
                      : "Sem data de vencimento informada"}
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
                Histórico de faturas
                <InfoTooltip text="Soma das despesas no cartão de crédito por mês civil anterior, como aproximação simples das faturas já fechadas." />
              </span>
              {historicoFaturas.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Sem histórico suficiente ainda.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {historicoFaturas.map((f) => (
                    <li
                      key={f.mesKey}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted">{f.label}</span>
                      <span className="font-medium tabular-nums">
                        {formatMoeda(f.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </DashboardDespesasSection>
    </div>
  );
}
