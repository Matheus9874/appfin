"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { revalidateFinancialPaths } from "@/lib/revalidateFinancialPaths";
import {
  buscarEPersistirCorrespondencias,
  persistirHistoricoAutomatico,
} from "@/lib/fixedBillService";
import { bateIdentidade, normalizarDescricao } from "@/lib/fixedBillMatching";
import {
  parseNonNegativeNumber,
  parsePositiveNumber,
  requireNonEmpty,
} from "@/lib/validation";

const TOLERANCIA_SOMA_PERCENTUAL = 0.5;

function mesAnoAtual() {
  const agora = new Date();
  return { mes: agora.getMonth() + 1, ano: agora.getFullYear() };
}

async function validarCategoriaOpcional(categoryId: string | null, userId: string) {
  if (!categoryId) return;
  const categoria = await prisma.category.findFirst({
    where: { id: categoryId, userId, tipo: "DESPESA" },
  });
  if (!categoria) {
    throw new Error("Categoria inválida.");
  }
}

/**
 * Transações dos últimos 3 meses (mês atual + 2 anteriores) dentro da
 * faixa de valor, pra tela de criação mostrar "essa é a conta?" antes de
 * salvar — dá pra achar a conta mesmo se a cobrança desse mês ainda não
 * chegou ou se o usuário está cadastrando com base num mês anterior.
 * Exclui transações já vinculadas a alguma outra conta fixa (em qualquer
 * mês — mesmo "pool" que o algoritmo de correspondência usa).
 */
export async function buscarTransacoesCandidatas(valorMin: number, valorMax: number) {
  if (!Number.isFinite(valorMin) || !Number.isFinite(valorMax) || valorMin > valorMax) {
    return [];
  }

  const userId = await getCurrentUserId();
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const [transacoes, matchesExistentes] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        tipo: "DESPESA",
        transferenciaInterna: false,
        data: { gte: inicio, lt: fim },
        valor: { gte: valorMin, lte: valorMax },
      },
      select: { id: true, descricao: true, valor: true, data: true },
      orderBy: { data: "desc" },
    }),
    prisma.fixedBillMatch.findMany({
      where: { userId, transactionId: { not: null } },
      select: { transactionId: true },
    }),
  ]);

  const reivindicadas = new Set(matchesExistentes.map((m) => m.transactionId));
  const dataFormatter = new Intl.DateTimeFormat("pt-BR");

  return transacoes
    .filter((t) => !reivindicadas.has(t.id))
    .map((t) => ({
      id: t.id,
      descricao: t.descricao,
      valor: Number(t.valor),
      dataFormatada: dataFormatter.format(t.data),
    }));
}

/**
 * Cria a conta fixa e, se `transactionIds` vier preenchido (o usuário
 * escolheu uma ou mais candidatas na tela antes de salvar — busca cobre os
 * últimos 3 meses), já vincula cada uma no mês da própria transação e
 * marca a transação como natureza FIXO. Aprende tanto o documento
 * (CPF/CNPJ da contraparte, quando disponível — critério preferencial,
 * estável entre formatos de descrição diferentes do mesmo estabelecimento)
 * quanto o texto normalizado (fallback) de cada uma. Aceita mais de uma
 * transação de propósito: um mesmo estabelecimento pode cobrar em mais de
 * um formato sem um documento em comum identificável (ex.: lançamento
 * manual) — escolher só uma aprenderia só um padrão, deixando a outra
 * variante sem reconhecer depois. Sem nenhuma candidata escolhida, salva
 * só a conta — fica pronta pra achar sozinha nos meses seguintes.
 */
