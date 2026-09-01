import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getPluggyClient } from "@/lib/pluggy";

export async function POST() {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const client = getPluggyClient();
    const { accessToken } = await client.createConnectToken(undefined, {
      clientUserId: userId,
      avoidDuplicates: true,
    });
    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error("Pluggy: erro ao criar connect token.", error);
    return NextResponse.json(
      { error: "Não foi possível iniciar a conexão com o banco agora." },
      { status: 503 },
    );
  }
}
