import { Plus, Tags } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCategoryIcon } from "@/lib/categoryIcons";
import InfoTooltip from "../components/InfoTooltip";
import { createCategory } from "./actions";
import DeleteCategoryButton from "./DeleteCategoryButton";

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

function CategoryList({
  titulo,
  categorias,
}: {
  titulo: string;
  categorias: {
    id: string;
    nome: string;
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
                    <span className="text-sm font-medium">{c.nome}</span>
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
  const categorias = await prisma.category.findMany({
    include: { _count: { select: { transactions: true } } },
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  });

  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const receitas = categorias.filter((c) => c.tipo === "receita");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="mt-1 text-sm text-muted">
          Gerencie as categorias usadas nas suas transações
        </p>
      </div>

      <form
        action={createCategory}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:grid-cols-3"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo" className={labelClass}>
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue="despesa"
            required
            className={controlClass}
          >
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nome" className={labelClass}>
            Nome da categoria
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            className={controlClass}
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            <Plus size={16} />
            Adicionar categoria
          </button>
        </div>
      </form>

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
