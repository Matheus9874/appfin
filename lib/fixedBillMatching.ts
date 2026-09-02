// Todas as 27 UFs brasileiras — genérico pra qualquer usuário, não só de
// um estado específico. Pluggy costuma sufixar a descrição da transação
// com "<cidade> <UF>" pra transações domésticas. Não dá pra adivinhar com
// segurança quantas palavras antes da UF são "cidade" (poderiam ser parte
// do próprio nome do estabelecimento), então só o código da UF em si é
// removido — seguro e genérico pra qualquer estado, ao custo de não
// remover o nome da cidade junto.
const UFS_BRASILEIRAS =
  "ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to";
const SUFIXO_UF_REGEX = new RegExp(`\\s+(${UFS_BRASILEIRAS})\\s*$`);

/**
 * Normaliza a descrição de uma transação pra comparar/aprender padrão de
 * texto (ver FaixaConta.textosAprendidos) — mesma lógica usada antes pra
 * agrupar por comerciante: tira acento, dígito, sufixo de UF (qualquer UF
 * brasileira) e país, e pontuação, deixa em minúsculo.
 */
export function normalizarDescricao(descricao: string): string {
  return descricao
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(SUFIXO_UF_REGEX, "")
    .replace(/\s+(bra|brasil)\s*$/gi, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type CandidatoTransacao = {
  id: string;
  valor: number;
  descricaoNormalizada: string;
};

export type FaixaConta = {
  id: string;
  valorMin: number;
  valorMax: number;
  /**
   * Padrões de texto já confirmados manualmente pra essa conta — vazio se
   * a conta nunca foi confirmada. Um mesmo estabelecimento pode cobrar em
   * mais de um formato de descrição (ex.: débito direto vs. boleto do
   * mesmo banco), então qualquer padrão da lista conta como "bate o
   * texto".
   */
  textosAprendidos: string[];
};

export type ResultadoConta =
  | { tipo: "AUTOMATICO"; transactionId: string }
  | { tipo: "AMBIGUO"; candidatos: CandidatoTransacao[] }
  | { tipo: "NENHUM" };

function bateValor(t: CandidatoTransacao, conta: FaixaConta): boolean {
  return t.valor >= conta.valorMin && t.valor <= conta.valorMax;
}

function bateTexto(t: CandidatoTransacao, conta: FaixaConta): boolean {
  return conta.textosAprendidos.includes(t.descricaoNormalizada);
}

/**
 * Casa contas fixas com transações reais, olhando todas as contas e
 * transações do mês de uma vez (não uma conta isolada por vez) — pra
 * decidir corretamente o que fazer quando duas contas têm faixas
 * sobrepostas ou o mesmo padrão de texto.
 *
 * Dois critérios por conta: faixa de valor (sempre) e padrão de texto
 * aprendido (só depois de uma primeira confirmação manual — ver
 * app/(app)/planejamento/actions.ts). A resolução acontece em fases:
 *
 * Fase 0 — match forte (valor E texto): só entra aqui quem já aprendeu um
 * padrão. Se uma conta tem exatamente uma transação que bate nos dois
 * critérios (e nenhuma outra conta disputa a mesma transação), resolve
 * automático sem pedir confirmação — é o comportamento novo pedido: uma
 * vez ensinado o padrão, não precisa confirmar de novo.
 *
 * Fase 1 — só valor, mesma regra de antes (única candidata sem disputa,
 * em rodadas — uma resolução pode liberar outra na seguinte): só se aplica
 * a contas que AINDA não aprenderam nenhum padrão de texto. Uma conta que
 * já tem algum padrão em `textosAprendidos` mas não teve match forte na
 * Fase 0 não volta a resolver sozinha só por valor — precisa de
 * confirmação manual mesmo que o valor seja único (é o "vice-versa" do
 * pedido: bater só um dos dois critérios não basta mais uma vez que existe
 * pelo menos um padrão aprendido).
 *
 * O que sobra sem solução única vira AMBIGUO — juntando candidatas por
 * valor OU por texto (cobre o caso de o valor ter saído da faixa mas o
 * texto ainda bater, e vice-versa) — ou NENHUM. Nunca adivinha.
 */
export function buscarCorrespondencias(
  contas: FaixaConta[],
  transacoes: CandidatoTransacao[],
): Map<string, ResultadoConta> {
  const disponiveis = new Map(transacoes.map((t) => [t.id, t]));
  const resolvidas = new Map<string, string>();
  const pendentes = new Set(contas.map((c) => c.id));

  function contaPorId(id: string): FaixaConta {
    return contas.find((c) => c.id === id)!;
  }
  function candidatasValor(conta: FaixaConta): CandidatoTransacao[] {
    return [...disponiveis.values()].filter((t) => bateValor(t, conta));
  }

  // Fase 0: match forte (valor + texto), só pras contas com padrão aprendido.
  const fortesPorTransacao = new Map<string, string[]>();
  for (const contaId of pendentes) {
    const conta = contaPorId(contaId);
    if (conta.textosAprendidos.length === 0) continue;
    for (const t of candidatasValor(conta).filter((t) => bateTexto(t, conta))) {
      const lista = fortesPorTransacao.get(t.id) ?? [];
      lista.push(contaId);
      fortesPorTransacao.set(t.id, lista);
    }
  }
  for (const [txId, contaIds] of fortesPorTransacao) {
    if (contaIds.length !== 1) continue; // duas contas com o mesmo padrão disputando — não adivinha.
    const contaId = contaIds[0];
    const conta = contaPorId(contaId);
    const fortesDaConta = candidatasValor(conta).filter((t) => bateTexto(t, conta));
    if (fortesDaConta.length !== 1) continue; // a própria conta tem mais de 1 match forte — ambíguo.
    resolvidas.set(contaId, txId);
    pendentes.delete(contaId);
    disponiveis.delete(txId);
  }

  // Fase 1: só valor, mesma regra de antes — só pras contas sem padrão aprendido.
  let mudou = true;
  while (mudou) {
    mudou = false;
    const contasPorCandidataUnica = new Map<string, string[]>();
    for (const contaId of pendentes) {
      const conta = contaPorId(contaId);
      if (conta.textosAprendidos.length > 0) continue;
      const candidatas = candidatasValor(conta);
      if (candidatas.length === 1) {
        const txId = candidatas[0].id;
        const lista = contasPorCandidataUnica.get(txId) ?? [];
        lista.push(contaId);
        contasPorCandidataUnica.set(txId, lista);
      }
    }
    for (const [txId, contaIds] of contasPorCandidataUnica) {
      if (contaIds.length !== 1) continue;
      const contaId = contaIds[0];
      resolvidas.set(contaId, txId);
      pendentes.delete(contaId);
      disponiveis.delete(txId);
      mudou = true;
    }
  }

  const resultado = new Map<string, ResultadoConta>();
  for (const conta of contas) {
    const transactionId = resolvidas.get(conta.id);
    if (transactionId) {
      resultado.set(conta.id, { tipo: "AUTOMATICO", transactionId });
      continue;
    }
    const candidatas = [...disponiveis.values()].filter(
      (t) => bateValor(t, conta) || bateTexto(t, conta),
    );
    resultado.set(
      conta.id,
      candidatas.length === 0 ? { tipo: "NENHUM" } : { tipo: "AMBIGUO", candidatos: candidatas },
    );
  }
  return resultado;
}
