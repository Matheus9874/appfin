"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyChartPoint = {
  mes: string;
  receitas: number;
  despesas: number;
};

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function MonthlyBarChart({ data }: { data: MonthlyChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          vertical={false}
        />
        <XAxis
          dataKey="mes"
          stroke="var(--color-border)"
          tick={{ fill: "var(--color-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatMoeda(v)}
          width={100}
          stroke="var(--color-border)"
          tick={{ fill: "var(--color-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => formatMoeda(Number(value))}
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            color: "var(--color-foreground)",
          }}
          cursor={{ fill: "var(--color-surface-hover)" }}
        />
        <Legend
          formatter={(value) =>
            value === "receitas" ? "Receitas" : "Despesas"
          }
          wrapperStyle={{ color: "var(--color-muted)", fontSize: 13 }}
        />
        <Bar
          dataKey="receitas"
          fill="var(--color-positive)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="despesas"
          fill="var(--color-negative)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
