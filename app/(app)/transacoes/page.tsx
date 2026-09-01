import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { paraDataLocal } from "@/lib/dateLocal";
import TransactionForm from "./TransactionForm";
import TransactionsTable from "./TransactionsTable";

function formatData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

export default async function TransacoesPage() {
  const userId = await getCurrentUserId();
  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { data: "desc" },
      include: { category: true },
    }),
    prisma.category.findMany({ where: { userId }, orderBy: { nome: "asc" } }),
  ]);

  const linhas = transactions.map((t) => ({
    id: t.id,
    tipo: t.tipo,
    valor: Number(t.valor),
    categoryId: t.categoryId,
    categoryNome: t.category.nome,
    descricao: t.descricao,
    dataFormatada: formatData(t.data),
    dataISO: paraDataLocal(t.data),
    origem: t.origem,
    meioPagamento: t.meioPagamento,
    natureza: t.natureza,
    transferenciaInterna: t.transferenciaInterna,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
        <p className="mt-1 text-sm text-muted">
          Registre e acompanhe suas receitas e despesas
        </p>
      </div>

      <TransactionForm categories={categories} />

      <TransactionsTable transactions={linhas} categories={categories} />
    </div>
  );
}
