import type {
  InvestmentType,
  OrigemTransacao,
} from "@/app/generated/prisma/enums";

type InvestmentIdentity = {
  tipo: InvestmentType;
  instituicao: string;
  nome: string | null;
  origem?: OrigemTransacao;
  pluggyInvestmentId?: string | null;
};

/**
 * Para lançamentos manuais, a chave é tipo+instituição+nome — várias edições
 * do mesmo investimento (mesmo "nome") devem colapsar na mais recente.
 * Para investimentos do Pluggy, usa o `pluggyInvestmentId` (sempre único por
 * posição) em vez disso: duas posições distintas podem ter exatamente o
 * mesmo tipo+instituição+nome (ex.: dois CDBs do mesmo banco sem apelido) e
 * não devem ser colapsadas numa só.
 */
export function investmentKey(inv: InvestmentIdentity) {
  if (inv.origem === "PLUGGY" && inv.pluggyInvestmentId) {
    return `pluggy:${inv.pluggyInvestmentId}`;
  }
  return `${inv.tipo}|${inv.instituicao}|${inv.nome ?? ""}`;
}

/**
 * Reduz uma lista de lançamentos (ordenada por data desc) a um lançamento
 * mais recente por investimento (ver `investmentKey`).
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
