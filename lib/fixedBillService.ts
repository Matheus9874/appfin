import { prisma } from "./prisma";
import {
  bateIdentidade,
  buscarCorrespondencias,
  normalizarDescricao,
  temIdentidadeAprendida,
} from "./fixedBillMatching";
import type { FixedBillMatchStatus, NaturezaCusto } from "@/app/generated/prisma/enums";

export type TransacaoResumo = {
  id: string;
  descricao: string;
  valor: number;
  dataFormatada: string;
};

const DATA_FORMATTER = new Intl.DateTimeFormat("pt-BR");

export type EstadoContaFixa =
  | { tipo: "RESOLVIDA"; status: FixedBillMatchStatus; transacao: TransacaoResumo | null }
  | { tipo: "AMBIGUO"; candidatos: TransacaoResumo[] }
  | { tipo: "NENHUM" };

export type ContaFixaComEstado = {
  id: string;
  nome: string;
  valorEsperado: number;
  valorMin: number;
  valorMax: number;
  categoryId: string | null;
  categoryNome: string | null;
  estado: EstadoContaFixa;
};

/**
 * Roda lib/fixedBillMatching.ts pras contas ainda sem match no
 * (mes, ano) dado, persiste o que resolver automaticamente (grava
 * FixedBillMatch + marca a transação como natureza FIXO), e devolve o
 * estado de exibição de TODAS as contas do usuário — resolvidas (com os
 * dados da transação), ambíguas (candidatas ao vivo) ou sem nenhuma
 * correspondência. Idempotente: chamar de novo não refaz o que já foi
 * resolvido.
 */
