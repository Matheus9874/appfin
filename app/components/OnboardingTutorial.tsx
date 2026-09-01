"use client";

import {
  ArrowRight,
  FileBarChart,
  LayoutDashboard,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import Logo from "./Logo";

type Step = {
  icon: LucideIcon | null;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: null,
    title: "Bem-vindo ao RumoFin",
    description:
      "Seu controle financeiro pessoal, simples e completo. Em poucos passos, mostramos onde encontrar cada coisa.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard e Transações",
    description:
      "No Dashboard você vê o resumo das suas finanças e sua Saúde Financeira. Em Transações, registre receitas e despesas em segundos e organize tudo por categoria.",
  },
  {
    icon: Target,
    title: "Metas e Investimentos",
    description:
      "Crie Metas financeiras vinculadas aos seus investimentos e acompanhe o progresso. Em Reserva e Investimentos, registre onde seu dinheiro está guardado.",
  },
  {
    icon: FileBarChart,
    title: "Relatórios",
    description:
      "Simule investimentos, compras financiadas e veja para onde vai seu dinheiro com relatórios detalhados.",
  },
];

export default function OnboardingTutorial({
  onClose,
}: {
  onClose: (dontShowAgain: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(dontShowAgain);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atual = STEPS[step];
  const Icon = atual.icon;
  const ultimoPasso = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => onClose(dontShowAgain)}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white">
            {Icon ? <Icon size={26} /> : <Logo size={30} />}
          </div>
          <button
            type="button"
            onClick={() => onClose(dontShowAgain)}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <h2 className="mt-5 text-lg font-semibold tracking-tight">
          {atual.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {atual.description}
        </p>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Ir para etapa ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-accent" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <label className="mt-6 flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Não mostrar novamente
        </label>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onClose(dontShowAgain)}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Pular
          </button>

          {ultimoPasso ? (
            <button
              type="button"
              onClick={() => onClose(dontShowAgain)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Concluir
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Próximo
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
