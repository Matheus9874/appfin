/**
 * Matches a Pluggy category name (already translated to Portuguese) against
 * the user's existing categories via keyword overlap, so imports reuse
 * categories like "Restaurante" instead of piling up near-duplicates like
 * "Restaurantes, bares e lanchonetes". Deterministic and dependency-free —
 * no embeddings/AI call, just normalized-word overlap plus a small synonym
 * table for the most common cross-wording gaps (e.g. "combustível" vs
 * "gasolina").
 */

const STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "as",
  "os",
  "em",
  "com",
  "para",
  "no",
  "na",
  "seu",
  "sua",
]);

/** Groups of interchangeable terms; matching any member pulls in the whole group. */
const GRUPOS_SINONIMOS: string[][] = [
  ["restaurante", "comida", "alimentacao", "lanchonete", "bar", "delivery", "refeicao"],
  ["supermercado", "mercado", "compras", "alimentacao", "mantimento"],
  ["combustivel", "gasolina", "posto", "gas", "etanol"],
  ["carro", "veiculo", "automovel", "automotivo", "transporte"],
  ["transporte", "taxi", "uber", "onibus", "passagem", "viagem", "carro", "transito"],
  ["vestuario", "roupa", "vestiario", "moda", "vestimenta", "calcado"],
  ["saude", "farmacia", "hospital", "clinica", "dentista", "medico", "otica", "remedio"],
  ["moradia", "aluguel", "casa", "condominio", "residencial", "financiamento", "residencia"],
  ["educacao", "escola", "curso", "universidade", "faculdade", "creche"],
  ["lazer", "cinema", "teatro", "show", "entretenimento", "diversao", "hobby"],
  ["assinatura", "assinaturas", "streaming"],
  ["telefone", "celular", "internet", "telecomunicacao", "wifi"],
  ["investimento", "investimentos", "renda", "aplicacao"],
  ["salario", "renda", "receita", "pagamento"],
  ["seguro", "seguros"],
  ["manutencao", "reparo", "conserto"],
  ["multa", "multas", "infracao"],
  ["presente", "presentes", "gift"],
  ["diverso", "diversos", "outros"],
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function stem(palavra: string): string {
  return palavra.length > 5 ? palavra.slice(0, 5) : palavra;
}

function palavrasSignificativas(texto: string): string[] {
  return normalizar(texto)
    .split(/\s+/)
    .filter((p) => p.length > 2 && !STOPWORDS.has(p));
}

function paraStems(palavras: string[]): Set<string> {
  return new Set(palavras.map(stem));
}

function expandirComSinonimos(stems: Set<string>): Set<string> {
  const expandido = new Set(stems);
  for (const grupo of GRUPOS_SINONIMOS) {
    const stemsDoGrupo = grupo.map(stem);
    if (stemsDoGrupo.some((s) => stems.has(s))) {
      stemsDoGrupo.forEach((s) => expandido.add(s));
    }
  }
  return expandido;
}

export type CategoriaCandidata = { id: string; nome: string };

/**
 * Returns the best-matching existing category for `nomeImportado`, or null
 * if none share enough keyword overlap to be a reasonable match — callers
 * should create a new category with `nomeImportado` in that case.
 */
export function encontrarCategoriaCorrespondente(
  nomeImportado: string,
  categoriasExistentes: CategoriaCandidata[],
): CategoriaCandidata | null {
  const stemsImportado = expandirComSinonimos(
    paraStems(palavrasSignificativas(nomeImportado)),
  );
  if (stemsImportado.size === 0) return null;

  let melhor: CategoriaCandidata | null = null;
  let melhorScore = 0;

  for (const categoria of categoriasExistentes) {
    const stemsCategoria = paraStems(palavrasSignificativas(categoria.nome));
    if (stemsCategoria.size === 0) continue;

    let overlap = 0;
    for (const s of stemsCategoria) {
      if (stemsImportado.has(s)) overlap++;
    }
    if (overlap > melhorScore) {
      melhorScore = overlap;
      melhor = categoria;
    }
  }

  return melhor;
}
