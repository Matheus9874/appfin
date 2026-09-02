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
  /**
   * CPF/CNPJ (só dígitos) da contraparte da transação, quando o Pluggy
   * fornece (merchant enriquecido ou paymentData) — null quando não
   * disponível (compra sem enriquecimento, lançamento manual etc.). É um
   * identificador mais estável que o texto da descrição: o mesmo
   * estabelecimento pode cobrar em formatos de texto diferentes (débito
   * direto vs. boleto do mesmo banco) mas o CNPJ do recebedor não muda.
   */
  documento: string | null;
};

export type FaixaConta = {
  id: string;
  valorMin: number;
  valorMax: number;
  /**
   * Padrões de texto já confirmados manualmente pra essa conta — vazio se
   * a conta nunca foi confirmada. Serve de fallback pra quando a
   * transação não tem `documento` disponível.
   */
  textosAprendidos: string[];
  /**
   * CPF/CNPJ já confirmados manualmente pra essa conta — critério
   * preferencial sobre o texto quando disponível, por ser estável mesmo
   * que o formato da descrição mude entre lançamentos do mesmo
   * estabelecimento.
   */
  documentosAprendidos: string[];
};

export type ResultadoConta =
  | { tipo: "AUTOMATICO"; transactionId: string }
  | { tipo: "AMBIGUO"; candidatos: CandidatoTransacao[] }
  | { tipo: "NENHUM" };

function bateValor(t: CandidatoTransacao, conta: FaixaConta): boolean {
  return t.valor >= conta.valorMin && t.valor <= conta.valorMax;
}

export function temIdentidadeAprendida(conta: FaixaConta): boolean {
  return conta.textosAprendidos.length > 0 || conta.documentosAprendidos.length > 0;
}

/**
 * "Mesmo destinatário": documento (CPF/CNPJ) em comum tem prioridade sobre
 * o texto — é o sinal mais confiável, já que não muda entre formatos de
 * descrição diferentes do mesmo estabelecimento. Cai pro texto quando a
 * transação não tem documento (comum em compras sem enriquecimento do
 * Pluggy ou lançamentos manuais).
 */
export function bateIdentidade(t: CandidatoTransacao, conta: FaixaConta): boolean {
  if (t.documento !== null && conta.documentosAprendidos.includes(t.documento)) {
    return true;
  }
  return conta.textosAprendidos.includes(t.descricaoNormalizada);
}

/**
 * Casa contas fixas com transações reais, olhando todas as contas e
 * transações do mês de uma vez (não uma conta isolada por vez) — pra
 * decidir corretamente o que fazer quando duas contas têm faixas
 * sobrepostas ou o mesmo padrão aprendido.
 *
 * Dois critérios por conta: faixa de valor (sempre) e identidade do
 * destinatário aprendida (só depois de uma primeira confirmação manual —
 * ver app/(app)/planejamento/actions.ts), que bate por documento (CPF/CNPJ)
 * OU por texto da descrição. A resolução acontece em fases:
 *
 * Fase 0 — match forte (valor E identidade): só entra aqui quem já
 * aprendeu algum documento ou texto. Se uma conta tem exatamente uma
 * transação que bate nos dois critérios (e nenhuma outra conta disputa a
 * mesma transação), resolve automático sem pedir confirmação — uma vez
 * ensinada a identidade do destinatário, não precisa confirmar de novo,
 * mesmo que o formato de texto mude (o documento continua batendo).
 *
 * Fase 1 — só valor, mesma regra de antes (única candidata sem disputa,
 * em rodadas — uma resolução pode liberar outra na seguinte): só se aplica
 * a contas que AINDA não aprenderam nenhuma identidade. Uma conta que já
 * aprendeu algo mas não teve match forte na Fase 0 não volta a resolver
 * sozinha só por valor — precisa de confirmação manual mesmo que o valor
 * seja único (é o "vice-versa" do pedido original: bater só um dos dois
 * critérios não basta mais uma vez que existe uma identidade aprendida).
 *
 * O que sobra sem solução única vira AMBIGUO — juntando candidatas por
 * valor OU por identidade (cobre o caso de o valor ter saído da faixa mas
 * a identidade ainda bater, e vice-versa) — ou NENHUM. Nunca adivinha.
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

  // Fase 0: match forte (valor + identidade), só pras contas com algo aprendido.
  const fortesPorTransacao = new Map<string, string[]>();
  for (const contaId of pendentes) {
    const conta = contaPorId(contaId);
    if (!temIdentidadeAprendida(conta)) continue;
    for (const t of candidatasValor(conta).filter((t) => bateIdentidade(t, conta))) {
      const lista = fortesPorTransacao.get(t.id) ?? [];
      lista.push(contaId);
      fortesPorTransacao.set(t.id, lista);
    }
  }
  for (const [txId, contaIds] of fortesPorTransacao) {
    if (contaIds.length !== 1) continue; // duas contas com a mesma identidade disputando — não adivinha.
    const contaId = contaIds[0];
    const conta = contaPorId(contaId);
    const fortesDaConta = candidatasValor(conta).filter((t) => bateIdentidade(t, conta));
    if (fortesDaConta.length !== 1) continue; // a própria conta tem mais de 1 match forte — ambíguo.
    resolvidas.set(contaId, txId);
    pendentes.delete(contaId);
    disponiveis.delete(txId);
  }

  // Fase 1: só valor, mesma regra de antes — só pras contas sem identidade aprendida.
  let mudou = true;
  while (mudou) {
    mudou = false;
    const contasPorCandidataUnica = new Map<string, string[]>();
    for (const contaId of pendentes) {
      const conta = contaPorId(contaId);
      if (temIdentidadeAprendida(conta)) continue;
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
      (t) => bateValor(t, conta) || bateIdentidade(t, conta),
    );
    resultado.set(
      conta.id,
      candidatas.length === 0 ? { tipo: "NENHUM" } : { tipo: "AMBIGUO", candidatos: candidatas },
    );
  }
  return resultado;
}
