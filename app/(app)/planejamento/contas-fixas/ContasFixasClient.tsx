"use client";

import {
  AlertTriangle,
  CheckCircle2,
  History,
  HelpCircle,
  Pencil,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import Modal from "@/app/components/Modal";
import {
  atualizarContaFixa,
  buscarCorrespondenciasAction,
  buscarHistoricoContaFixa,
  buscarTransacoesCandidatas,
  criarContaFixa,
  desvincularContaFixa,
  excluirContaFixa,
  resolverManualmente,
  vincularTransacaoHistorico,
} from "../actions";

type TransacaoResumo = {
  id: string;
  descricao: string;
  valor: number;
  dataFormatada: string;
};

type EstadoContaFixa =
  | {
      tipo: "RESOLVIDA";
      status: "AUTOMATICO" | "MANUAL" | "NAO_ENCONTRADA";
      transacao: TransacaoResumo | null;
    }
  | { tipo: "AMBIGUO"; candidatos: TransacaoResumo[] }
  | { tipo: "NENHUM" };

type ContaFixa = {
  id: string;
  nome: string;
  valorEsperado: number;
  valorMin: number;
  valorMax: number;
  categoryId: string | null;
  categoryNome: string | null;
  estado: EstadoContaFixa;
};

type Categoria = { id: string; nome: string };

type HistoricoItem = {
  id: string;
  descricao: string;
  valor: number;
  dataFormatada: string;
  mesLabel: string;
  vinculada: boolean;
};

const NOMES_SUGERIDOS = [
  "Parcela do carro",
  "Aluguel",
  "Parcela de financiamento",
  "Água",
  "Luz",
  "Gás",
  "Condomínio",
  "Internet",
  "Telefone",
  "Seguro",
];

const controlClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelClass = "text-xs font-medium text-muted";

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function faixasSobrepoem(
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number,
): boolean {
  return aMin <= bMax && aMax >= bMin;
}

function faixaNumerica(valor: string): number {
  return Number(valor.replace(",", "."));
}

/** Margem padrão de correspondência: ±5% em torno do valor esperado. */
const MARGEM_PADRAO = 0.05;

function calcularFaixaPadrao(valorEsperadoStr: string): { min: string; max: string } {
  const numero = faixaNumerica(valorEsperadoStr);
  if (!Number.isFinite(numero) || numero <= 0) return { min: "", max: "" };
  return {
    min: (numero * (1 - MARGEM_PADRAO)).toFixed(2),
    max: (numero * (1 + MARGEM_PADRAO)).toFixed(2),
  };
}

function CamposContaFixa({
  nome,
  setNome,
  valorEsperado,
  setValorEsperado,
  valorMin,
  setValorMin,
  valorMax,
  setValorMax,
  margemPersonalizada,
  onAtivarMargemPersonalizada,
  onUsarMargemPadrao,
  categoryId,
  setCategoryId,
  categorias,
  aviso,
}: {
  nome: string;
  setNome: (v: string) => void;
  valorEsperado: string;
  setValorEsperado: (v: string) => void;
  valorMin: string;
  setValorMin: (v: string) => void;
  valorMax: string;
  setValorMax: (v: string) => void;
  margemPersonalizada: boolean;
  onAtivarMargemPersonalizada: () => void;
  onUsarMargemPadrao: () => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  categorias: Categoria[];
  aviso: string | null;
}) {
  const min = faixaNumerica(valorMin);
  const max = faixaNumerica(valorMax);
  const faixaValida = Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Nome</label>
          <input
            list="nomes-sugeridos-conta-fixa"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Aluguel"
            required
            className={controlClass}
          />
          <datalist id="nomes-sugeridos-conta-fixa">
            {NOMES_SUGERIDOS.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Valor esperado</label>
          <input
            type="text"
            inputMode="decimal"
            value={valorEsperado}
            onChange={(e) => setValorEsperado(e.target.value)}
            placeholder="0,00"
            required
            className={controlClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Categoria (opcional)</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={controlClass}
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!margemPersonalizada ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {faixaValida
              ? `Vamos procurar transações entre ${formatMoeda(min)} e ${formatMoeda(max)} (±5%).`
              : "Informe o valor esperado pra ver a faixa de busca (±5%)."}
          </span>
          <button
            type="button"
            onClick={onAtivarMargemPersonalizada}
            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
          >
            <SlidersHorizontal size={12} />
            Ajustar margem
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Faixa de correspondência</span>
            <button
              type="button"
              onClick={onUsarMargemPadrao}
              className="text-xs font-medium text-accent hover:underline"
            >
              Usar padrão (±5%)
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Valor mínimo</label>
              <input
                type="text"
                inputMode="decimal"
                value={valorMin}
                onChange={(e) => setValorMin(e.target.value)}
                placeholder="0,00"
                required
                className={controlClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Valor máximo</label>
              <input
                type="text"
                inputMode="decimal"
                value={valorMax}
                onChange={(e) => setValorMax(e.target.value)}
                placeholder="0,00"
                required
                className={controlClass}
              />
            </div>
          </div>
        </div>
      )}

      {aviso && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{aviso}</span>
        </div>
      )}
    </div>
  );
}

