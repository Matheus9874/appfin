"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import Modal from "@/app/components/Modal";
import { deleteGoal, updateGoal } from "./actions";
import { NENHUM_INVESTIMENTO_VALUE } from "@/lib/constants";
import { investmentLabel, type InvestmentOption } from "./GoalForm";

type GoalData = {
  id: string;
  nome: string;
  valorAlvo: number;
  prazoISO: string;
  investmentId: string | null;
};

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function GoalCardActions({
  goal,
  investimentosDisponiveis,
}: {
  goal: GoalData;
  investimentosDisponiveis: InvestmentOption[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateGoal(formData);
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Excluir a meta "${goal.nome}"?`)) return;
    setIsDeleting(true);
    const formData = new FormData();
    formData.set("id", goal.id);
    await deleteGoal(formData);
    setIsDeleting(false);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        title="Editar meta"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        title="Excluir meta"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-negative-soft hover:text-negative disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={16} />
      </button>

      {isEditing && (
        <Modal title="Editar meta" onClose={() => setIsEditing(false)}>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={goal.id} />

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="edit-goal-nome" className={labelClass}>
                Nome da meta
              </label>
              <input
                id="edit-goal-nome"
                name="nome"
                type="text"
                defaultValue={goal.nome}
                required
                className={controlClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-goal-valorAlvo" className={labelClass}>
                Valor-alvo (R$)
              </label>
              <input
                id="edit-goal-valorAlvo"
                name="valorAlvo"
                type="number"
                min="0"
                step="0.01"
                defaultValue={goal.valorAlvo}
                required
                className={controlClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-goal-prazo" className={labelClass}>
                Prazo
              </label>
              <input
                id="edit-goal-prazo"
                name="prazo"
                type="date"
                defaultValue={goal.prazoISO}
                required
                className={controlClass}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="edit-goal-investmentId" className={labelClass}>
                Vincular a um investimento
              </label>
              <select
                id="edit-goal-investmentId"
                name="investmentId"
                defaultValue={goal.investmentId ?? NENHUM_INVESTIMENTO_VALUE}
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

            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
