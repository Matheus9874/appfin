import { Tags } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getCategoryIcon } from "@/lib/categoryIcons";
import InfoTooltip from "@/app/components/InfoTooltip";
import CategoryForm from "./CategoryForm";
import DeleteCategoryButton from "./DeleteCategoryButton";
import type { NaturezaCusto } from "@/app/generated/prisma/enums";

const NATUREZA_LABELS: Record<NaturezaCusto, string> = {
  FIXO: "Fixo",
  VARIAVEL: "Variável",
};

function CategoryList({
  titulo,
  categorias,
}: {
  titulo: string;
  categorias: {
    id: string;
    nome: string;
    natureza: NaturezaCusto | null;
    _count: { transactions: number };
  }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <InfoTooltip text="Categorias já usadas em alguma transação não podem ser excluídas — o botão de lixeira fica desabilitado nesses casos, para não quebrar o histórico." />
      </div>

      {categorias.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted">
          Nenhuma categoria cadastrada.
        </p>
      ) : (
        <ul>
          {categorias.map((c) => {
            const Icon = getCategoryIcon(c.nome);
            const emUso = c._count.transactions > 0;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 border-b border-border px-6 py-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted">
                    <Icon size={16} />
                  </span>
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {c.nome}
                      {c.natureza && (
                        <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-normal text-muted">
                          {NATUREZA_LABELS[c.natureza]}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted">
                      {emUso
                        ? `${c._count.transactions} transação(ões)`
                        : "Sem transações"}
                    </span>
                  </div>
                </div>
                <DeleteCategoryButton
                  categoryId={c.id}
                  categoryName={c.nome}
                  disabled={emUso}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default async function CategoriasPage() {
  const userId = await getCurrentUserId();
  const categorias = await prisma.category.findMany({
    where: { userId },
    include: { _count: { select: { transactions: true } } },
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  });

  const despesas = categorias.filter((c) => c.tipo === "DESPESA");
  const receitas = categorias.filter((c) => c.tipo === "RECEITA");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="mt-1 text-sm text-muted">
          Gerencie as categorias usadas nas suas transações
        </p>
      </div>

      <CategoryForm />

      {categorias.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-16 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-muted">
            <Tags size={22} />
          </div>
          <p className="text-sm text-muted">
            Nenhuma categoria cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CategoryList titulo="Despesas" categorias={despesas} />
          <CategoryList titulo="Receitas" categorias={receitas} />
        </div>
      )}
    </div>
  );
}