export async function criarContaFixa(formData: FormData) {
  const nome = requireNonEmpty(String(formData.get("nome") ?? ""), "Nome");
  const valorEsperado = parsePositiveNumber(
    String(formData.get("valorEsperado") ?? ""),
    "Valor esperado",
  );
  const valorMin = parsePositiveNumber(
    String(formData.get("valorMin") ?? ""),
    "Valor mínimo",
  );
  const valorMax = parsePositiveNumber(
    String(formData.get("valorMax") ?? ""),
    "Valor máximo",
  );
  if (valorMin > valorMax) {
    throw new Error("O valor mínimo não pode ser maior que o máximo.");
  }
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const transactionIds = [...new Set(formData.getAll("transactionIds").map(String))].filter(
    Boolean,
  );

  const userId = await getCurrentUserId();
  await validarCategoriaOpcional(categoryId, userId);

  let transacoesEscolhidas: {
    id: string;
    descricao: string;
    data: Date;
    contraparteDocumento: string | null;
  }[] = [];
  if (transactionIds.length > 0) {
    transacoesEscolhidas = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId,
        tipo: "DESPESA",
        transferenciaInterna: false,
      },
    });
    if (transacoesEscolhidas.length !== transactionIds.length) {
      throw new Error("Alguma transação selecionada não foi encontrada.");
    }
    const jaReivindicadas = await prisma.fixedBillMatch.findMany({
      where: { transactionId: { in: transactionIds } },
    });
    if (jaReivindicadas.length > 0) {
      throw new Error("Uma das transações selecionadas já está vinculada a outra conta fixa.");
    }
    const mesesVistos = new Set<string>();
    for (const t of transacoesEscolhidas) {
      const chave = `${t.data.getMonth() + 1}-${t.data.getFullYear()}`;
      if (mesesVistos.has(chave)) {
        throw new Error("Selecione no máximo uma transação candidata por mês.");
      }
      mesesVistos.add(chave);
    }
  }

  const textosAprendidos = [
    ...new Set(transacoesEscolhidas.map((t) => normalizarDescricao(t.descricao))),
  ];
  const documentosAprendidos = [
    ...new Set(
      transacoesEscolhidas
        .map((t) => t.contraparteDocumento)
        .filter((d): d is string => d !== null),
    ),
  ];

  const conta = await prisma.fixedBill.create({
    data: {
      userId,
      nome,
      valorEsperado,
      valorMin,
      valorMax,
      categoryId,
      textosAprendidos,
      documentosAprendidos,
    },
  });

  if (transacoesEscolhidas.length > 0) {
    for (const t of transacoesEscolhidas) {
      // Usa o mês/ano da própria transação escolhida (não "agora"): a busca
      // cobre os últimos 3 meses, então o usuário pode escolher uma
      // transação de um mês anterior.
      const mes = t.data.getMonth() + 1;
      const ano = t.data.getFullYear();
      await prisma.fixedBillMatch.create({
        data: { fixedBillId: conta.id, userId, mes, ano, transactionId: t.id, status: "MANUAL" },
      });
      await prisma.transaction.update({
        where: { id: t.id },
        data: { natureza: "FIXO" },
      });
    }
    // Com os padrões de texto recém-aprendidos, outros meses dos últimos 3
    // que já batem nos dois critérios (valor + destinatário) são vinculados
    // de uma vez, em vez de ficar esperando um clique manual depois.
    await persistirHistoricoAutomatico(userId, conta.id);
    revalidateFinancialPaths();
    revalidatePath("/planejamento");
  }

  revalidatePath("/planejamento/contas-fixas");
  revalidatePath("/planejamento/contas-do-mes");
}

export async function atualizarContaFixa(formData: FormData) {
  const id = requireNonEmpty(String(formData.get("id") ?? ""), "Conta fixa");
  const nome = requireNonEmpty(String(formData.get("nome") ?? ""), "Nome");
  const valorEsperado = parsePositiveNumber(
    String(formData.get("valorEsperado") ?? ""),
    "Valor esperado",
  );
  const valorMin = parsePositiveNumber(
    String(formData.get("valorMin") ?? ""),
    "Valor mínimo",
  );
  const valorMax = parsePositiveNumber(
    String(formData.get("valorMax") ?? ""),
    "Valor máximo",
  );
  if (valorMin > valorMax) {
    throw new Error("O valor mínimo não pode ser maior que o máximo.");
  }
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;

  const userId = await getCurrentUserId();
  await validarCategoriaOpcional(categoryId, userId);

  const { count } = await prisma.fixedBill.updateMany({
    where: { id, userId },
    data: { nome, valorEsperado, valorMin, valorMax, categoryId },
  });
  if (count === 0) {
    throw new Error("Conta fixa não encontrada.");
  }

  revalidatePath("/planejamento/contas-fixas");
  revalidatePath("/planejamento/contas-do-mes");
}

export async function excluirContaFixa(id: string) {
  if (!id) {
    throw new Error("Conta fixa inválida.");
  }
  const userId = await getCurrentUserId();
  const { count } = await prisma.fixedBill.deleteMany({ where: { id, userId } });
  if (count === 0) {
    throw new Error("Conta fixa não encontrada.");
  }
  revalidatePath("/planejamento/contas-fixas");
  revalidatePath("/planejamento/contas-do-mes");
}

