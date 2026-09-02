"use client";

import { Home, TrendingUp, Umbrella, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { saveMonthlyPlan } from "./actions";

type Plano = {
  rendaPlanejada: string;
  percentualEssencial: string;
  percentualPessoal: string;
  percentualReserva: string;
  percentualInvestimento: string;
};

type PlanoSalvo = {
  rendaPlanejada: number;
  percentualEssencial: number;
  percentualPessoal: number;
  percentualReserva: number;
  percentualInvestimento: number;
};

type Realizado = {
  essencial: number;
  pessoal: number;
  investimento: number;
  reserva: number;
};

const PRESET_PADRAO: Plano = {
  rendaPlanejada: "",
  percentualEssencial: "50",
  percentualPessoal: "25",
  percentualReserva: "15",
  percentualInvestimento: "10",
};

function paraFormulario(plano: PlanoSalvo): Plano {
  return {
    rendaPlanejada: String(plano.rendaPlanejada),
    percentualEssencial: String(plano.percentualEssencial),
    percentualPessoal: String(plano.percentualPessoal),
    percentualReserva: String(plano.percentualReserva),
    percentualInvestimento: String(plano.percentualInvestimento),
  };
}

/** Leitura tolerante pro cálculo ao vivo na tela — a validação de verdade é no server action. */
function paraNumero(raw: string): number {
  const normalizado = raw.trim().includes(",")
    ? raw.trim().replace(/\./g, "").replace(",", ".")
    : raw.trim();
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : 0;
}

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

const FATIAS: {
  key: keyof Realizado;
  percentualKey: keyof Plano;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "essencial", percentualKey: "percentualEssencial", label: "Essencial", icon: Home },
  { key: "pessoal", percentualKey: "percentualPessoal", label: "Pessoal", icon: User },
  { key: "reserva", percentualKey: "percentualReserva", label: "Reserva", icon: Umbrella },
  { key: "investimento", percentualKey: "percentualInvestimento", label: "Investimento", icon: TrendingUp },
];

function FatiaCard({
  label,
  icon: Icon,
  planejado,
  realizado,
}: {
  label: string;
  icon: LucideIcon;
  planejado: number;
  realizado: number;
}) {
  const percentual = planejado > 0 ? (realizado / planejado) * 100 : 0;
  const estourou = planejado > 0 && realizado > planejado;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            estourou ? "bg-negative-soft text-negative" : "bg-accent-soft text-accent"
          }`}
        >
          <Icon size={20} />
        </div>
        <span className="text-sm font-medium text-muted">{label}</span>
      </div>
      <p className="mt-4 text-xl font-semibold tracking-tight">
        {formatMoeda(realizado)}{" "}
        <span className="text-sm font-normal text-muted">
          / {formatMoeda(planejado)}
        </span>
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
        <div
          className={`h-full rounded-full ${estourou ? "bg-negative" : "bg-accent"}`}
          style={{ width: `${Math.min(100, percentual)}%` }}
        />
      </div>
      <p className={`mt-1.5 text-xs ${estourou ? "text-negative" : "text-muted"}`}>
        {planejado > 0
          ? `${percentual.toFixed(0)}% do planejado`
          : "Sem valor planejado ainda"}
      </p>
    </div>
  );
}

export default function PlanejamentoClient({
  mes,
  ano,
  planoExistente,
  realizado,
}: {
  mes: number;
  ano: number;
  planoExistente: PlanoSalvo | null;
  realizado: Realizado;
}) {
  const [form, setForm] = useState<Plano>(
    planoExistente ? paraFormulario(planoExistente) : PRESET_PADRAO,
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const rendaPlanejada = paraNumero(form.rendaPlanejada);
  const soma =
    paraNumero(form.percentualEssencial) +
    paraNumero(form.percentualPessoal) +
    paraNumero(form.percentualReserva) +
    paraNumero(form.percentualInvestimento);
  const somaValida = Math.abs(soma - 100) <= 0.5;

  function handleChange(campo: keyof Plano, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setMensagem(null);
    if (!somaValida) {
      setErro(`Os percentuais precisam somar 100% (hoje soma ${soma.toFixed(1)}%).`);
      return;
    }
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.set("mes", String(mes));
      formData.set("ano", String(ano));
      formData.set("rendaPlanejada", form.rendaPlanejada);
      formData.set("percentualEssencial", form.percentualEssencial);
      formData.set("percentualPessoal", form.percentualPessoal);
      formData.set("percentualReserva", form.percentualReserva);
      formData.set("percentualInvestimento", form.percentualInvestimento);
      await saveMonthlyPlan(formData);
      setMensagem("Planejamento salvo!");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <label htmlFor="rendaPlanejada" className="text-xs font-medium text-muted">
            Renda planejada do mês
          </label>
          <input
            id="rendaPlanejada"
            type="text"
            inputMode="decimal"
            value={form.rendaPlanejada}
            onChange={(e) => handleChange("rendaPlanejada", e.target.value)}
            placeholder="0,00"
            required
            className={controlClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FATIAS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label htmlFor={f.percentualKey} className="text-xs font-medium text-muted">
                {f.label} (%)
              </label>
              <input
                id={f.percentualKey}
                type="text"
                inputMode="decimal"
                value={form[f.percentualKey]}
                onChange={(e) => handleChange(f.percentualKey, e.target.value)}
                required
                className={controlClass}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`text-sm font-medium ${somaValida ? "text-positive" : "text-negative"}`}
          >
            Soma: {soma.toFixed(1)}%{somaValida ? "" : " (precisa fechar 100%)"}
          </span>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar planejamento"}
          </button>
        </div>

        {erro && (
          <div className="rounded-lg bg-negative-soft px-4 py-3 text-sm text-negative">
            {erro}
          </div>
        )}
        {mensagem && !erro && (
          <div className="rounded-lg bg-positive-soft px-4 py-3 text-sm text-positive">
            {mensagem}
          </div>
        )}
      </form>

      <section>
        <h2 className="mb-4 text-base font-semibold">Planejado × Realizado</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FATIAS.map((f) => (
            <FatiaCard
              key={f.key}
              label={f.label}
              icon={f.icon}
              planejado={rendaPlanejada * (paraNumero(form[f.percentualKey]) / 100)}
              realizado={realizado[f.key]}
            />
          ))}
        </div>
      </section>

      <Link
        href="/planejamento/contas-fixas"
        className="text-sm font-medium text-accent hover:underline"
      >
        Cadastrar/ajustar contas fixas (o que conta como Essencial) →
      </Link>
    </div>
  );
}
