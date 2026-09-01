"use client";

import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  FileText,
  QrCode,
  Receipt,
  Send,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { paraMesLocal } from "@/lib/dateLocal";
import TransactionRowActions from "./TransactionRowActions";
import type {
  MeioPagamento,
  OrigemTransacao,
  TipoTransacao,
} from "@/app/generated/prisma/enums";

const MEIO_PAGAMENTO_INFO: Record<
  MeioPagamento,
  { label: string; icon: LucideIcon }
> = {
  PIX: { label: "Pix", icon: QrCode },
  DEBITO: { label: "Débito", icon: Banknote },
  CREDITO: { label: "Crédito", icon: CreditCard },
  TED: { label: "TED", icon: Send },
  DOC: { label: "DOC", icon: Send },
  BOLETO: { label: "Boleto", icon: FileText },
  OUTRO: { label: "Outro", icon: Banknote },
};

type Category = {
  id: string;
  nome: string;
  tipo: TipoTransacao;
};

type TransactionRow = {
  id: string;
  tipo: TipoTransacao;
  valor: number;
  categoryId: string;
  categoryNome: string;
  descricao: string;
  dataFormatada: string;
  dataISO: string;
  origem: OrigemTransacao;
  meioPagamento: MeioPagamento | null;
  transferenciaInterna: boolean;
};

type MeioPagamentoTabKey = "todas" | "CREDITO" | "PIX" | "DEBITO";

const MEIO_PAGAMENTO_TABS: { key: MeioPagamentoTabKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "CREDITO", label: "Cartão de crédito" },
  { key: "PIX", label: "Pix" },
  { key: "DEBITO", label: "Débito" },
];

type OrigemFiltro = "todas" | OrigemTransacao;

const TODOS_OS_MESES = "todos";

const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

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

function BadgeTransferenciaInterna() {
  return (
    <span
      title="Movimentação entre suas próprias contas/investimentos — não conta como receita ou despesa real."
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
    >
      <ArrowLeftRight size={10} />
      Transferência interna
    </span>
  );
}

export default function TransactionsTable({
  transactions,
  categories,
}: {
  transactions: TransactionRow[];
  categories: Category[];
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
  const [origemFiltro, setOrigemFiltro] = useState<OrigemFiltro>("todas");
  const [meioPagamentoTab, setMeioPagamentoTab] =
    useState<MeioPagamentoTabKey>("todas");

  const transacoesBase = useMemo(() => {
    return transactions.filter((t) => {
      if (mesFiltro !== TODOS_OS_MESES && t.dataISO.slice(0, 7) !== mesFiltro) {
        return false;
      }
      if (origemFiltro !== "todas" && t.origem !== origemFiltro) return false;
      return true;
    });
  }, [transactions, mesFiltro, origemFiltro]);

  const contagensPorPagamento = useMemo(
    () => ({
      todas: transacoesBase.length,
      CREDITO: transacoesBase.filter((t) => t.meioPagamento === "CREDITO")
        .length,
      PIX: transacoesBase.filter((t) => t.meioPagamento === "PIX").length,
      DEBITO: transacoesBase.filter((t) => t.meioPagamento === "DEBITO")
        .length,
    }),
    [transacoesBase],
  );

  const transacoesFiltradas = useMemo(() => {
    if (meioPagamentoTab === "todas") return transacoesBase;
    return transacoesBase.filter((t) => t.meioPagamento === meioPagamentoTab);
  }, [transacoesBase, meioPagamentoTab]);

  const totalFiltrado = transacoesFiltradas.reduce((acc, t) => {
    return acc + (t.tipo === "RECEITA" ? t.valor : -t.valor);
  }, 0);

  const filtrosAtivos =
    mesFiltro !== TODOS_OS_MESES ||
    origemFiltro !== "todas" ||
    meioPagamentoTab !== "todas";
  const mostrarTotalizador = meioPagamentoTab !== "todas";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mesFiltro" className="text-xs font-medium text-muted">
            Mês
          </label>
          <select
            id="mesFiltro"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className={controlClass}
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
            htmlFor="origemFiltro"
            className="text-xs font-medium text-muted"
          >
            Origem
          </label>
          <select
            id="origemFiltro"
            value={origemFiltro}
            onChange={(e) => setOrigemFiltro(e.target.value as OrigemFiltro)}
            className={controlClass}
          >
            <option value="todas">Todas as origens</option>
            <option value="MANUAL">Manual</option>
            <option value="PLUGGY">Open Finance (Pluggy)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {MEIO_PAGAMENTO_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMeioPagamentoTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              meioPagamentoTab === tab.key
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                meioPagamentoTab === tab.key
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-hover text-muted"
              }`}
            >
              {contagensPorPagamento[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {transacoesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-muted">
            <Receipt size={22} />
          </div>
          <p className="text-sm text-muted">
            {filtrosAtivos
              ? "Nenhuma transação encontrada com os filtros selecionados."
              : "Nenhuma transação cadastrada ainda."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Forma de pagamento</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map((t, index) => {
                const Icon = getCategoryIcon(t.categoryNome);
                const isReceita = t.tipo === "RECEITA";
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-border transition-colors last:border-0 hover:bg-surface-hover ${
                      index % 2 === 1 ? "bg-surface-hover/40" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-muted">
                      {t.dataFormatada}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted">
                          <Icon size={16} />
                        </span>
                        <span className="font-medium">{t.categoryNome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span>{t.descricao}</span>
                          {t.origem === "PLUGGY" && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              <Sparkles size={10} />
                              Auto
                            </span>
                          )}
                          {t.transferenciaInterna && (
                            <BadgeTransferenciaInterna />
                          )}
                        </div>
                        <span
                          className="select-all font-mono text-[10px] text-muted/50"
                          title="ID da transação"
                        >
                          {t.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.meioPagamento ? (
                        (() => {
                          const { label, icon: MeioIcon } =
                            MEIO_PAGAMENTO_INFO[t.meioPagamento];
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-hover px-2.5 py-1 text-xs font-medium text-muted">
                              <MeioIcon size={12} />
                              {label}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-medium whitespace-nowrap ${
                        isReceita ? "text-positive" : "text-negative"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {isReceita ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                        {formatMoeda(t.valor)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <TransactionRowActions
                        transaction={{
                          id: t.id,
                          tipo: t.tipo,
                          valor: t.valor,
                          categoryId: t.categoryId,
                          descricao: t.descricao,
                          dataISO: t.dataISO,
                        }}
                        categories={categories}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {mostrarTotalizador && (
              <tfoot>
                <tr className="border-t border-border text-sm font-medium">
                  <td className="px-6 py-3 text-muted" colSpan={4}>
                    Total ·{" "}
                    {MEIO_PAGAMENTO_TABS.find((t) => t.key === meioPagamentoTab)?.label}
                  </td>
                  <td className="px-6 py-3 text-right text-negative">
                    {formatMoeda(Math.abs(totalFiltrado))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