function useFormularioContaFixa(
  contas: ContaFixa[],
  contaAtualId?: string,
  valoresIniciais?: {
    nome: string;
    valorEsperado: string;
    valorMin: string;
    valorMax: string;
    categoryId: string;
  },
) {
  const [nome, setNome] = useState(valoresIniciais?.nome ?? "");
  const [valorEsperado, setValorEsperadoState] = useState(
    valoresIniciais?.valorEsperado ?? "",
  );
  const [valorMin, setValorMin] = useState(
    valoresIniciais?.valorMin ?? calcularFaixaPadrao(valoresIniciais?.valorEsperado ?? "").min,
  );
  const [valorMax, setValorMax] = useState(
    valoresIniciais?.valorMax ?? calcularFaixaPadrao(valoresIniciais?.valorEsperado ?? "").max,
  );
  const [categoryId, setCategoryId] = useState(valoresIniciais?.categoryId ?? "");

  // Se os valores min/max recebidos (edição) já divergem do que a margem
  // padrão calcularia, a conta foi personalizada antes — abre o painel
  // avançado já expandido em vez de esconder o valor real dela.
  const [margemPersonalizada, setMargemPersonalizada] = useState(() => {
    if (!valoresIniciais) return false;
    const padrao = calcularFaixaPadrao(valoresIniciais.valorEsperado);
    return (
      Math.abs(faixaNumerica(valoresIniciais.valorMin) - faixaNumerica(padrao.min)) > 0.01 ||
      Math.abs(faixaNumerica(valoresIniciais.valorMax) - faixaNumerica(padrao.max)) > 0.01
    );
  });

  function setValorEsperado(v: string) {
    setValorEsperadoState(v);
    if (!margemPersonalizada) {
      const padrao = calcularFaixaPadrao(v);
      setValorMin(padrao.min);
      setValorMax(padrao.max);
    }
  }

  function ativarMargemPersonalizada() {
    setMargemPersonalizada(true);
  }

  function usarMargemPadrao() {
    setMargemPersonalizada(false);
    const padrao = calcularFaixaPadrao(valorEsperado);
    setValorMin(padrao.min);
    setValorMax(padrao.max);
  }

  const aviso = useMemo(() => {
    const min = faixaNumerica(valorMin);
    const max = faixaNumerica(valorMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    const conflito = contas.find(
      (c) =>
        c.id !== contaAtualId && faixasSobrepoem(min, max, c.valorMin, c.valorMax),
    );
    if (!conflito) return null;
    return `Essa faixa se sobrepõe com "${conflito.nome}" (${formatMoeda(conflito.valorMin)}–${formatMoeda(conflito.valorMax)}) — se uma transação cair nos dois, você vai precisar escolher manualmente qual é qual.`;
  }, [valorMin, valorMax, contas, contaAtualId]);

  return {
    nome,
    setNome,
    valorEsperado,
    setValorEsperado,
    valorMin,
    setValorMin,
    valorMax,
    setValorMax,
    margemPersonalizada,
    ativarMargemPersonalizada,
    usarMargemPadrao,
    categoryId,
    setCategoryId,
    aviso,
  };
}

function FormularioNovaContaFixa({
  contas,
  categorias,
}: {
  contas: ContaFixa[];
  categorias: Categoria[];
}) {
  const form = useFormularioContaFixa(contas);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [candidatas, setCandidatas] = useState<TransacaoResumo[]>([]);
  const [buscandoCandidatas, setBuscandoCandidatas] = useState(false);
  const [candidatasEscolhidas, setCandidatasEscolhidas] = useState<Set<string>>(new Set());

  const min = faixaNumerica(form.valorMin);
  const max = faixaNumerica(form.valorMax);
  const faixaValida = Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min;

  useEffect(() => {
    // Faixa inválida: não busca. Uma `candidatas`/`candidatasEscolhidas`
    // desatualizada fica inofensiva aqui — o bloco só é exibido quando
    // `faixaValida`, e o submit exige valorMin/valorMax preenchidos.
    if (!faixaValida) return;

    let cancelado = false;
    const timer = setTimeout(() => {
      setBuscandoCandidatas(true);
      buscarTransacoesCandidatas(min, max)
        .then((resultado) => {
          if (cancelado) return;
          setCandidatas(resultado);
          setCandidatasEscolhidas((atual) => {
            const idsValidos = new Set(resultado.map((c) => c.id));
            return new Set([...atual].filter((id) => idsValidos.has(id)));
          });
        })
        .finally(() => {
          if (!cancelado) setBuscandoCandidatas(false);
        });
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [min, max, faixaValida]);

  function alternarCandidata(id: string) {
    setCandidatasEscolhidas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.set("nome", form.nome);
      formData.set("valorEsperado", form.valorEsperado);
      formData.set("valorMin", form.valorMin);
      formData.set("valorMax", form.valorMax);
      formData.set("categoryId", form.categoryId);
      for (const id of candidatasEscolhidas) formData.append("transactionIds", id);
      await criarContaFixa(formData);
      form.setNome("");
      form.setValorEsperado("");
      form.setValorMin("");
      form.setValorMax("");
      form.setCategoryId("");
      setCandidatas([]);
      setCandidatasEscolhidas(new Set());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <h2 className="text-base font-semibold">Nova conta fixa</h2>
      <CamposContaFixa
        nome={form.nome}
        setNome={form.setNome}
        valorEsperado={form.valorEsperado}
        setValorEsperado={form.setValorEsperado}
        valorMin={form.valorMin}
        setValorMin={form.setValorMin}
        valorMax={form.valorMax}
        setValorMax={form.setValorMax}
        margemPersonalizada={form.margemPersonalizada}
        onAtivarMargemPersonalizada={form.ativarMargemPersonalizada}
        onUsarMargemPadrao={form.usarMargemPadrao}
        categoryId={form.categoryId}
        setCategoryId={form.setCategoryId}
        categorias={categorias}
        aviso={form.aviso}
      />

      {faixaValida && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
          <p className="text-sm font-medium">Alguma dessas é a conta?</p>
          {buscandoCandidatas ? (
            <p className="text-xs text-muted">Buscando transações dos últimos 3 meses...</p>
          ) : candidatas.length === 0 ? (
            <p className="text-xs text-muted">
              Nenhuma transação dos últimos 3 meses nessa faixa ainda — a
              conta fixa é salva do mesmo jeito e passa a procurar sozinha
              nos próximos meses.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted">
                Marque todas as que já são dessa conta — mesmo que o texto
                da descrição varie entre elas (ex.: débito direto num mês,
                boleto no outro), marcar todas ensina os diferentes formatos
                de uma vez.
              </p>
              {candidatas.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={candidatasEscolhidas.has(c.id)}
                    onChange={() => alternarCandidata(c.id)}
                  />
                  {c.descricao} · {formatMoeda(c.valor)} · {c.dataFormatada}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {erro && (
        <div className="rounded-lg bg-negative-soft px-4 py-3 text-sm text-negative">
          {erro}
        </div>
      )}
      <div>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Adicionar conta fixa"}
        </button>
      </div>
    </form>
  );
}

function ModalEditarContaFixa({
  conta,
  contas,
  categorias,
  onClose,
}: {
  conta: ContaFixa;
  contas: ContaFixa[];
  categorias: Categoria[];
  onClose: () => void;
}) {
  const form = useFormularioContaFixa(contas, conta.id, {
    nome: conta.nome,
    valorEsperado: String(conta.valorEsperado),
    valorMin: String(conta.valorMin),
    valorMax: String(conta.valorMax),
    categoryId: conta.categoryId ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.set("id", conta.id);
      formData.set("nome", form.nome);
      formData.set("valorEsperado", form.valorEsperado);
      formData.set("valorMin", form.valorMin);
      formData.set("valorMax", form.valorMax);
      formData.set("categoryId", form.categoryId);
      await atualizarContaFixa(formData);
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal title="Editar conta fixa" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CamposContaFixa
          nome={form.nome}
          setNome={form.setNome}
          valorEsperado={form.valorEsperado}
          setValorEsperado={form.setValorEsperado}
          valorMin={form.valorMin}
          setValorMin={form.setValorMin}
          valorMax={form.valorMax}
          setValorMax={form.setValorMax}
          margemPersonalizada={form.margemPersonalizada}
          onAtivarMargemPersonalizada={form.ativarMargemPersonalizada}
          onUsarMargemPadrao={form.usarMargemPadrao}
          categoryId={form.categoryId}
          setCategoryId={form.setCategoryId}
          categorias={categorias}
          aviso={form.aviso}
        />
        {erro && (
          <div className="rounded-lg bg-negative-soft px-4 py-3 text-sm text-negative">
            {erro}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalHistoricoContaFixa({
  conta,
  onClose,
}: {
  conta: ContaFixa;
  onClose: () => void;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [vinculandoId, setVinculandoId] = useState<string | null>(null);
  const [erroVincular, setErroVincular] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    buscarHistoricoContaFixa(conta.id)
      .then((resultado) => {
        if (!cancelado) setHistorico(resultado);
      })
      .catch((err) => {
        if (!cancelado) {
          setErro(err instanceof Error ? err.message : "Não foi possível carregar o histórico.");
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [conta.id]);

  async function handleVincular(transactionId: string) {
    setErroVincular(null);
    setVinculandoId(transactionId);
    try {
      await vincularTransacaoHistorico(conta.id, transactionId);
      const resultado = await buscarHistoricoContaFixa(conta.id);
      setHistorico(resultado);
      router.refresh();
    } catch (err) {
      setErroVincular(err instanceof Error ? err.message : "Não foi possível vincular.");
    } finally {
      setVinculandoId(null);
    }
  }

  return (
    <Modal title={`Histórico · ${conta.nome}`} onClose={onClose}>
      <p className="mb-3 text-xs text-muted">
        Transações dos últimos 3 meses parecidas com essa conta — mesmo
        destinatário aprendido e/ou valor na faixa. Batendo nos dois
        critérios, já vem vinculada automaticamente; batendo só um deles,
        você confirma com &ldquo;Vincular&rdquo; (aprende esse formato novo
        pra não precisar confirmar de novo).
      </p>
      {carregando ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : erro ? (
        <p className="text-sm text-negative">{erro}</p>
      ) : historico.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhuma transação parecida com essa conta nos últimos 3 meses.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {historico.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{item.descricao}</span>
                  <span className="text-xs text-muted">
                    {formatMoeda(item.valor)} · {item.dataFormatada} ·{" "}
                    <span className="capitalize">{item.mesLabel}</span>
                  </span>
                </div>
                {item.vinculada ? (
                  <span
                    title="Já vinculada a essa conta fixa"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-positive-soft px-2 py-0.5 text-xs font-medium text-positive"
                  >
                    <CheckCircle2 size={12} />
                    Vinculada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleVincular(item.id)}
                    disabled={vinculandoId === item.id}
                    title="Bate só um dos critérios — confirme se é a mesma conta"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <HelpCircle size={12} />
                    {vinculandoId === item.id ? "Vinculando..." : "Vincular"}
                  </button>
                )}
              </div>
            ))}
          </div>
          {erroVincular && <p className="text-xs text-negative">{erroVincular}</p>}
        </div>
      )}
    </Modal>
  );
}

function CardContaFixa({
  conta,
  contas,
  categorias,
}: {
  conta: ContaFixa;
  contas: ContaFixa[];
  categorias: Categoria[];
}) {
  const [editando, setEditando] = useState(false);
  const [mostrandoHistorico, setMostrandoHistorico] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [candidataEscolhida, setCandidataEscolhida] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);

  function handleExcluir() {
    if (!confirm(`Excluir a conta fixa "${conta.nome}"?`)) return;
    startTransition(() => excluirContaFixa(conta.id));
  }

  function handleDesvincular() {
    startTransition(() => desvincularContaFixa(conta.id));
  }

  function handleResolverCandidata() {
    if (!candidataEscolhida) return;
    setErro(null);
    startTransition(async () => {
      try {
        await resolverManualmente(conta.id, candidataEscolhida);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível vincular.");
      }
    });
  }

  function handleMarcarNaoEncontrada() {
    startTransition(() => resolverManualmente(conta.id, null));
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{conta.nome}</p>
          <p className="text-xs text-muted">
            {formatMoeda(conta.valorMin)} – {formatMoeda(conta.valorMax)}
            {conta.categoryNome && ` · ${conta.categoryNome}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMostrandoHistorico(true)}
            title="Histórico"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <History size={14} />
          </button>
          <button
            type="button"
            onClick={() => setEditando(true)}
            title="Editar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleExcluir}
            title="Excluir"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-negative-soft hover:text-negative"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {conta.estado.tipo === "RESOLVIDA" && conta.estado.transacao && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-positive-soft px-3 py-2 text-sm text-positive">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            {conta.estado.transacao.descricao} · {formatMoeda(conta.estado.transacao.valor)} ·{" "}
            {conta.estado.transacao.dataFormatada}
          </span>
          <button
            type="button"
            onClick={handleDesvincular}
            disabled={isPending}
            className="text-xs font-medium underline decoration-dotted hover:opacity-80"
          >
            Desvincular
          </button>
        </div>
      )}

      {conta.estado.tipo === "RESOLVIDA" && !conta.estado.transacao && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-hover px-3 py-2 text-sm text-muted">
          <span>Marcada como não encontrada este mês.</span>
          <button
            type="button"
            onClick={handleDesvincular}
            disabled={isPending}
            className="text-xs font-medium underline decoration-dotted hover:opacity-80"
          >
            Reabrir
          </button>
        </div>
      )}

      {conta.estado.tipo === "AMBIGUO" && (
        <div className="flex flex-col gap-2 rounded-lg bg-warning-soft px-3 py-3 text-sm text-warning">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <HelpCircle size={14} />
            {conta.estado.candidatos.length} transações candidatas — qual é a certa?
          </span>
          <div className="flex flex-col gap-1.5">
            {conta.estado.candidatos.map((cand) => (
              <label key={cand.id} className="flex items-center gap-2 text-foreground">
                <input
                  type="radio"
                  name={`candidata-${conta.id}`}
                  value={cand.id}
                  checked={candidataEscolhida === cand.id}
                  onChange={() => setCandidataEscolhida(cand.id)}
                />
                {cand.descricao} · {formatMoeda(cand.valor)} · {cand.dataFormatada}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResolverCandidata}
              disabled={isPending || !candidataEscolhida}
              className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Vincular
            </button>
            <button
              type="button"
              onClick={handleMarcarNaoEncontrada}
              disabled={isPending}
              className="text-xs font-medium text-muted underline decoration-dotted hover:opacity-80"
            >
              Nenhuma dessas / não encontrada
            </button>
          </div>
        </div>
      )}

      {conta.estado.tipo === "NENHUM" && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-hover px-3 py-2 text-sm text-muted">
          <span>Nenhuma transação nessa faixa esse mês ainda.</span>
          <button
            type="button"
            onClick={handleMarcarNaoEncontrada}
            disabled={isPending}
            className="text-xs font-medium underline decoration-dotted hover:opacity-80"
          >
            Marcar como não encontrada
          </button>
        </div>
      )}

      {erro && <p className="text-xs text-negative">{erro}</p>}

      {editando && (
        <ModalEditarContaFixa
          conta={conta}
          contas={contas}
          categorias={categorias}
          onClose={() => setEditando(false)}
        />
      )}

      {mostrandoHistorico && (
        <ModalHistoricoContaFixa conta={conta} onClose={() => setMostrandoHistorico(false)} />
      )}
    </div>
  );
}

export default function ContasFixasClient({
  contas,
  categorias,
}: {
  contas: ContaFixa[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [buscando, setBuscando] = useState(false);

  async function handleBuscar() {
    setBuscando(true);
    try {
      await buscarCorrespondenciasAction();
      router.refresh();
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <FormularioNovaContaFixa contas={contas} categorias={categorias} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Suas contas fixas</h2>
          <button
            type="button"
            onClick={handleBuscar}
            disabled={buscando}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={buscando ? "animate-spin" : ""} />
            Buscar correspondências
          </button>
        </div>

        {contas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
            <p className="text-sm text-muted">
              Nenhuma conta fixa cadastrada ainda — adicione a primeira acima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {contas.map((c) => (
              <CardContaFixa key={c.id} conta={c} contas={contas} categorias={categorias} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
