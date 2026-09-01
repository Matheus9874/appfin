import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import ChatInterface from "./ChatInterface";

export default async function AssistentePage() {
  const userId = await getCurrentUserId();

  const historico = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const mensagensIniciais = historico.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistente</h1>
        <p className="mt-1 text-sm text-muted">
          Converse sobre suas finanças com base nos seus dados reais
        </p>
      </div>

      <ChatInterface mensagensIniciais={mensagensIniciais} />
    </div>
  );
}
