import { investmentKey } from "./currentInvestments";
import type { InvestmentType } from "@/app/generated/prisma/enums";

type GoalInvestment = {
  tipo: InvestmentType;
  instituicao: string;
  nome: string | null;
};

export type GoalProgress = {
  id: string;
  nome: string;
  prazo: Date;
  valorAlvo: number;
  valorAtual: number;
  percentual: number;
  restante: number;
  mesesRestantes: number;
  porMes: number | null;
};

export function calcularMesesRestantes(prazo: Date, agora: Date) {
  const meses =
    (prazo.getFullYear() - agora.getFullYear()) * 12 +
    (prazo.getMonth() - agora.getMonth());
  return prazo.getDate() < agora.getDate() ? meses - 1 : meses;
}

export function calcularProgressoMeta(
  goal: {
    id: string;
    nome: string;
    valorAlvo: unknown;
    prazo: Date;
    investment: GoalInvestment | null;
  },
  valorAtualPorChave: Map<string, number>,
  agora: Date,
): GoalProgress {
  const valorAlvo = Number(goal.valorAlvo);
  const valorAtual = goal.investment
    ? (valorAtualPorChave.get(investmentKey(goal.investment)) ?? 0)
    : 0;
  const percentual =
    valorAlvo > 0 ? Math.min(100, (valorAtual / valorAlvo) * 100) : 0;
  const restante = Math.max(valorAlvo - valorAtual, 0);
  const mesesRestantes = calcularMesesRestantes(goal.prazo, agora);
  const porMes =
    restante === 0 ? 0 : mesesRestantes > 0 ? restante / mesesRestantes : null;

  return {
    id: goal.id,
    nome: goal.nome,
    prazo: goal.prazo,
    valorAlvo,
    valorAtual,
    percentual,
    restante,
    mesesRestantes,
    porMes,
  };
}
