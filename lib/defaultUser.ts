import { prisma } from "@/lib/prisma";

const DEFAULT_USER_EMAIL = "demo@local.test";

/**
 * Sem autenticação implementada ainda: todas as transações são
 * atribuídas a este usuário único, que é criado sob demanda.
 * Quando a autenticação existir, isso é substituído pelo usuário logado.
 */
export async function getDefaultUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {},
    create: { email: DEFAULT_USER_EMAIL },
  });
  return user.id;
}
