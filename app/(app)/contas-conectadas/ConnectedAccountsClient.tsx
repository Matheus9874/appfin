"use client";

import { Building2, Landmark, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { PluggyConnectProps } from "react-pluggy-connect";

const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((mod) => mod.PluggyConnect),
  { ssr: false },
);

/**
 * Connector 200 = "MeuPluggy": the free, personal-use path that reads the
 * accounts you've already linked in the Meu Pluggy app via OAuth, instead of
 * connecting a bank directly. Trial Pluggy clients get
 * TRIAL_CLIENT_ITEM_CREATE_NOT_ALLOWED for real bank connectors, so the
 * widget is locked to this one connector — no bank picker shown.
 */
const MEU_PLUGGY_CONNECTOR_ID = 200;

type Conexao = {
  id: string;
  connectorName: string;
  createdAt: string;
  lastSyncedAt: string | null;
};

function formatDataHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function ConnectedAccountsClient({
  conexoesIniciais,
}: {
  conexoesIniciais: Conexao[];
}) {
  const [conexoes, setConexoes] = useState(conexoesIniciais);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/pluggy/connect-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar a conexão.");
        setConnecting(false);
        return;
      }
      setConnectToken(data.accessToken);
    } catch {
      setError("Não foi possível conectar ao Pluggy. Verifique sua conexão.");
      setConnecting(false);
    }
  }

  const onSuccess: PluggyConnectProps["onSuccess"] = async (data) => {
    try {
      const res = await fetch("/api/pluggy/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: data.item.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Não foi possível concluir a conexão.");
      } else {
        setMessage(
          `${result.connectorName} conectado! ${result.transacoesImportadas} transações e ${result.investimentosImportados} investimentos importados.`,
        );
        setConexoes((atual) => [
          {
            id: crypto.randomUUID(),
            connectorName: result.connectorName,
            createdAt: new Date().toISOString(),
            lastSyncedAt: new Date().toISOString(),
          },
          ...atual,
        ]);
      }
    } finally {
      setConnectToken(null);
      setConnecting(false);
    }
  };

  const onError: PluggyConnectProps["onError"] = (err) => {
    setError(err.message || "Não foi possível conectar o banco.");
    setConnectToken(null);
    setConnecting(false);
  };

  const onClose: PluggyConnectProps["onClose"] = () => {
    setConnectToken(null);
    setConnecting(false);
  };

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/pluggy/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível sincronizar agora.");
        return;
      }
      setMessage(
        `${data.transacoesImportadas} novas transações e ${data.investimentosImportados} investimentos atualizados.`,
      );
      setConexoes((atual) =>
        atual.map((c) => ({ ...c, lastSyncedAt: new Date().toISOString() })),
      );
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Landmark size={16} />
          {connecting ? "Abrindo..." : "Conectar via Meu Pluggy"}
        </button>

        {conexoes.length > 0 && (
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        )}
      </div>

      {conexoes.length > 0 && (
        <p className="text-xs text-muted">
          A sincronização acontece automaticamente quando o banco avisa o
          Pluggy sobre uma movimentação nova (geralmente em minutos), com uma
          verificação de segurança uma vez por dia. Use o botão acima se
          quiser forçar uma atualização imediata.
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-negative-soft px-4 py-3 text-sm text-negative">
          {error}
        </div>
      )}
      {message && !error && (
        <div className="rounded-lg bg-positive-soft px-4 py-3 text-sm text-positive">
          {message}
        </div>
      )}

      {conexoes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-muted">
            <Building2 size={22} />
          </div>
          <p className="text-sm text-muted">
            Nenhuma conta conectada ainda. Clique em &ldquo;Conectar via Meu
            Pluggy&rdquo; e entre com sua conta do Meu Pluggy para importar
            as transações dos bancos que você já tem linkados lá.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-6 py-3">Instituição</th>
                <th className="px-6 py-3">Conectado em</th>
                <th className="px-6 py-3">Última sincronização</th>
              </tr>
            </thead>
            <tbody>
              {conexoes.map((c, index) => (
                <tr
                  key={c.id}
                  className={`border-b border-border last:border-0 ${
                    index % 2 === 1 ? "bg-surface-hover/40" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted">
                        <Landmark size={16} />
                      </span>
                      <span className="font-medium">{c.connectorName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {formatDataHora(c.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-muted">
                    {c.lastSyncedAt
                      ? formatDataHora(c.lastSyncedAt)
                      : "Nunca sincronizado"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={false}
          connectorIds={[MEU_PLUGGY_CONNECTOR_ID]}
          selectedConnectorId={MEU_PLUGGY_CONNECTOR_ID}
          onSuccess={onSuccess}
          onError={onError}
          onClose={onClose}
        />
      )}
    </div>
  );
}
