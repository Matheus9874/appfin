"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type InvestmentChartPoint = {
  ano: number;
  totalAportado: number;
  totalAcumulado: number;
};

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export default function InvestmentChart({
  data,
}: {
  data: InvestmentChartPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          vertical={false}
        />
        <XAxis
          dataKey="ano"
          tickFormatter={(v: number) => `Ano ${v}`}
          stroke="var(--color-border)"
          tick={{ fill: "var(--color-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatMoeda(v)}
          width={90}
          stroke="var(--color-border)"
          tick={{ fill: "var(--color-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          labelFormatter={(v) => `Ano ${v}`}
          formatter={(value) => formatMoeda(Number(value))}
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            color: "var(--color-foreground)",
          }}
          cursor={{ stroke: "var(--color-border)" }}
        />
        <Legend
          formatter={(value) =>
            value === "totalAcumulado" ? "Total acumulado" : "Total investido"
          }
          wrapperStyle={{ color: "var(--color-muted)", fontSize: 13 }}
        />
        <Line
          type="monotone"
          dataKey="totalAportado"
          stroke="var(--color-muted)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="totalAcumulado"
          stroke="var(--color-accent)"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
