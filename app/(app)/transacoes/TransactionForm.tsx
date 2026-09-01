"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { createTransaction } from "../actions";
import { NOVA_CATEGORIA_VALUE } from "@/lib/constants";
import type { TipoTransacao } from "@/app/generated/prisma/enums";

type Category = {
  id: string;
  nome: string;
  tipo: TipoTransacao;
};

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function TransactionForm({
  categories,
}: {
  categories: Category[];
}) {
  const [tipo, setTipo] = useState<TipoTransacao>("DESPESA");
  const [categoryId, setCategoryId] = useState("");

  const categoriasDoTipo = useMemo(
    () => categories.filter((c) => c.tipo === tipo),
    [categories, tipo],
  );

  const mostrarNovaCategoria = categoryId === NOVA_CATEGORIA_VALUE;

  return (
    <form
      action={createTransaction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tipo" className={labelClass}>
          Tipo
        </label>
        <select
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as TipoTransacao);
            setCategoryId("");
          }}
          required
          className={controlClass}
        >
          <option value="RECEITA">Receita</option>
          <option value="DESPESA">Despesa</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="valor" className={labelClass}>
          Valor
        </label>
        <input
          id="valor"
          name="valor"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          required
          className={controlClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoryId" className={labelClass}>
          Categoria
        </label>
        <select
          key={tipo}
          id="categoryId"
          name="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className={controlClass}
        >
          <option value="" disabled>
            Selecione
          </option>
          {categoriasDoTipo.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
          <option value={NOVA_CATEGORIA_VALUE}>+ Nova categoria</option>
        </select>
      </div>

      {mostrarNovaCategoria && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novaCategoriaNome" className={labelClass}>
            Nome da nova categoria
          </label>
          <input
            id="novaCategoriaNome"
            name="novaCategoriaNome"
            type="text"
            required
            className={controlClass}
          />
        </div>
      )}

      {mostrarNovaCategoria && tipo === "DESPESA" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novaCategoriaNatureza" className={labelClass}>
            Custo fixo ou variável?
          </label>
          <select
            id="novaCategoriaNatureza"
            name="novaCategoriaNatureza"
            defaultValue="VARIAVEL"
            required
            className={controlClass}
          >
            <option value="FIXO">Fixo</option>
            <option value="VARIAVEL">Variável</option>
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="descricao" className={labelClass}>
          Descrição
        </label>
        <input
          id="descricao"
          name="descricao"
          type="text"
          required
          className={controlClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="data" className={labelClass}>
          Data
        </label>
        <input
          id="data"
          name="data"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
          className={controlClass}
        />
      </div>

      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Adicionar transação
        </button>
      </div>
    </form>
  );
}