/** Roda a busca de correspondências de novo pro mês atual — botão "Buscar correspondências". */
export async function buscarCorrespondenciasAction() {
  const userId = await getCurrentUserId();
  const { mes, ano } = mesAnoAtual();
  await buscarEPersistirCorrespondencias(userId, mes, ano);

  revalidateFinancialPaths();
  revalidatePath("/planejamento");
  revalidatePath("/planejamento/contas-fixas");
  revalidatePath("/planejamento/contas-do-mes");
}

/**
 * Resolve manualmente uma conta fixa ambígua ou sem correspondência, no
 * mês atual: `transactionId` vincula a essa transação específica (marca
 * natureza FIXO nela); `null` marca "não encontrada este mês".
 */
export async function resolverManualmente(
  fixedBillId: string,
  transactionId: string | null,
) {
  if (!fixedBillId) {
    throw new Error("Conta fixa inválida.");
  }

  const userId = await getCurrentUserId();
  const { mes, ano } = mesAnoAtual();

  const conta = await prisma.fixedBill.findFirst({
    where: { id: fixedBillId, userId },
  });
  if (!conta) {
    throw new Error("Conta fixa não encontrada.");
  }

  let transacaoConfirmada: { descricao: string; contraparteDocumento: string | null } | null = null;
  if (transactionId) {
    transacaoConfirmada = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
        tipo: "DESPESA",
        transferenciaInterna: false,
      },
      select: { descricao: true, contraparteDocumento: true },
    });
    if (!transacaoConfirmada) {
      throw new Error("Transação não encontrada.");
    }

    const jaReivindicada = await prisma.fixedBillMatch.findUnique({
      where: { transactionId },
    });
    if (jaReivindicada && jaReivindicada.fixedBillId !== fixedBillId) {
      throw new Error("Essa transação já está vinculada a outra conta fixa.");
    }
  }

  await prisma.fixedBillMatch.upsert({
    where: { fixedBillId_mes_ano: { fixedBillId, mes, ano } },
    update: {
      transactionId,
      status: transactionId ? "MANUAL" : "NAO_ENCONTRADA",
    },
    create: {
      fixedBillId,
      userId,
      mes,
      ano,
      transactionId,
      status: transactionId ? "MANUAL" : "NAO_ENCONTRADA",
    },
  });

  if (transactionId && transacaoConfirmada) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { natureza: "FIXO" },
    });
    // Aprende o documento (CPF/CNPJ, critério preferencial) e o texto
    // normalizado (fallback) dessa confirmação manual — acrescenta à lista
    // em vez de substituir, já que o mesmo estabelecimento pode cobrar em
    // mais de um formato (ex.: débito direto vs. boleto do mesmo banco).
    // Junto com a faixa de valor, qualquer padrão da lista permite vincular
    // automaticamente sem pedir confirmação de novo (ver
    // lib/fixedBillMatching.ts).
    const novoTexto = normalizarDescricao(transacaoConfirmada.descricao);
    const novoDocumento = transacaoConfirmada.contraparteDocumento;
    const data: { textosAprendidos?: { push: string }; documentosAprendidos?: { push: string } } = {};
    if (!conta.textosAprendidos.includes(novoTexto)) {
      data.textosAprendidos = { push: novoTexto };
    }
    if (novoDocumento && !conta.documentosAprendidos.includes(novoDocumento)) {
      data.documentosAprendidos = { push: novoDocumento };
    }
    if (Object.keys(data).length > 0) {
      await prisma.fixedBill.update({ where: { id: fixedBillId }, data });
    }
    // Com o padrão (re)aprendido, outros meses dos últimos 3 que já batem
    // nos dois critérios são vinculados de uma vez.
    await persistirHistoricoAutomatico(userId, fixedBillId);
  }

  revalidateFinancialPaths();
  revalidatePath("/planejamento");
  revalidatePath("/planejamento/contas-fixas");
}

const MES_ANO_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export type HistoricoItemContaFixa = {
  id: string;
  descricao: string;
  valor: number;
  dataFormatada: string;
  mesLabel: string;
  vinculada: boolean;
};

