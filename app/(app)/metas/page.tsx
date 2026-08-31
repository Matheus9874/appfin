import { Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getCurrentInvestments, investmentKey } from "@/lib/currentInvestments";
import { calcularProgressoMeta } from "@/lib/goalProgress";
import GoalForm from "./GoalForm";
import GoalCardActions from "./GoalCardActions";

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

export default async function MetasPage() {
  const userId = await getCurrentUserId();
  const [goals, investimentos] = await Promise.all([
    prisma.goal.findMany({
      where: { userId },
      include: { investment: true },
      orderBy: { prazo: "asc" },
    }),
    prisma.investment.findMany({
      where: { userId },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
  ]);

  const investimentosAtuais = getCurrentInvestments(investimentos);
  const valorAtualPorChave = new Map(
    investimentosAtuais.map((inv) => [investmentKey(inv), Number(inv.valor)]),
  );

  const investimentosParaSelecao = investimentosAtuais.map((inv) => ({
    id: inv.id,
    tipo: inv.tipo,
    instituicao: inv.instituicao,
    nome: inv.nome,
  }));

  const idAtualPorChave = new Map(
    investimentosAtuais.map((inv) => [investmentKey(inv), inv.id]),
  );

  const agora = new Date();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
        <p className="mt-1 text-sm text-muted">
          Defina e acompanhe seus objetivos financeiros
        </p>
      </div>

      <GoalForm investimentosDisponiveis={investimentosParaSelecao} />

      {goals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-16 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Target size={22} />
          </div>
          <p className="font-medium">Nenhuma meta cadastrada</p>
          <p className="max-w-sm text-sm text-muted">
            Crie sua primeira meta de economia acima para começar a
            acompanhar o progresso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {goals.map((goal) => {
            const progresso = calcularProgressoMeta(
              goal,
              valorAtualPorChave,
              agora,
            );
            const investmentIdAtual = goal.investment
              ? (idAtualPorChave.get(investmentKey(goal.investment)) ?? null)
              : null;

            return (
              <div
                key={goal.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{goal.nome}</h2>
                    <p className="text-xs text-muted">
                      Prazo: {formatData(goal.prazo)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoeda(progresso.valorAtual)}{" "}
                      <span className="text-muted">
                        / {formatMoeda(progresso.valorAlvo)}
                      </span>
                    </span>
                    <GoalCardActions
                      goal={{
                        id: goal.id,
                        nome: goal.nome,
                        valorAlvo: progresso.valorAlvo,
                        prazoISO: goal.prazo.toISOString().slice(0, 10),
                        investmentId: investmentIdAtual,
                      }}
                      investimentosDisponiveis={investimentosParaSelecao}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className={`h-full rounded-full ${
                        progresso.percentual >= 100
                          ? "bg-positive"
                          : "bg-accent"
                      }`}
                      style={{ width: `${progresso.percentual}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted">
                    {progresso.percentual.toFixed(0)}% concluído
                  </span>
                </div>

                <p className="text-sm text-muted">
                  {progresso.restante === 0
                    ? "Meta batida! 🎉"
                    : progresso.porMes !== null
                      ? `Guarde ${formatMoeda(progresso.porMes)}/mês para bater a meta no prazo`
                      : progresso.mesesRestantes < 0
                        ? `Prazo vencido — ainda faltam ${formatMoeda(progresso.restante)}`
                        : `Menos de 1 mês para o prazo — guarde ${formatMoeda(progresso.restante)} o quanto antes`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
