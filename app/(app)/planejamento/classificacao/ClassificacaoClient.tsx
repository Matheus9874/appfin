"use client";

import { Banknote, CheckCircle2, FileText, QrCode, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { confirmarNaturezaTransacoes, descartarSugestao } from "../actions";
import type { MeioPagamento, NaturezaCusto } from "@/app/generated/prisma/enums";

type Sugestao = {
  chave: string;
  descricaoExemplo: string;
  categoryNome: string;
  meioPagamento: MeioPagamento | null;
  naturezaAtual: NaturezaCusto | "MISTO" | null;
  sugestao: NaturezaCusto;
  mesesComGasto: number;
  valoresPorMes: number[];
  transactionIds: string[];
};

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const NATUREZA_LABEL: Record<NaturezaCusto, string> = {
  FIXO: "Fixo",
  VARIAVEL: "Variável",
};

const MEIO_PAGAMENTO_ICON: Partial<Record<MeioPagamento, typeof Banknote>> = {
  PIX: QrCode,
  DEBITO: Banknote,
  BOLETO: FileText,
};

function BadgeNatureza({ natureza }: { natureza: NaturezaCusto }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        natureza === "FIXO"
          ? "bg-accent-soft text-accent"
          : "bg-surface-hover text-foreground"
      }`}
    >
      {NATUREZA_LABEL[natureza]}
    </span>
  );
}

type TabKey = "todas" | "FIXO" | "VARIAVEL";

const TABS: { key: TabKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "FIXO", label: "Conta Fixa" },
  { key: "VARIAVEL", label: "Conta Variável" },
];

function LinhaConta({
  sugestao,
  confirmada,
  onConfirmar,
  onDescartar,
}: {
  sugestao: Sugestao;
  confirmada: boolean;
  onConfirmar: (transactionIds: string[], natureza: NaturezaCusto) => Promise<void>;
  onDescartar: (chave: string) => Promise<void>;
}) {
  const [escolha, setEscolha] = useState<NaturezaCusto>(sugestao.sugestao);
  const [isPending, startTransition] = useTransition();
  const [isDescartando, startTransitionDescartar] = useTransition();
  const MeioIcon = sugestao.meioPagamento
    ? MEIO_PAGAMENTO_ICON[sugestao.meioPagamento]
    : undefined;

  function handleConfirmar() {
    startTransition(() => onConfirmar(sugestao.transactionIds, escolha));
  }

  function handleDescartar() {
    startTransitionDescartar(() => onDescartar(sugestao.chave));
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {MeioIcon && <MeioIcon size={14} className="shrink-0 text-muted" />}
          <span className="font-medium">{sugestao.descricaoExemplo}</span>
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {sugestao.categoryNome} · {sugestao.mesesComGasto}{" "}
          {sugestao.mesesComGasto === 1 ? "mês" : "meses"} ·{" "}
          {sugestao.valoresPorMes.map((v) => formatMoeda(v)).join(" · ")}
        </div>
      </td>
      <td className="px-6 py-4">
        <BadgeNatureza natureza={sugestao.sugestao} />
      </td>
      <td className="px-6 py-4 text-sm text-muted">
        {sugestao.naturezaAtual === "MISTO"
          ? "Misto"
          : sugestao.naturezaAtual
            ? NATUREZA_LABEL[sugestao.naturezaAtual]
            : "—"}
      </td>
      <td className="px-6 py-4">
        <select
          value={escolha}
          disabled={isPending || confirmada}
          onChange={(e) => setEscolha(e.target.value as NaturezaCusto)}
          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
        >
          <option value="FIXO">Fixo</option>
          <option value="VARIAVEL">Variável</option>
        </select>
      </td>
      <td className="px-6 py-4 text-right">
        {confirmada ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-positive">
            <CheckCircle2 size={14} />
            Confirmado
          </span>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDescartar}
              disabled={isPending || isDescartando}
              title="Não é conta fixa nem variável relevante — some da lista e não volta a aparecer"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-negative-soft hover:text-negative disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={14} />
              {isDescartando ? "Descartando..." : "Descartar"}
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={isPending || isDescartando}
              className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-3.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Confirmando..." : "Confirmar"}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function ClassificacaoClient({
  sugestoes,
}: {
  sugestoes: Sugestao[];
}) {
  const router = useRouter();
  const [reanalisando, setReanalisando] = useState(false);
  const [confirmadas, setConfirmadas] = useState<Set<string>>(new Set());
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set());
  const [confirmandoTodas, startTransitionTodas] = useTransition();
  const [activeTab, setActiveTab] = useState<TabKey>("todas");

  const sugestoesVisiveis = useMemo(
    () => sugestoes.filter((s) => !descartadas.has(s.chave)),
    [sugestoes, descartadas],
  );

  const contagens = useMemo(
    () => ({
      todas: sugestoesVisiveis.length,
      FIXO: sugestoesVisiveis.filter((s) => s.sugestao === "FIXO").length,
      VARIAVEL: sugestoesVisiveis.filter((s) => s.sugestao === "VARIAVEL").length,
    }),
    [sugestoesVisiveis],
  );

  const sugestoesFiltradas = useMemo(() => {
    if (activeTab === "todas") return sugestoesVisiveis;
    return sugestoesVisiveis.filter((s) => s.sugestao === activeTab);
  }, [sugestoesVisiveis, activeTab]);

  async function confirmarUma(transactionIds: string[], natureza: NaturezaCusto) {
    await confirmarNaturezaTransacoes(transactionIds, natureza);
    setConfirmadas((atual) => new Set(atual).add(transactionIds.join(",")));
  }

  async function descartarUma(chave: string) {
    await descartarSugestao(chave);
    setDescartadas((atual) => new Set(atual).add(chave));
  }

  const restantesNaAba = sugestoesFiltradas.filter(
    (s) => !confirmadas.has(s.transactionIds.join(",")),
  );

  function handleConfirmarTodas() {
    startTransitionTodas(async () => {
      for (const s of restantesNaAba) {
        await confirmarNaturezaTransacoes(s.transactionIds, s.sugestao);
      }
      setConfirmadas((atual) => {
        const novo = new Set(atual);
        for (const s of restantesNaAba) novo.add(s.transactionIds.join(","));
        return novo;
      });
    });
  }

  function handleReanalisar() {
    setReanalisando(true);
    router.refresh();
    setTimeout(() => setReanalisando(false), 600);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  activeTab === tab.key
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-hover text-muted"
                }`}
              >
                {contagens[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReanalisar}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <RefreshCw size={14} className={reanalisando ? "animate-spin" : ""} />
            Reanalisar
          </button>
          {restantesNaAba.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmarTodas}
              disabled={confirmandoTodas}
              className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmandoTodas
                ? "Confirmando..."
                : `Confirmar todas as sugestões (${restantesNaAba.length})`}
            </button>
          )}
        </div>
      </div>

      {sugestoesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
          <p className="text-sm text-muted">
            Nenhuma conta recorrente encontrada nessa aba.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-6 py-3">Comerciante</th>
                <th className="px-6 py-3">Sugestão</th>
                <th className="px-6 py-3">Atual</th>
                <th className="px-6 py-3">Classificar como</th>
                <th className="px-6 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {sugestoesFiltradas.map((s) => (
                <LinhaConta
                  key={s.chave}
                  sugestao={s}
                  confirmada={confirmadas.has(s.transactionIds.join(","))}
                  onConfirmar={confirmarUma}
                  onDescartar={descartarUma}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
