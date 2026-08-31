"use client";

import { ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import TransactionRowActions from "./TransactionRowActions";
import type {
  NaturezaCusto,
  TipoTransacao,
} from "@/app/generated/prisma/enums";

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
  categoryNatureza: NaturezaCusto | null;
  descricao: string;
  dataFormatada: string;
  dataISO: string;
};

type TabKey = "todas" | "fixas" | "variaveis";

const TABS: { key: TabKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "fixas", label: "Custos Fixos" },
  { key: "variaveis", label: "Custos Variáveis" },
];

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function TransactionsTable({
  transactions,
  categories,
}: {
  transactions: TransactionRow[];
  categories: Category[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("todas");

  const contagens = useMemo(
    () => ({
      todas: transactions.length,
      fixas: transactions.filter(
        (t) => t.tipo === "DESPESA" && t.categoryNatureza === "FIXO",
      ).length,
      variaveis: transactions.filter(
        (t) => t.tipo === "DESPESA" && t.categoryNatureza === "VARIAVEL",
      ).length,
    }),
    [transactions],
  );

  const transacoesFiltradas = useMemo(() => {
    if (activeTab === "todas") return transactions;
    const natureza: NaturezaCusto = activeTab === "fixas" ? "FIXO" : "VARIAVEL";
    return transactions.filter(
      (t) => t.tipo === "DESPESA" && t.categoryNatureza === natureza,
    );
  }, [transactions, activeTab]);

  const totalFiltrado = transacoesFiltradas.reduce((acc, t) => {
    return acc + (t.tipo === "RECEITA" ? t.valor : -t.valor);
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.key
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-hover text-muted"
              }`}
            >
              {contagens[tab.key]}
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
            {activeTab === "todas"
              ? "Nenhuma transação cadastrada ainda."
              : "Nenhuma transação nesta categoria de custo."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Descrição</th>
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
                    <td className="px-6 py-4 text-muted">{t.descricao}</td>
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
            {activeTab !== "todas" && (
              <tfoot>
                <tr className="border-t border-border text-sm font-medium">
                  <td className="px-6 py-3 text-muted" colSpan={3}>
                    Total{" "}
                    {activeTab === "fixas" ? "custos fixos" : "custos variáveis"}
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