export async function buscarEPersistirCorrespondencias(
  userId: string,
  mes: number,
  ano: number,
): Promise<ContaFixaComEstado[]> {
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1);

  const [contas, matchesExistentes, transacoesDoMes] = await Promise.all([
    prisma.fixedBill.findMany({
      where: { userId },
      include: { category: { select: { nome: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.fixedBillMatch.findMany({ where: { userId, mes, ano } }),
    prisma.transaction.findMany({
      where: {
        userId,
        tipo: "DESPESA",
        transferenciaInterna: false,
        data: { gte: inicio, lt: fim },
      },
      select: { id: true, descricao: true, valor: true, data: true, contraparteDocumento: true },
    }),
  ]);

  const matchPorConta = new Map(matchesExistentes.map((m) => [m.fixedBillId, m]));
  const contasParaResolver = contas.filter((c) => !matchPorConta.has(c.id));
  const transacaoPorId = new Map(transacoesDoMes.map((t) => [t.id, t]));
  const transacoesJaReivindicadas = new Set(
    matchesExistentes.filter((m) => m.transactionId).map((m) => m.transactionId),
  );
  const poolDisponivel = transacoesDoMes.filter((t) => !transacoesJaReivindicadas.has(t.id));

  const resultado = buscarCorrespondencias(
    contasParaResolver.map((c) => ({
      id: c.id,
      valorMin: Number(c.valorMin),
      valorMax: Number(c.valorMax),
      textosAprendidos: c.textosAprendidos,
      documentosAprendidos: c.documentosAprendidos,
    })),
    poolDisponivel.map((t) => ({
      id: t.id,
      valor: Number(t.valor),
      descricaoNormalizada: normalizarDescricao(t.descricao),
      documento: t.contraparteDocumento,
    })),
  );

  for (const conta of contasParaResolver) {
    const r = resultado.get(conta.id);
    if (r?.tipo === "AUTOMATICO") {
      await prisma.fixedBillMatch.create({
        data: {
          fixedBillId: conta.id,
          userId,
          mes,
          ano,
          transactionId: r.transactionId,
          status: "AUTOMATICO",
        },
      });
      await prisma.transaction.update({
        where: { id: r.transactionId },
        data: { natureza: "FIXO" as NaturezaCusto },
      });
      matchPorConta.set(conta.id, {
        id: "",
        fixedBillId: conta.id,
        userId,
        mes,
        ano,
        transactionId: r.transactionId,
        status: "AUTOMATICO",
      });
    }
  }

  return contas.map((c) => {
    const match = matchPorConta.get(c.id);
    let estado: EstadoContaFixa;
    if (match) {
      const transacao = match.transactionId
        ? (transacaoPorId.get(match.transactionId) ?? null)
        : null;
      estado = {
        tipo: "RESOLVIDA",
        status: match.status,
        transacao: transacao
          ? {
              id: transacao.id,
              descricao: transacao.descricao,
              valor: Number(transacao.valor),
              dataFormatada: DATA_FORMATTER.format(transacao.data),
            }
          : null,
      };
    } else {
      const r = resultado.get(c.id);
      estado =
        r?.tipo === "AMBIGUO"
          ? {
              tipo: "AMBIGUO",
              candidatos: r.candidatos.map((cand) => {
                const t = transacaoPorId.get(cand.id)!;
                return {
                  id: t.id,
                  descricao: t.descricao,
                  valor: Number(t.valor),
                  dataFormatada: DATA_FORMATTER.format(t.data),
                };
              }),
            }
          : { tipo: "NENHUM" };
    }

    return {
      id: c.id,
      nome: c.nome,
      valorEsperado: Number(c.valorEsperado),
      valorMin: Number(c.valorMin),
      valorMax: Number(c.valorMax),
      categoryId: c.categoryId,
      categoryNome: c.category?.nome ?? null,
      estado,
    };
  });
}

/**
 * Vincula automaticamente, nos últimos 3 meses, qualquer transação que já
 * bate nos dois critérios aprendidos da conta (valor na faixa E identidade
 * do destinatário — documento ou texto — já confirmada) mas cujo mês ainda
 * não tem um FixedBillMatch — pra não deixar um mês passado batendo nos
 * dois critérios esperando um clique manual. Só faz algo se a conta já
 * tiver algo aprendido (sem nenhuma identidade aprendida, não há o que
 * reconciliar aqui). Chamado ao criar/confirmar manualmente uma conta
 * fixa, ao abrir o histórico dela, e sempre que novas transações entram
 * (sync do Pluggy ou lançamento manual — ver reconciliarContasFixas).
 */
export async function persistirHistoricoAutomatico(
  userId: string,
  fixedBillId: string,
): Promise<void> {
  const bill = await prisma.fixedBill.findFirst({ where: { id: fixedBillId, userId } });
  const contaMatching = bill
    ? {
        id: bill.id,
        valorMin: Number(bill.valorMin),
        valorMax: Number(bill.valorMax),
        textosAprendidos: bill.textosAprendidos,
        documentosAprendidos: bill.documentosAprendidos,
      }
    : null;
  if (!bill || !contaMatching || !temIdentidadeAprendida(contaMatching)) return;

  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const [transacoes, matchesDaConta, matchesClaimedGeral] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        tipo: "DESPESA",
        transferenciaInterna: false,
        data: { gte: inicio, lt: fim },
      },
      select: { id: true, descricao: true, valor: true, data: true, contraparteDocumento: true },
    }),
    prisma.fixedBillMatch.findMany({ where: { fixedBillId }, select: { mes: true, ano: true } }),
    prisma.fixedBillMatch.findMany({
      where: { userId, transactionId: { not: null } },
      select: { transactionId: true },
    }),
  ]);

  const mesesResolvidos = new Set(matchesDaConta.map((m) => `${m.mes}-${m.ano}`));
  const claimedIds = new Set(matchesClaimedGeral.map((m) => m.transactionId));

  for (const t of transacoes) {
    if (claimedIds.has(t.id)) continue;
    const candidato = {
      id: t.id,
      valor: Number(t.valor),
      descricaoNormalizada: normalizarDescricao(t.descricao),
      documento: t.contraparteDocumento,
    };
    const valorNum = candidato.valor;
    const bateValor = valorNum >= contaMatching.valorMin && valorNum <= contaMatching.valorMax;
    if (!bateValor || !bateIdentidade(candidato, contaMatching)) continue;

    const mes = t.data.getMonth() + 1;
    const ano = t.data.getFullYear();
    if (mesesResolvidos.has(`${mes}-${ano}`)) continue;

    await prisma.fixedBillMatch.create({
      data: { fixedBillId, userId, mes, ano, transactionId: t.id, status: "AUTOMATICO" },
    });
    await prisma.transaction.update({
      where: { id: t.id },
      data: { natureza: "FIXO" as NaturezaCusto },
    });
    mesesResolvidos.add(`${mes}-${ano}`);
    claimedIds.add(t.id);
  }
}

/**
 * Reconcilia Contas Fixas do usuário inteiro: resolve o mês atual
 * (cobre contas ainda sem nenhum padrão aprendido, via correspondência só
 * por valor) e, pra cada conta já com padrão aprendido, vincula qualquer
 * transação dos últimos 3 meses que já bate nos dois critérios. Chamado
 * sempre que novas transações entram — sync do Pluggy ou lançamento
 * manual — pra não depender do usuário abrir a tela de Contas Fixas ou o
 * histórico de uma conta pra isso acontecer.
 */
export async function reconciliarContasFixas(userId: string): Promise<void> {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  await buscarEPersistirCorrespondencias(userId, mes, ano);

  const bills = await prisma.fixedBill.findMany({ where: { userId }, select: { id: true } });
  for (const bill of bills) {
    await persistirHistoricoAutomatico(userId, bill.id);
  }
}
