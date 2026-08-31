import { prisma } from "./prisma";

export type MonthlyTotal = {
  data: Date;
  label: string;
  receitas: number;
  despesas: number;
};

function monthKey(data: Date) {
  return `${data.getFullYear()}-${data.getMonth()}`;
}

function monthLabel(data: Date) {
  const mes = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(data)
    .replace(".", "");
  const ano = String(data.getFullYear()).slice(-2);
  return `${mes}/${ano}`;
}

/**
 * Totais de receitas/despesas por mês, dos últimos `maxMeses` meses (ou menos,
 * se o histórico de transações for mais curto), sempre incluindo o mês atual.
 */
export async function getMonthlyTotals(
  maxMeses = 6,
): Promise<MonthlyTotal[]> {
  const now = new Date();
  const inicioDoMes = new Date(now.getFullYear(), now.getMonth(), 1);

  const primeiraTransacao = await prisma.transaction.aggregate({
    _min: { data: true },
  });
  const primeiraData = primeiraTransacao._min.data;

  if (!primeiraData) {
    return [];
  }

  const mesesAtras = new Date(
    now.getFullYear(),
    now.getMonth() - (maxMeses - 1),
    1,
  );
  const inicioDoPrimeiroMes = new Date(
    primeiraData.getFullYear(),
    primeiraData.getMonth(),
    1,
  );
  const inicioDaJanela =
    inicioDoPrimeiroMes > mesesAtras ? inicioDoPrimeiroMes : mesesAtras;

  const meses: Date[] = [];
  for (
    const d = new Date(inicioDaJanela);
    d <= inicioDoMes;
    d.setMonth(d.getMonth() + 1)
  ) {
    meses.push(new Date(d));
  }

  const transacoesDaJanela = await prisma.transaction.findMany({
    where: { data: { gte: inicioDaJanela } },
    select: { tipo: true, valor: true, data: true },
  });

  const porMes = new Map<string, { receitas: number; despesas: number }>();
  for (const t of transacoesDaJanela) {
    const key = monthKey(t.data);
    const atual = porMes.get(key) ?? { receitas: 0, despesas: 0 };
    const valor = Number(t.valor);
    if (t.tipo === "receita") atual.receitas += valor;
    else if (t.tipo === "despesa") atual.despesas += valor;
    porMes.set(key, atual);
  }

  return meses.map((m) => {
    const dados = porMes.get(monthKey(m)) ?? { receitas: 0, despesas: 0 };
    return {
      data: m,
      label: monthLabel(m),
      receitas: dados.receitas,
      despesas: dados.despesas,
    };
  });
}
