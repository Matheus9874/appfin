import { monthKey, monthLabel } from "./monthlyTotals";

export type FaturaMensal = {
  mesKey: string;
  label: string;
  valor: number;
};

/**
 * Agrupa despesas pagas no cartão de crédito por mês civil, para um histórico
 * simples de "fatura por mês". Não é a fatura exata do banco (não temos a
 * data de fechamento real do ciclo via Pluggy), só uma aproximação por mês
 * calendário — suficiente para dar uma ideia de gasto recorrente no cartão.
 */
export function agruparGastosCartaoPorMes(
  transacoes: { valor: number; data: Date }[],
  meses: Date[],
): FaturaMensal[] {
  const porMes = new Map<string, number>();
  for (const t of transacoes) {
    const key = monthKey(t.data);
    porMes.set(key, (porMes.get(key) ?? 0) + t.valor);
  }
  return meses.map((m) => ({
    mesKey: monthKey(m),
    label: monthLabel(m),
    valor: porMes.get(monthKey(m)) ?? 0,
  }));
}
