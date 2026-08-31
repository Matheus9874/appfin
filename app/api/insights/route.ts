import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

const MODEL = "claude-sonnet-4-6";

function chaveMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function labelMes(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(ano, mes - 1, 1),
  );
}

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function buildResumoFinanceiro(userId: string) {
  const agora = new Date();
  const inicioJanela = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);

  const transactions = await prisma.transaction.findMany({
    where: { userId, data: { gte: inicioJanela } },
    include: { category: true },
    orderBy: { data: "asc" },
  });

  if (transactions.length === 0) {
    return null;
  }

  type MesResumo = {
    receitas: number;
    despesas: number;
    categorias: Map<string, number>;
  };

  const porMes = new Map<string, MesResumo>();

  for (const t of transactions) {
    const chave = chaveMes(t.data);
    const atual = porMes.get(chave) ?? {
      receitas: 0,
      despesas: 0,
      categorias: new Map<string, number>(),
    };
    const valor = Number(t.valor);

    if (t.tipo === "RECEITA") {
      atual.receitas += valor;
    } else {
      atual.despesas += valor;
      atual.categorias.set(
        t.category.nome,
        (atual.categorias.get(t.category.nome) ?? 0) + valor,
      );
    }

    porMes.set(chave, atual);
  }

  const mesesOrdenados = [...porMes.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return mesesOrdenados
    .map(([chave, resumo]) => {
      const categoriasTexto =
        [...resumo.categorias.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([nome, valor]) => `  - ${nome}: ${formatMoeda(valor)}`)
          .join("\n") || "  (nenhuma despesa)";

      return `${labelMes(chave)}:\n  Receitas: ${formatMoeda(resumo.receitas)}\n  Despesas: ${formatMoeda(resumo.despesas)}\n  Despesas por categoria:\n${categoriasTexto}`;
    })
    .join("\n\n");
}

const SYSTEM_PROMPT = `Você é um assistente financeiro que analisa dados de um app de finanças pessoais e gera insights curtos, específicos e acionáveis em português do Brasil.

Regras:
- Gere de 2 a 3 insights, no máximo.
- Cada insight deve ser uma frase curta (máximo ~25 palavras).
- Use dados concretos (valores, percentuais, nomes de categorias) sempre que possível, comparando meses quando houver dados suficientes.
- Foque em variações mês a mês e oportunidades de economia.
- Não invente dados que não estejam no resumo fornecido.
- Responda APENAS com um array JSON de strings, sem nenhum texto antes ou depois. Exemplo: ["Seus gastos com Combustível aumentaram 20% este mês.", "Você pode economizar reduzindo gastos com Restaurante."]`;

export async function POST() {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Insights indisponíveis no momento. Tente novamente mais tarde." },
      { status: 503 },
    );
  }

  const resumo = await buildResumoFinanceiro(userId);

  if (!resumo) {
    return NextResponse.json({
      insights: [],
      message: "Adicione algumas transações para receber insights personalizados.",
    });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Aqui está o resumo financeiro dos últimos meses:\n\n${resumo}\n\nGere os insights.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText = textBlock?.text ?? "[]";

    let insights: unknown;
    try {
      insights = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\[[\s\S]*\]/);
      insights = match ? JSON.parse(match[0]) : [];
    }

    if (
      !Array.isArray(insights) ||
      !insights.every((i) => typeof i === "string")
    ) {
      throw new Error("Formato de resposta inesperado.");
    }

    return NextResponse.json({ insights });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Insights: chave da API Anthropic inválida.", error);
      return NextResponse.json(
        { error: "Insights indisponíveis: configuração de API inválida." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      console.error("Insights: rate limit atingido.", error);
      return NextResponse.json(
        { error: "Muitas solicitações no momento. Tente novamente em instantes." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Insights: erro da API Anthropic.", error);
      return NextResponse.json(
        { error: "Não foi possível gerar os insights agora. Tente novamente." },
        { status: 503 },
      );
    }
    console.error("Insights: erro inesperado.", error);
    return NextResponse.json(
      { error: "Não foi possível gerar os insights agora. Tente novamente." },
      { status: 503 },
    );
  }
}
