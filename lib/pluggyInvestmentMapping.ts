import type { InvestmentType } from "@/app/generated/prisma/enums";

/**
 * Maps a Pluggy investment's `type`/`subtype` to our InvestmentType enum.
 * Only maps when there's a reasonably clear correspondence — everything
 * else (SECURITY, COE, and FIXED_INCOME subtypes other than TREASURY/CDB)
 * falls back to OUTRO rather than guessing.
 */
export function resolveInvestmentType(investimento: {
  type: string;
  subtype?: string | null;
}): InvestmentType {
  switch (investimento.type) {
    case "FIXED_INCOME":
      if (investimento.subtype === "TREASURY") return "TESOURO_DIRETO";
      if (investimento.subtype === "CDB") return "CDB";
      return "OUTRO";
    case "EQUITY":
      return "ACOES";
    case "MUTUAL_FUND":
    case "ETF":
      return "FUNDOS";
    default:
      return "OUTRO";
  }
}
