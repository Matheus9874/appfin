import "server-only";
import { getPluggyClient } from "./pluggy";

const EVENTOS_MONITORADOS = ["item/updated", "transactions/created"] as const;

/**
 * Registra nosso endpoint de webhook no Pluggy para que novas transações e
 * atualizações de item disparem uma sincronização automática, em vez de
 * depender do usuário clicar em "Sincronizar agora". Idempotente — não
 * recria um webhook que já aponta para nossa URL.
 *
 * Sem `APP_URL`/`PLUGGY_WEBHOOK_SECRET` configurados, simplesmente não faz
 * nada (a sincronização manual continua funcionando normalmente).
 */
export async function garantirWebhooksRegistrados(): Promise<void> {
  const appUrl = process.env.APP_URL;
  const secret = process.env.PLUGGY_WEBHOOK_SECRET;
  if (!appUrl || !secret) return;

  const url = `${appUrl.replace(/\/$/, "")}/api/pluggy/webhook`;
  const client = getPluggyClient();
  const existentes = await client.fetchWebhooks();

  for (const evento of EVENTOS_MONITORADOS) {
    const jaExiste = existentes.results.some(
      (w) => w.event === evento && w.url === url && w.disabledAt === null,
    );
    if (jaExiste) continue;
    await client.createWebhook(evento, url, { "x-webhook-secret": secret });
  }
}
