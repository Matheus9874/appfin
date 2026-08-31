"use client";

import { Plus } from "lucide-react";
import { createGoal } from "./actions";
import { NENHUM_INVESTIMENTO_VALUE } from "@/lib/constants";
import { INVESTMENT_TYPE_LABELS } from "@/lib/investmentTypes";
import type { InvestmentType } from "@/app/generated/prisma/enums";

export type InvestmentOption = {
  id: string;
  tipo: InvestmentType;
  instituicao: string;
  nome: string | null;
};

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

export function investmentLabel(inv: InvestmentOption) {
  const base = `${INVESTMENT_TYPE_LABELS[inv.tipo]} — ${inv.instituicao}`;
  return inv.nome ? `${base} (${inv.nome})` : base;
}

export default function GoalForm({
  investimentosDisponiveis,
}: {
  investimentosDisponiveis: InvestmentOption[];
}) {
  return (
    <form
      action={createGoal}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className={labelClass}>
          Nome da meta
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          className={controlClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="valorAlvo" className={labelClass}>
          Valor-alvo (R$)
        </label>
        <input
          id="valorAlvo"
          name="valorAlvo"
          type="number"
          min="0"
          step="0.01"
          required
          className={controlClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="prazo" className={labelClass}>
          Prazo
        </label>
        <input
          id="prazo"
          name="prazo"
          type="date"
          required
          className={controlClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="investmentId" className={labelClass}>
          Vincular a um investimento
        </label>
        <select
          id="investmentId"
          name="investmentId"
          defaultValue={NENHUM_INVESTIMENTO_VALUE}
          className={controlClass}
        >
          <option value={NENHUM_INVESTIMENTO_VALUE}>Nenhum</option>
          {investimentosDisponiveis.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {investmentLabel(inv)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Adicionar meta
        </button>
      </div>
    </form>
  );
}
