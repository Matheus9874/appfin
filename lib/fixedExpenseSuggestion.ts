import { prisma } from "./prisma";
import { paraMesLocal } from "./dateLocal";
import type { MeioPagamento, NaturezaCusto } from "@/app/generated/prisma/enums";

/** Variação máxima (desvio padrão / média) pra considerar uma conta "fixa". */
export const LIMITE_CV_FIXO = 0.15;
/** Precisa aparecer em pelo menos 2 dos 3 meses da janela pra virar candidata. */
export const MIN_MESES_COM_GASTO = 2;

/**
 * Nesse primeiro momento a análise só olha formas de pagamento "de conta"
 * (boleto, débito, pix) — cartão de crédito fica de fora porque mistura
 * gasto real recorrente (ex.: assinatura) com compra pontual que só
 * coincide de ter valor parecido, e isso não dá pra distinguir só pelo
 * valor/recorrência.
 */
export const MEIOS_PAGAMENTO_ANALISADOS: MeioPagamento[] = [
  "BOLETO",
  "DEBITO",
  "PIX",
];

export function calcularCoeficienteVariacao(valores: number[]): number {
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  if (media <= 0) return Infinity;
  const variancia =
    valores.reduce((a, b) => a + (b - media) ** 2, 0) / valores.length;
  return Math.sqrt(variancia) / media;
}

/**
 * Regra pura de sugestão, dados só os totais mensais em que o comerciante
 * teve gasto (meses sem gasto não entram no array). Separada da consulta ao
 * banco pra ser testável sem depender de dados reais.
 */
export function sugerirNatureza(valoresPorMes: number[]): NaturezaCusto {
  if (valoresPorMes.length < MIN_MESES_COM_GASTO) return "VARIAVEL";
  return calcularCoeficienteVariacao(valoresPorMes) <= LIMITE_CV_FIXO
    ? "FIXO"
    : "VARIAVEL";
}

/**
 * Normaliza a descrição de uma transação pra agrupar o mesmo
 * estabelecimento/pagamento mesmo quando varia número de parcela, cidade
 * etc. (ex.: "ALAN VITOR DA COSTA EGEIA" continua igual mês a mês).
 */
export function normalizarDescricao(descricao: string): string {
  return descricao
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/\s+(joinville|florianopolis|sao paulo|bra|sc|brasil)\s*$/gi, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type SugestaoConta = {
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

function resumirNaturezaAtual(
  naturezas: Set<NaturezaCusto | null>,
): NaturezaCusto | "MISTO" | null {
  if (naturezas.size === 0) return null;
  if (naturezas.size > 1) return "MISTO";
  const [unica] = naturezas;
  return unica;
}

/**
 * Analisa os 3 meses civis completos anteriores ao atual e agrupa despesas
 * por comerciante (descrição normalizada), olhando só boleto/débito/pix —
 * ver MEIOS_PAGAMENTO_ANALISADOS. Só entra quem aparece em pelo menos 2 dos
 * 3 meses; a partir daí, sugere Fixo quando o valor mensal é consistente
 * (variação ≤15%) e Variável quando não é — mesmo comerciante recorrente,
 * mas valor solto (ex.: restaurante, Uber) cai como Variável.
 */
export async function sugerirContasRecorrentes(
  userId: string,
): Promise<SugestaoConta[]> {
  const agora = new Date();
  const inicioJanela = new Date(agora.getFullYear(), agora.getMonth() - 3, 1);
  const fimJanela = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const transacoes = await prisma.transaction.findMany({
    where: {
      userId,
      tipo: "DESPESA",
      transferenciaInterna: false,
      meioPagamento: { in: MEIOS_PAGAMENTO_ANALISADOS },
      data: { gte: inicioJanela, lt: fimJanela },
    },
    include: { category: { select: { nome: true } } },
  });

  type Grupo = {
    chave: string;
    descricaoExemplo: string;
    categoryNome: string;
    meioPagamento: MeioPagamento | null;
    naturezas: Set<NaturezaCusto | null>;
    porMes: Map<string, number>;
    transactionIds: string[];
  };
  const grupos = new Map<string, Grupo>();

  for (const t of transacoes) {
    const chave = normalizarDescricao(t.descricao);
    if (!chave || chave.length < 3) continue;

    const mesKey = paraMesLocal(t.data);
    const atual = grupos.get(chave) ?? {
      chave,
      descricaoExemplo: t.descricao,
      categoryNome: t.category.nome,
      meioPagamento: t.meioPagamento,
      naturezas: new Set<NaturezaCusto | null>(),
      porMes: new Map<string, number>(),
      transactionIds: [],
    };
    atual.porMes.set(mesKey, (atual.porMes.get(mesKey) ?? 0) + Number(t.valor));
    atual.naturezas.add(t.natureza);
    atual.transactionIds.push(t.id);
    grupos.set(chave, atual);
  }

  return [...grupos.values()]
    .map((g) => {
      const valoresPorMes = [...g.porMes.values()];
      return {
        chave: g.chave,
        descricaoExemplo: g.descricaoExemplo,
        categoryNome: g.categoryNome,
        meioPagamento: g.meioPagamento,
        naturezaAtual: resumirNaturezaAtual(g.naturezas),
        sugestao: sugerirNatureza(valoresPorMes),
        mesesComGasto: valoresPorMes.length,
        valoresPorMes,
        transactionIds: g.transactionIds,
      };
    })
    .filter((s) => s.mesesComGasto >= MIN_MESES_COM_GASTO)
    .sort((a, b) => {
      if (a.sugestao !== b.sugestao) return a.sugestao === "FIXO" ? -1 : 1;
      return b.mesesComGasto - a.mesesComGasto;
    });
}