/**
 * Transações dos últimos 3 meses (mês atual + 2 anteriores) relacionadas a
 * essa conta fixa: batendo nos dois critérios (identidade do destinatário
 * já confirmada — documento ou texto, ver bateIdentidade — E valor dentro
 * da faixa) OU batendo em só um dos dois, OU já oficialmente vinculadas.
 * Antes de listar, chama persistirHistoricoAutomatico: qualquer mês que já
 * bate nos dois critérios vira vínculo oficial na hora, então tudo que
 * aparece aqui como "vinculada" reflete isso; o que aparece só com um dos
 * critérios (valor OU identidade, não os dois) fica com `vinculada: false`
 * — precisa de confirmação manual (ver vincularTransacaoHistorico) porque
 * um critério isolado não garante que seja a mesma conta, mas precisa
 * APARECER aqui pra dar pra confirmar; do contrário um formato novo do
 * mesmo estabelecimento nunca teria como ser descoberto. Mais recente
 * primeiro.
 */
export async function buscarHistoricoContaFixa(
  fixedBillId: string,
): Promise<HistoricoItemContaFixa[]> {
  if (!fixedBillId) {
    throw new Error("Conta fixa inválida.");
  }
  const userId = await getCurrentUserId();

  const conta = await prisma.fixedBill.findFirst({ where: { id: fixedBillId, userId } });
  if (!conta) {
    throw new Error("Conta fixa não encontrada.");
  }

  // Vincula de uma vez qualquer mês dos últimos 3 que já bate nos dois
  // critérios mas ainda não tinha um FixedBillMatch, antes de listar.
  await persistirHistoricoAutomatico(userId, fixedBillId);

  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const [transacoes, matchesDaConta] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        tipo: "DESPESA",
        transferenciaInterna: false,
        data: { gte: inicio, lt: fim },
      },
      select: { id: true, descricao: true, valor: true, data: true, contraparteDocumento: true },
      orderBy: { data: "desc" },
    }),
    prisma.fixedBillMatch.findMany({
      where: { fixedBillId, userId, transactionId: { not: null } },
      select: { transactionId: true },
    }),
  ]);

  const vinculadasIds = new Set(matchesDaConta.map((m) => m.transactionId));
  const valorMin = Number(conta.valorMin);
  const valorMax = Number(conta.valorMax);
  const contaMatching = {
    id: conta.id,
    valorMin,
    valorMax,
    textosAprendidos: conta.textosAprendidos,
    documentosAprendidos: conta.documentosAprendidos,
  };
  const dataFormatter = new Intl.DateTimeFormat("pt-BR");

  const resultado = transacoes
    .filter((t) => {
      const valorNum = Number(t.valor);
      const bateValor = valorNum >= valorMin && valorNum <= valorMax;
      const candidato = {
        id: t.id,
        valor: valorNum,
        descricaoNormalizada: normalizarDescricao(t.descricao),
        documento: t.contraparteDocumento,
      };
      return bateValor || bateIdentidade(candidato, contaMatching) || vinculadasIds.has(t.id);
    })
    .map((t) => ({
      id: t.id,
      descricao: t.descricao,
      valor: Number(t.valor),
      dataFormatada: dataFormatter.format(t.data),
      mesLabel: MES_ANO_FORMATTER.format(t.data),
      vinculada: vinculadasIds.has(t.id),
    }));

  revalidateFinancialPaths();
  revalidatePath("/planejamento");
  revalidatePath("/planejamento/contas-fixas");
  revalidatePath("/planejamento/contas-do-mes");

  return resultado;
}

/**
 * Vincula manualmente, a partir do Histórico, uma transação de qualquer um
 * dos últimos 3 meses que bate em só um dos dois critérios (só valor ou só
 * identidade do destinatário) — usa o mês/ano da própria transação (não
 * "agora"), soma o documento (CPF/CNPJ) e/ou o texto normalizado dela às
 * listas aprendidas (aprende esse formato novo pra próxima vez) e roda
 * persistirHistoricoAutomatico, que pode destravar outros meses que agora
 * batem no padrão recém-aprendido.
 */
