"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import Modal from "@/app/components/Modal";
import { deleteTransaction, updateTransaction } from "../actions";
import { NOVA_CATEGORIA_VALUE } from "@/lib/constants";
import type { TipoTransacao } from "@/app/generated/prisma/enums";

type Category = {
  id: string;
  nome: string;
  tipo: TipoTransacao;
};

type TransactionData = {
  id: string;
  tipo: TipoTransacao;
  valor: number;
  categoryId: string;
  descricao: string;
  dataISO: string;
};

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function TransactionRowActions({
  transaction,
  categories,
}: {
  transaction: TransactionData;
  categories: Category[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tipo, setTipo] = useState(transaction.tipo);
  const [categoryId, setCategoryId] = useState(transaction.categoryId);

  const categoriasDoTipo = useMemo(
    () => categories.filter((c) => c.tipo === tipo),
    [categories, tipo],
  );

  const mostrarNovaCategoria = categoryId === NOVA_CATEGORIA_VALUE;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateTransaction(formData);
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Excluir a transação "${transaction.descricao}"?`)) return;
    setIsDeleting(true);
    const formData = new FormData();
    formData.set("id", transaction.id);
    await deleteTransaction(formData);
    setIsDeleting(false);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        title="Editar transação"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        title="Excluir transação"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-negative-soft hover:text-negative disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={16} />
      </button>

      {isEditing && (
        <Modal title="Editar transação" onClose={() => setIsEditing(false)}>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={transaction.id} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-tipo" className={labelClass}>
                Tipo
              </label>
              <select
                id="edit-tipo"
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
              <label htmlFor="edit-valor" className={labelClass}>
                Valor
              </label>
              <input
                id="edit-valor"
                name="valor"
                type="number"
                step="0.01"
                min="0"
                defaultValue={transaction.valor}
                required
                className={controlClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-categoryId" className={labelClass}>
                Categoria
              </label>
              <select
                id="edit-categoryId"
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
                <label htmlFor="edit-novaCategoriaNome" className={labelClass}>
                  Nome da nova categoria
                </label>
                <input
                  id="edit-novaCategoriaNome"
                  name="novaCategoriaNome"
                  type="text"
                  required
                  className={controlClass}
                />
              </div>
            )}

            {mostrarNovaCategoria && tipo === "DESPESA" && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="edit-novaCategoriaNatureza"
                  className={labelClass}
                >
                  Custo fixo ou variável?
                </label>
                <select
                  id="edit-novaCategoriaNatureza"
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
              <label htmlFor="edit-descricao" className={labelClass}>
                Descrição
              </label>
              <input
                id="edit-descricao"
                name="descricao"
                type="text"
                defaultValue={transaction.descricao}
                required
                className={controlClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-data" className={labelClass}>
                Data
              </label>
              <input
                id="edit-data"
                name="data"
                type="date"
                defaultValue={transaction.dataISO}
                required
                className={controlClass}
              />
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
