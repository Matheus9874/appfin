import "server-only";
import { PluggyClient } from "pluggy-sdk";

export function getPluggyClient(): PluggyClient {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais do Pluggy não configuradas.");
  }

  return new PluggyClient({ clientId, clientSecret });
}
