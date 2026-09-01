"use client";

import { ArrowLeftRight, Download, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { paraCsv } from "@/lib/csvExport";
import { paraMesLocal } from "@/lib/dateLocal";
import InfoTooltip from "@/app/components/InfoTooltip";
import type {
  MeioPagamento,
  NaturezaCusto,
  OrigemTransacao,
  TipoTransacao,
} from "@/app/generated/prisma/enums";

type TransactionRow = {
  id: string;
  tipo: TipoTransacao;
  valor: number;
  categoryNome: string;
  descricao: string;
  dataFormatada: string;
  dataISO: string;
  origem: OrigemTransacao;
  meioPagamento: MeioPagamento | null;
  natureza: NaturezaCusto | null;
  transferenciaInterna: boolean;
};

const TODOS_OS_MESES = "todos";

type FiltroTransferencia = "sem-transferencia" | "todas" | "somente-transferencia";

const FILTROS_TRANSFERENCIA: { key: FiltroTransferencia; label: string }[] = [
  { key: "sem-transferencia", label: "Sem transferência interna" },
  { key: "todas", label: "Todas" },
  { key: "somente-transferencia", label: "Só transferência interna" },
];

const MEIO_PAGAMENTO_LABEL: Record<MeioPagamento, string> = {
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  TED: "TED",
  DOC: "DOC",
  BOLETO: "Boleto",
  OUTRO: "Outro",
};

const NATUREZA_LABEL: Record<NaturezaCusto, string> = {
  FIXO: "Fixo",
  VARIAVEL: "Variável",
};

const ORIGEM_LABEL: Record<OrigemTransacao, string> = {
  MANUAL: "Manual",
  PLUGGY: "Open Finance",
};

const MES_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function formatMesLabel(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  const label = MES_LABEL_FORMATTER.format(new Date(ano, mes - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatValorCsv(valor: number) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export default function ExtratoClient({
  transactions,
}: {
  transactions: TransactionRow[];
}) {
  const mesesDisponiveis = useMemo(() => {
    const chaves = new Set(transactions.map((t) => t.dataISO.slice(0, 7)));
    return Array.from(chaves).sort((a, b) => (a < b ? 1 : -1));
  }, [transactions]);

  const [mesFiltro, setMesFiltro] = useState(() => {
    const chaveAtual = paraMesLocal(new Date());
    if (mesesDisponiveis.includes(chaveAtual)) return chaveAtual;
    return mesesDisponiveis[0] ?? TODOS_OS_MESES;
  });
  // Sem transferência interna por padrão — mesmo critério do Dashboard e da
  // aba Transações, pra não inflar receita/despesa com pagamento de fatura
  // de cartão ou aporte/resgate de investimento.
  const [filtroTransferencia, setFiltroTransferencia] =
    useState<FiltroTransferencia>("sem-transferencia");

  const transacoesFiltradas = useMemo(() => {
    let base = transactions;
    if (mesFiltro !== TODOS_OS_MESES) {
      base = base.filter((t) => t.dataISO.slice(0, 7) === mesFiltro);
    }
    if (filtroTransferencia === "sem-transferencia") {
      base = base.filter((t) => !t.transferenciaInterna);
    } else if (filtroTransferencia === "somente-transferencia") {
      base = base.filter((t) => t.transferenciaInterna);
    }
    return base;
  }, [transactions, mesFiltro, filtroTransferencia]);

  const totalReceitas = transacoesFiltradas
    .filter((t) => t.tipo === "RECEITA")
    .reduce((acc, t) => acc + t.valor, 0);
  const totalDespesas = transacoesFiltradas
    .filter((t) => t.tipo === "DESPESA")
    .reduce((acc, t) => acc + t.valor, 0);

  function handleExportar() {
    const linhas = transacoesFiltradas.map((t) => [
      t.dataFormatada,
      t.categoryNome,
      t.descricao,
      t.tipo === "RECEITA" ? formatValorCsv(t.valor) : "",
      t.tipo === "DESPESA" ? formatValorCsv(t.valor) : "",
      t.meioPagamento ? MEIO_PAGAMENTO_LABEL[t.meioPagamento] : "",
      t.natureza ? NATUREZA_LABEL[t.natureza] : "",
      ORIGEM_LABEL[t.origem],
      t.transferenciaInterna ? "Sim" : "Não",
    ]);

    // Linha de total no final da planilha, pra não depender do usuário
    // selecionar e somar manualmente no Excel.
    linhas.push([
      "",
      "",
      "Total",
      formatValorCsv(totalReceitas),
      formatValorCsv(totalDespesas),
      "",
      "",
      "",
      "",
    ]);

    const csv = paraCsv(
      [
        "Data",
        "Categoria",
        "Descrição",
        "Entrada",
        "Saída",
        "Forma de pagamento",
        "Natureza",
        "Origem",
        "Transferência interna",
      ],
      linhas,
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const nomeArquivo =
      mesFiltro === TODOS_OS_MESES
        ? "extrato-completo.csv"
        : `extrato-${mesFiltro}.csv`;
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mesFiltro" className="text-xs font-medium text-muted">
              Mês
            </label>
            <select
              id="mesFiltro"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value={TODOS_OS_MESES}>Todos os meses</option>
              {mesesDisponiveis.map((chave) => (
                <option key={chave} value={chave}>
                  {formatMesLabel(chave)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filtroTransferencia"
              className="text-xs font-medium text-muted"
            >
              Transferência interna
            </label>
            <select
              id="filtroTransferencia"
              value={filtroTransferencia}
              onChange={(e) =>
                setFiltroTransferencia(e.target.value as FiltroTransferencia)
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              {FILTROS_TRANSFERENCIA.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportar}
          disabled={transacoesFiltradas.length === 0}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Transações</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">
            {transacoesFiltradas.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="flex items-center gap-1 text-xs font-medium text-muted">
            Receitas
            <InfoTooltip text="Reflete o filtro de transferência interna acima. Por padrão, transferência interna (pagamento de fatura de cartão, resgate de investimento) fica de fora — mesma regra do Dashboard." />
          </span>
          <p className="mt-1 text-xl font-semibold tracking-tight text-positive">
            {formatMoeda(totalReceitas)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="flex items-center gap-1 text-xs font-medium text-muted">
            Despesas
            <InfoTooltip text="Reflete o filtro de transferência interna acima. Por padrão, transferência interna (pagamento de fatura de cartão, aporte em investimento) fica de fora — mesma regra do Dashboard." />
          </span>
          <p className="mt-1 text-xl font-semibold tracking-tight text-negative">
            {formatMoeda(totalDespesas)}
          </p>
        </div>
      </div>

      {transacoesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-muted">
            <Receipt size={22} />
          </div>
          <p className="text-sm text-muted">
            Nenhuma transação encontrada para o período selecionado.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3 text-right">Entrada</th>
                <th className="px-6 py-3 text-right">Saída</th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map((t, index) => (
                <tr
                  key={t.id}
                  className={`border-b border-border last:border-0 ${
                    index % 2 === 1 ? "bg-surface-hover/40" : ""
                  }`}
                >
                  <td className="px-6 py-3 whitespace-nowrap text-muted">
                    {t.dataFormatada}
                  </td>
                  <td className="px-6 py-3">{t.categoryNome}</td>
                  <td className="px-6 py-3 text-muted">
                    <div className="flex items-center gap-2">
                      <span>{t.descricao}</span>
                      {t.transferenciaInterna && (
                        <span
                          title="Movimentação entre suas próprias contas/investimentos — não conta como receita ou despesa real, não entra nos totais acima."
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                        >
                          <ArrowLeftRight size={10} />
                          Transferência interna
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-medium whitespace-nowrap text-positive">
                    {t.tipo === "RECEITA" ? formatMoeda(t.valor) : "—"}
                  </td>
                  <td className="px-6 py-3 text-right font-medium whitespace-nowrap text-negative">
                    {t.tipo === "DESPESA" ? formatMoeda(t.valor) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-sm font-medium">
                <td className="px-6 py-3 text-muted" colSpan={3}>
                  Total
                </td>
                <td className="px-6 py-3 text-right text-positive">
                  {formatMoeda(totalReceitas)}
                </td>
                <td className="px-6 py-3 text-right text-negative">
                  {formatMoeda(totalDespesas)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
