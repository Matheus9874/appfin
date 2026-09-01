"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import SubmitButton from "@/app/components/SubmitButton";
import { useGuardedAction } from "@/lib/useGuardedAction";
import { createCategory } from "./actions";
import type { TipoTransacao } from "@/app/generated/prisma/enums";

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function CategoryForm() {
  const [tipo, setTipo] = useState<TipoTransacao>("DESPESA");
  const handleCreate = useGuardedAction(createCategory);

  return (
    <form
      action={handleCreate}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tipo" className={labelClass}>
          Tipo
        </label>
        <select
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoTransacao)}
          required
          className={controlClass}
        >
          <option value="RECEITA">Receita</option>
          <option value="DESPESA">Despesa</option>
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

      {tipo === "DESPESA" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="natureza" className={labelClass}>
            Custo fixo ou variável?
          </label>
          <select
            id="natureza"
            name="natureza"
            defaultValue="VARIAVEL"
            required
            className={controlClass}
          >
            <option value="FIXO">Fixo</option>
            <option value="VARIAVEL">Variável</option>
          </select>
        </div>
      )}

      <div className="flex items-end">
        <SubmitButton
          pendingText="Adicionando..."
          className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={16} />
          Adicionar categoria
        </SubmitButton>
      </div>
    </form>
  );
}
