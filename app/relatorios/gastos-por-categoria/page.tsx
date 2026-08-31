import { PieChart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCategoryIcon } from "@/lib/categoryIcons";
import ComingSoon from "../ComingSoon";
import InfoTooltip from "../../components/InfoTooltip";
import ReportHeader from "../ReportHeader";

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function GastosPorCategoriaPage() {
  const despesasPorCategoria = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { tipo: "despesa" },
    _sum: { valor: true },
  });

  const categorias = await prisma.category.findMany();
  const categoriaMap = new Map(categorias.map((c) => [c.id, c]));

  const dados = despesasPorCategoria
    .map((d) => ({
      categoria: categoriaMap.get(d.categoryId),
      valor: Number(d._sum.valor ?? 0),
    }))
    .filter((d) => d.categoria)
    .sort((a, b) => b.valor - a.valor);

  const totalDespesas = dados.reduce((acc, d) => acc + d.valor, 0);

  return (
    <div className="flex flex-col gap-8">
      <ReportHeader
        title="Gastos por Categoria"
        description="Ranking de despesas por categoria, do maior para o menor."
      />

      {dados.length === 0 ? (
        <ComingSoon
          icon={PieChart}
          message="Ainda não há despesas registradas para gerar este relatório."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold">Todas as despesas</h2>
            <InfoTooltip text="Considera todas as despesas já registradas desde o início, sem filtro de período. A porcentagem é sobre o total de despesas, não sobre receitas." />
          </div>
          <ul>
            {dados.map(({ categoria, valor }) => {
              if (!categoria) return null;
              const Icon = getCategoryIcon(categoria.nome);
              const pct = totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0;
              return (
                <li
                  key={categoria.id}
                  className="flex flex-col gap-2 border-b border-border px-6 py-4 last:border-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted">
                        <Icon size={16} />
                      </span>
                      <span className="text-sm font-medium">
                        {categoria.nome}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-sm font-medium tabular-nums">
                        {formatMoeda(valor)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
