import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getCurrentInvestments, investmentKey } from "@/lib/currentInvestments";
import { calcularProgressoMeta } from "@/lib/goalProgress";

const MODEL = "claude-sonnet-4-6";
const RATE_LIMIT_MAX_CALLS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const HISTORICO_MENSAGENS = 20;
const MENSAGEM_MAX_LENGTH = 2000;

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

async function buildFinancialContext(userId: string) {
  const agora = new Date();
  const inicioJanela = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);

  const [transactions, goals, investimentos] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, data: { gte: inicioJanela } },
      include: { category: true },
      orderBy: { data: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId },
      include: { investment: true },
      orderBy: { prazo: "asc" },
    }),
    prisma.investment.findMany({
      where: { userId },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
  ]);

  let receitas = 0;
  let despesas = 0;
  const despesasPorCategoria = new Map<string, number>();

  for (const t of transactions) {
    const valor = Number(t.valor);
    if (t.tipo === "RECEITA") {
      receitas += valor;
    } else {
      despesas += valor;
      despesasPorCategoria.set(
        t.category.nome,
        (despesasPorCategoria.get(t.category.nome) ?? 0) + valor,
      );
    }
  }

  const categoriasTexto =
    [...despesasPorCategoria.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nome, valor]) => `  - ${nome}: ${formatMoeda(valor)}`)
      .join("\n") || "  (nenhuma despesa registrada)";

  const investimentosAtuais = getCurrentInvestments(investimentos);
  const valorAtualPorChave = new Map(
    investimentosAtuais.map((inv) => [investmentKey(inv), Number(inv.valor)]),
  );

  const metasTexto = goals.length
    ? goals
        .map((goal) => {
          const progresso = calcularProgressoMeta(goal, valorAtualPorChave, agora);
          return `  - ${progresso.nome}: ${formatMoeda(progresso.valorAtual)} de ${formatMoeda(progresso.valorAlvo)} (${progresso.percentual.toFixed(0)}%), prazo ${formatData(progresso.prazo)}`;
        })
        .join("\n")
    : "  (nenhuma meta cadastrada)";

  const investimentosTexto = investimentosAtuais.length
    ? investimentosAtuais
        .map(
          (inv) =>
            `  - ${inv.tipo} (${inv.instituicao}${inv.nome ? `, ${inv.nome}` : ""}): ${formatMoeda(Number(inv.valor))}`,
        )
        .join("\n")
    : "  (nenhum investimento ou reserva cadastrados)";

  return `Resumo financeiro dos últimos 3 meses:
Receitas: ${formatMoeda(receitas)}
Despesas: ${formatMoeda(despesas)}
Despesas por categoria:
${categoriasTexto}

Metas ativas:
${metasTexto}

Investimentos e reserva atuais (valor mais recente de cada um):
${investimentosTexto}`;
}

const SYSTEM_PROMPT_BASE = `Você é o assistente financeiro pessoal do app RumoFin. Responda sempre em português do Brasil, de forma objetiva e direta.

Regras:
- Baseie suas respostas nos dados financeiros reais fornecidos no contexto abaixo — não invente valores que não estejam lá.
- Sempre que fizer uma projeção, estimativa ou suposição, deixe isso explícito (ex: "estimando que...", "isso é uma projeção, não um valor garantido").
- Você não é um consultor de investimentos licenciado: evite recomendações específicas de onde investir; foque em organização financeira, orçamento, metas e hábitos de consumo.
- Seja conciso — poucos parágrafos curtos, sem enrolação.
- Responda em texto simples, sem markdown (sem "**", "#", tabelas ou listas com "-"): a resposta aparece em uma bolha de chat, não em um documento.`;

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(
    `chat:${userId}`,
    RATE_LIMIT_MAX_CALLS,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      {
        error:
          "Você atingiu o limite de mensagens ao assistente. Tente novamente mais tarde.",
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let pergunta: string;
  try {
    const body = await request.json();
    pergunta = String(body?.message ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!pergunta) {
    return NextResponse.json(
      { error: "Digite uma mensagem antes de enviar." },
      { status: 400 },
    );
  }
  if (pergunta.length > MENSAGEM_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Mensagem muito longa (máximo de ${MENSAGEM_MAX_LENGTH} caracteres).` },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Assistente indisponível no momento. Tente novamente mais tarde." },
      { status: 503 },
    );
  }

  const [contexto, historico] = await Promise.all([
    buildFinancialContext(userId),
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: HISTORICO_MENSAGENS,
    }),
  ]);
  historico.reverse();

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT_BASE}\n\n${contexto}`,
      messages: [
        ...historico.map((m) => ({
          role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        })),
        { role: "user" as const, content: pergunta },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const resposta = textBlock?.text?.trim();

    if (!resposta) {
      throw new Error("Resposta vazia da API.");
    }

    await prisma.chatMessage.createMany({
      data: [
        { userId, role: "USER", content: pergunta },
        { userId, role: "ASSISTANT", content: resposta },
      ],
    });

    return NextResponse.json({ reply: resposta });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Assistente: chave da API Anthropic inválida.", error);
      return NextResponse.json(
        { error: "Assistente indisponível: configuração de API inválida." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      console.error("Assistente: rate limit da Anthropic atingido.", error);
      return NextResponse.json(
        { error: "Muitas solicitações no momento. Tente novamente em instantes." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Assistente: erro da API Anthropic.", error);
      return NextResponse.json(
        { error: "Não foi possível responder agora. Tente novamente." },
        { status: 503 },
      );
    }
    console.error("Assistente: erro inesperado.", error);
    return NextResponse.json(
      { error: "Não foi possível responder agora. Tente novamente." },
      { status: 503 },
    );
  }
}
