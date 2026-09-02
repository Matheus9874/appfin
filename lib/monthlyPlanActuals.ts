import { prisma } from "./prisma";
import type { NaturezaCusto } from "@/app/generated/prisma/enums";

/**
 * Nomes de categoria que o Pluggy usa pra movimentação de investimento (ver
 * lib/pluggyTransferDetection.ts) — usados aqui pra reconhecer, entre as
 * transferências internas do mês, quais são aporte em investimento (não dá
 * pra saber só pelo campo transferenciaInterna, que também cobre pagamento
 * de fatura de cartão).
 */
export const CATEGORIAS_INVESTIMENTO = [
  "Investimentos",
  "Renda fixa",
  "Aplicações",
  "Fundos",
];

export type DespesaParaFatia = {
  valor: number;
  transferenciaInterna: boolean;
  categoryNome: string;
  natureza: NaturezaCusto | null;
};

export type RealizadoDespesas = {
  essencial: number;
  pessoal: number;
  investimentoTransacoes: number;
};

/**
 * Separa despesas do mês em Essencial/Pessoal (via Transaction.natureza,
 * marcada em Planejamento > Contas Fixas — ver lib/fixedBillService.ts) e
 * identifica aportes em investimento vindos de transferências internas —
 * função pura, sem acesso a banco, pra ser testável isoladamente.
 */
export function classificarDespesasPorFatia(
  despesas: DespesaParaFatia[],
): RealizadoDespesas {
  let essencial = 0;
  let pessoal = 0;
  let investimentoTransacoes = 0;

  for (const d of despesas) {
    if (d.transferenciaInterna) {
      if (CATEGORIAS_INVESTIMENTO.includes(d.categoryNome)) {
        investimentoTransacoes += d.valor;
      }
      continue;
    }
    if (d.natureza === "FIXO") {
      essencial += d.valor;
    } else {
      pessoal += d.valor;
    }
  }

  return { essencial, pessoal, investimentoTransacoes };
}

export type RealizadoDoMes = {
  essencial: number;
  pessoal: number;
  investimento: number;
  reserva: number;
};

/**
 * Realizado do mês por fatia (Essencial/Pessoal/Investimento/Reserva) — ver
 * a regra completa no plano de Planejamento mensal. Reserva soma qualquer
 * Investment com tipo RESERVA_EMERGENCIA OU marcado manualmente como
 * contaComoReserva (ex.: um Tesouro Direto de alta liquidez que também
 * serve de reserva) — sem nenhum dos dois, fica em zero (o Pluggy não manda
 * essa classificação, é sempre manual).
 */
export async function calcularRealizadoDoMes(
  userId: string,
  mes: number,
  ano: number,
): Promise<RealizadoDoMes> {
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1);

  const [transacoes, investimentosDoMes] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, tipo: "DESPESA", data: { gte: inicio, lt: fim } },
      select: {
        valor: true,
        transferenciaInterna: true,
        natureza: true,
        category: { select: { nome: true } },
      },
    }),
    prisma.investment.findMany({
      where: { userId, data: { gte: inicio, lt: fim } },
      select: { valor: true, tipo: true, origem: true, contaComoReserva: true },
    }),
  ]);

  const despesas: DespesaParaFatia[] = transacoes.map((t) => ({
    valor: Number(t.valor),
    transferenciaInterna: t.transferenciaInterna,
    categoryNome: t.category.nome,
    natureza: t.natureza,
  }));
  const { essencial, pessoal, investimentoTransacoes } =
    classificarDespesasPorFatia(despesas);

  let reserva = 0;
  let investimentoManual = 0;
  for (const inv of investimentosDoMes) {
    if (inv.tipo === "RESERVA_EMERGENCIA" || inv.contaComoReserva) {
      reserva += Number(inv.valor);
    } else if (inv.origem === "MANUAL") {
      investimentoManual += Number(inv.valor);
    }
  }

  return {
    essencial,
    pessoal,
    investimento: investimentoTransacoes + investimentoManual,
    reserva,
  };
}
