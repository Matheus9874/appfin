import {
  Calculator,
  FileText,
  LineChart,
  PieChart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type ReportStatus = "disponivel" | "em-breve";

export type ReportDefinition = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: ReportStatus;
};

export const REPORTS: ReportDefinition[] = [
  {
    slug: "simulador-investimentos",
    title: "Simulador de Investimentos",
    description:
      "Projete o crescimento do seu dinheiro com juros compostos e aportes mensais.",
    icon: TrendingUp,
    status: "disponivel",
  },
  {
    slug: "simulador-compra",
    title: "Simulador de Compra e Financiamento",
    description:
      "Veja o impacto real de uma compra parcelada no seu orçamento antes de assumir o compromisso.",
    icon: Calculator,
    status: "disponivel",
  },
  {
    slug: "gastos-por-categoria",
    title: "Gastos por Categoria",
    description:
      "Veja para onde vai o seu dinheiro, com o ranking das categorias que mais pesam no orçamento.",
    icon: PieChart,
    status: "disponivel",
  },
  {
    slug: "evolucao-saldo",
    title: "Evolução do Saldo",
    description:
      "Acompanhe como o seu saldo total evoluiu mês a mês ao longo do tempo.",
    icon: LineChart,
    status: "em-breve",
  },
  {
    slug: "extrato",
    title: "Extrato de Transações",
    description:
      "Um extrato completo e filtrável de todas as suas transações, pronto para exportar.",
    icon: FileText,
    status: "em-breve",
  },
];

export function getReport(slug: string) {
  return REPORTS.find((r) => r.slug === slug);
}
