"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import {
  BANCOS_E_CORRETORAS_DIGITAIS,
  BANCOS_TRADICIONAIS,
} from "@/lib/institutions";
import { OUTRA_INSTITUICAO_VALUE } from "@/lib/constants";
import {
  INVESTMENT_TYPES,
  INVESTMENT_TYPE_DESCRIPTIONS,
  INVESTMENT_TYPE_LABELS,
} from "@/lib/investmentTypes";
import InfoTooltip from "@/app/components/InfoTooltip";
import { paraDataLocal } from "@/lib/dateLocal";
import SubmitButton from "@/app/components/SubmitButton";
import { useGuardedAction } from "@/lib/useGuardedAction";
import { createInvestmentEntry } from "./actions";

const TIPO_TOOLTIP_TEXT = INVESTMENT_TYPES.map(
  (t) => `${INVESTMENT_TYPE_LABELS[t]}: ${INVESTMENT_TYPE_DESCRIPTIONS[t]}`,
).join("\n\n");

const labelClass = "text-xs font-medium text-muted";
const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function InvestmentForm() {
  const [instituicaoSelecionada, setInstituicaoSelecionada] = useState("");
  const handleCreate = useGuardedAction(createInvestmentEntry);

  const mostrarOutraInstituicao =
    instituicaoSelecionada === OUTRA_INSTITUICAO_VALUE;

  return (
    <form
      action={handleCreate}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tipo" className="flex items-center gap-1.5">
          <span className={labelClass}>Tipo</span>
          <InfoTooltip text={TIPO_TOOLTIP_TEXT} />
        </label>
        <select
          id="tipo"
          name="tipo"
          defaultValue="POUPANCA"
          required
          className={controlClass}
        >
          {INVESTMENT_TYPES.map((t) => (
            <option key={t} value={t} title={INVESTMENT_TYPE_DESCRIPTIONS[t]}>
              {INVESTMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="instituicaoSelecionada" className={labelClass}>
          Instituição / Banco
        </label>
        <select
          id="instituicaoSelecionada"
          name={mostrarOutraInstituicao ? undefined : "instituicao"}
          value={instituicaoSelecionada}
          onChange={(e) => setInstituicaoSelecionada(e.target.value)}
          required
          className={controlClass}
        >
          <option value="" disabled>
            Selecione
          </option>
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
          <option value={OUTRA_INSTITUICAO_VALUE}>Outra instituição</option>
        </select>
      </div>

      {mostrarOutraInstituicao && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="instituicao" className={labelClass}>
            Nome da instituição
          </label>
          <input
            id="instituicao"
            name="instituicao"
            type="text"
            required
            className={controlClass}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className="flex items-center gap-1.5">
          <span className={labelClass}>Nome / Apelido (opcional)</span>
          <InfoTooltip text="Use para diferenciar investimentos do mesmo tipo e instituição (ex: duas contas CDB no mesmo banco). Junto com tipo e instituição, identifica o histórico deste investimento." />
        </label>
        <input id="nome" name="nome" type="text" className={controlClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="valor" className={labelClass}>
          Valor atual (R$)
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
        <label htmlFor="data" className={labelClass}>
          Data do lançamento
        </label>
        <input
          id="data"
          name="data"
          type="date"
          defaultValue={paraDataLocal(new Date())}
          required
          className={controlClass}
        />
      </div>

      <div className="flex items-end sm:col-span-2 lg:col-span-5">
        <SubmitButton
          pendingText="Adicionando..."
          className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={16} />
          Adicionar lançamento
        </SubmitButton>
      </div>
    </form>
  );
}
