"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import Modal from "@/app/components/Modal";
import { deleteInvestmentEntry, updateInvestmentEntry } from "./actions";
import {
  BANCOS_E_CORRETORAS_DIGITAIS,
  BANCOS_TRADICIONAIS,
} from "@/lib/institutions";
import { OUTRA_INSTITUICAO_VALUE } from "@/lib/constants";
import {
  INVESTMENT_TYPES,
  INVESTMENT_TYPE_LABELS,
} from "@/lib/investmentTypes";
import type { InvestmentType } from "@/app/generated/prisma/enums";

type InvestmentData = {
  id: string;
  tipo: InvestmentType;
  instituicao: string;
  nome: string | null;
  valor: number;
  dataISO: string;
};

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

const INSTITUICOES_CONHECIDAS = new Set([
  ...BANCOS_TRADICIONAIS,
  ...BANCOS_E_CORRETORAS_DIGITAIS,
]);

export default function InvestmentRowActions({
  investment,
}: {
  investment: InvestmentData;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [instituicaoSelecionada, setInstituicaoSelecionada] = useState(
    INSTITUICOES_CONHECIDAS.has(investment.instituicao)
      ? investment.instituicao
      : OUTRA_INSTITUICAO_VALUE,
  );

  const mostrarOutraInstituicao =
    instituicaoSelecionada === OUTRA_INSTITUICAO_VALUE;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateInvestmentEntry(formData);
    setIsEditing(false);
  }

  async function handleDelete() {
    const nomeExibicao = investment.nome
      ? `${investment.instituicao} — ${investment.nome}`
      : investment.instituicao;
    if (!confirm(`Excluir o lançamento de "${nomeExibicao}"?`)) return;
    setIsDeleting(true);
    const formData = new FormData();
    formData.set("id", investment.id);
    await deleteInvestmentEntry(formData);
    setIsDeleting(false);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        title="Editar lançamento"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        title="Excluir lançamento"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-negative-soft hover:text-negative disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={16} />
      </button>

      {isEditing && (
        <Modal title="Editar lançamento" onClose={() => setIsEditing(false)}>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={investment.id} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-inv-tipo" className={labelClass}>
                Tipo
              </label>
              <select
                id="edit-inv-tipo"
                name="tipo"
                defaultValue={investment.tipo}
                required
                className={controlClass}
              >
                {INVESTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {INVESTMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-inv-instituicaoSelecionada" className={labelClass}>
                Instituição / Banco
              </label>
              <select
                id="edit-inv-instituicaoSelecionada"
                name={mostrarOutraInstituicao ? undefined : "instituicao"}
                value={instituicaoSelecionada}
                onChange={(e) => setInstituicaoSelecionada(e.target.value)}
                required
                className={controlClass}
              >
                <optgroup label="Bancos tradicionais">
                  {BANCOS_TRADICIONAIS.map((banco) => (
                    <option key={banco} value={banco}>
                      {banco}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Bancos e corretoras digitais">
                  {BANCOS_E_CORRETORAS_DIGITAIS.map((banco) => (
                    <option key={banco} value={banco}>
                      {banco}
                    </option>
                  ))}
                </optgroup>
                <option value={OUTRA_INSTITUICAO_VALUE}>
                  Outra instituição
                </option>
              </select>
            </div>

            {mostrarOutraInstituicao && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-inv-instituicao" className={labelClass}>
                  Nome da instituição
                </label>
                <input
                  id="edit-inv-instituicao"
                  name="instituicao"
                  type="text"
                  defaultValue={
                    INSTITUICOES_CONHECIDAS.has(investment.instituicao)
                      ? ""
                      : investment.instituicao
                  }
                  required
                  className={controlClass}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-inv-nome" className={labelClass}>
                Nome / Apelido (opcional)
              </label>
              <input
                id="edit-inv-nome"
                name="nome"
                type="text"
                defaultValue={investment.nome ?? ""}
                className={controlClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-inv-valor" className={labelClass}>
                Valor atual (R$)
              </label>
              <input
                id="edit-inv-valor"
                name="valor"
                type="text"
                inputMode="decimal"
                defaultValue={investment.valor}
                required
                className={controlClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-inv-data" className={labelClass}>
                Data do lançamento
              </label>
              <input
                id="edit-inv-data"
                name="data"
                type="date"
                defaultValue={investment.dataISO}
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
