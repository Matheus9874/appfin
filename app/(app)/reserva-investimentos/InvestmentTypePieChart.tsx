"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  INVESTMENT_TYPE_COLORS,
  INVESTMENT_TYPE_LABELS,
} from "@/lib/investmentTypes";
import type { InvestmentType } from "@/app/generated/prisma/enums";

export type InvestmentTypeSlice = {
  tipo: InvestmentType;
  valor: number;
};

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function InvestmentTypePieChart({
  data,
}: {
  data: InvestmentTypeSlice[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valor"
          nameKey="tipo"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          strokeWidth={2}
          stroke="var(--color-surface)"
        >
          {data.map((entry) => (
            <Cell key={entry.tipo} fill={INVESTMENT_TYPE_COLORS[entry.tipo]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, _name, item) => [
            formatMoeda(Number(value)),
            INVESTMENT_TYPE_LABELS[item.payload.tipo as InvestmentType],
          ]}
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            color: "var(--color-foreground)",
          }}
        />
        <Legend
          formatter={(value) =>
            INVESTMENT_TYPE_LABELS[value as InvestmentType]
          }
          wrapperStyle={{ color: "var(--color-muted)", fontSize: 13 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
