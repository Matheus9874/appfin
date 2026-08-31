import { ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCategoryIcon } from "@/lib/categoryIcons";
import TransactionForm from "./TransactionForm";

function formatMoeda(valor: unknown) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

export default async function TransacoesPage() {
  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { data: "desc" },
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
        <p className="mt-1 text-sm text-muted">
          Registre e acompanhe suas receitas e despesas
        </p>
      </div>

      <TransactionForm categories={categories} />

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-muted">
            <Receipt size={22} />
          </div>
          <p className="text-sm text-muted">
            Nenhuma transação cadastrada ainda.
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
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, index) => {
                const Icon = getCategoryIcon(t.category.nome);
                const isReceita = t.tipo === "receita";
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-border transition-colors last:border-0 hover:bg-surface-hover ${
                      index % 2 === 1 ? "bg-surface-hover/40" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-muted">
                      {formatData(t.data)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted">
                          <Icon size={16} />
                        </span>
                        <span className="font-medium">{t.category.nome}</span>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