export async function vincularTransacaoHistorico(fixedBillId: string, transactionId: string) {
  if (!fixedBillId || !transactionId) {
    throw new Error("Dados inválidos.");
  }
  const userId = await getCurrentUserId();

  const conta = await prisma.fixedBill.findFirst({ where: { id: fixedBillId, userId } });
  if (!conta) {
    throw new Error("Conta fixa não encontrada.");
  }

  const transacao = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, tipo: "DESPESA", transferenciaInterna: false },
  });
  if (!transacao) {
    throw new Error("Transação não encontrada.");
  }

  const jaReivindicada = await prisma.fixedBillMatch.findUnique({ where: { transactionId } });
  if (jaReivindicada && jaReivindicada.fixedBillId !== fixedBillId) {
    throw new Error("Essa transação já está vinculada a outra conta fixa.");
  }

  const mes = transacao.data.getMonth() + 1;
  const ano = transacao.data.getFullYear();

  await prisma.fixedBillMatch.upsert({
    where: { fixedBillId_mes_ano: { fixedBillId, mes, ano } },
    update: { transactionId, status: "MANUAL" },
    create: { fixedBillId, userId, mes, ano, transactionId, status: "MANUAL" },
  });
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { natureza: "FIXO" },
  });

  const novoTexto = normalizarDescricao(transacao.descricao);
  const novoDocumento = transacao.contraparteDocumento;
  const dadosAprendizado: { textosAprendidos?: { push: string }; documentosAprendidos?: { push: string } } = {};
  if (!conta.textosAprendidos.includes(novoTexto)) {
    dadosAprendizado.textosAprendidos = { push: novoTexto };
  }
  if (novoDocumento && !conta.documentosAprendidos.includes(novoDocumento)) {
    dadosAprendizado.documentosAprendidos = { push: novoDocumento };
  }
  if (Object.keys(dadosAprendizado).length > 0) {
    await prisma.fixedBill.update({ where: { id: fixedBillId }, data: dadosAprendizado });
  }
  await persistirHistoricoAutomatico(userId, fixedBillId);

  revalidateFinancialPaths();
  revalidatePath("/planejamento");
  revalidatePath("/planejamento/contas-fixas");
  revalidatePath("/planejamento/contas-do-mes");
}

/** Remove o vínculo do mês atual, sem desfazer a classificação da transação já feita. */
export async function desvincularContaFixa(fixedBillId: string) {
  if (!fixedBillId) {
    throw new Error("Conta fixa inválida.");
  }
  const userId = await getCurrentUserId();
  const { mes, ano } = mesAnoAtual();

  await prisma.fixedBillMatch.deleteMany({
    where: { fixedBillId, userId, mes, ano },
  });

  revalidatePath("/planejamento/contas-fixas");
  revalidatePath("/planejamento/contas-do-mes");
}

export async function saveMonthlyPlan(formData: FormData) {
  const mes = Number(formData.get("mes"));
  const ano = Number(formData.get("ano"));
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano)) {
    throw new Error("Mês/ano inválidos.");
  }

  const rendaPlanejada = parsePositiveNumber(
    String(formData.get("rendaPlanejada") ?? ""),
    "Renda planejada",
  );
  const percentualEssencial = parseNonNegativeNumber(
    String(formData.get("percentualEssencial") ?? ""),
    "Percentual Essencial",
  );
  const percentualPessoal = parseNonNegativeNumber(
    String(formData.get("percentualPessoal") ?? ""),
    "Percentual Pessoal",
  );
  const percentualReserva = parseNonNegativeNumber(
    String(formData.get("percentualReserva") ?? ""),
    "Percentual Reserva",
  );
  const percentualInvestimento = parseNonNegativeNumber(
    String(formData.get("percentualInvestimento") ?? ""),
    "Percentual Investimento",
  );

  const soma =
    percentualEssencial +
    percentualPessoal +
    percentualReserva +
    percentualInvestimento;
  if (Math.abs(soma - 100) > TOLERANCIA_SOMA_PERCENTUAL) {
    throw new Error(
      `Os percentuais precisam somar 100% (hoje soma ${soma.toFixed(1)}%).`,
    );
  }

  const userId = await getCurrentUserId();

  await prisma.monthlyPlan.upsert({
    where: { userId_mes_ano: { userId, mes, ano } },
    update: {
      rendaPlanejada,
      percentualEssencial,
      percentualPessoal,
      percentualReserva,
      percentualInvestimento,
    },
    create: {
      userId,
      mes,
      ano,
      rendaPlanejada,
      percentualEssencial,
      percentualPessoal,
      percentualReserva,
      percentualInvestimento,
    },
  });

  revalidateFinancialPaths();
  revalidatePath("/planejamento");
}
