import {
  Building2,
  LandPlot,
  LineChart,
  type LucideIcon,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { InvestmentType } from "@/app/generated/prisma/enums";

export const INVESTMENT_TYPES: InvestmentType[] = [
  "POUPANCA",
  "TESOURO_DIRETO",
  "CDB",
  "ACOES",
  "FUNDOS",
  "RESERVA_EMERGENCIA",
  "OUTRO",
];

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  POUPANCA: "Poupança",
  TESOURO_DIRETO: "Tesouro Direto",
  CDB: "CDB",
  ACOES: "Ações",
  FUNDOS: "Fundos",
  RESERVA_EMERGENCIA: "Reserva de Emergência",
  OUTRO: "Outro",
};

export const INVESTMENT_TYPE_DESCRIPTIONS: Record<InvestmentType, string> = {
  POUPANCA:
    "Aplicação tradicional dos bancos, com baixa rentabilidade, mas liquidez imediata e garantia do FGC.",
  TESOURO_DIRETO:
    "Títulos públicos do governo federal — considerados os investimentos mais seguros do país.",
  CDB: "Certificado de Depósito Bancário: um empréstimo ao banco, com garantia do FGC até R$ 250 mil.",
  ACOES:
    "Participação em empresas negociadas na bolsa. Maior potencial de retorno, mas com mais risco.",
  FUNDOS:
    "Fundos de investimento: recursos de vários investidores geridos por profissionais, com níveis de risco variados.",
  RESERVA_EMERGENCIA:
    "Dinheiro guardado para imprevistos, geralmente em aplicações de alta liquidez (fácil de resgatar).",
  OUTRO: "Qualquer outro tipo de investimento que não se encaixa nas categorias acima.",
};

export const INVESTMENT_TYPE_ICONS: Record<InvestmentType, LucideIcon> = {
  POUPANCA: PiggyBank,
  TESOURO_DIRETO: LandPlot,
  CDB: Building2,
  ACOES: TrendingUp,
  FUNDOS: LineChart,
  RESERVA_EMERGENCIA: ShieldCheck,
  OUTRO: Wallet,
};

export const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  POUPANCA: "var(--color-chart-1)",
  TESOURO_DIRETO: "var(--color-chart-2)",
  CDB: "var(--color-chart-3)",
  ACOES: "var(--color-chart-4)",
  FUNDOS: "var(--color-chart-5)",
  RESERVA_EMERGENCIA: "var(--color-chart-6)",
  OUTRO: "var(--color-chart-7)",
};
