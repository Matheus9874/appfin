import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Returns the Supabase-authenticated user, or null if there is none.
 * Cached per request so repeated calls don't re-hit Supabase.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Resolves the current Supabase-authenticated user to their Prisma `User`
 * row, creating it on first login (matched by email). Throws if there is no
 * authenticated user — proxy.ts keeps unauthenticated requests off protected
 * routes, but every Server Action must still verify independently.
 */
export async function getCurrentUserId(): Promise<string> {
  const authUser = await getAuthUser();

  if (!authUser?.email) {
    throw new Error("Usuário não autenticado.");
  }

  const user = await prisma.user.upsert({
    where: { email: authUser.email },
    update: {},
    create: { email: authUser.email },
  });

  return user.id;
}
