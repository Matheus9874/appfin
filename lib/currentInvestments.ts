import type { InvestmentType } from "@/app/generated/prisma/enums";

type InvestmentIdentity = {
  tipo: InvestmentType;
  instituicao: string;
  nome: string | null;
};

export function investmentKey(inv: InvestmentIdentity) {
  return `${inv.tipo}|${inv.instituicao}|${inv.nome ?? ""}`;
}

/**
 * Reduz uma lista de lançamentos (ordenada por data desc) a um lançamento
 * mais recente por investimento (mesma combinação tipo+instituição+nome).
 */
export function getCurrentInvestments<T extends InvestmentIdentity>(
  investimentosOrdenadosPorDataDesc: T[],
): T[] {
  const maisRecentePorInvestimento = new Map<string, T>();
  for (const inv of investimentosOrdenadosPorDataDesc) {
    const chave = investmentKey(inv);
    if (!maisRecentePorInvestimento.has(chave)) {
      maisRecentePorInvestimento.set(chave, inv);
    }
  }
  return Array.from(maisRecentePorInvestimento.values());
}
