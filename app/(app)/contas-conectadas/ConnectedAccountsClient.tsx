"use client";

import { AlertTriangle, Building2, Landmark, RefreshCw, Unlink, Wrench } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { PluggyConnectProps } from "react-pluggy-connect";
import Modal from "@/app/components/Modal";

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
  transacoesCount: number;
  investimentosCount: number;
};

function formatDataHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function ModalDesconectar({
  conexao,
  onClose,
  onConfirm,
}: {
  conexao: Conexao;
  onClose: () => void;
  onConfirm: (apagarDados: boolean) => Promise<void>;
}) {
  const [apagarDados, setApagarDados] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const temDados = conexao.transacoesCount > 0 || conexao.investimentosCount > 0;

  async function handleConfirmar() {
    setErro(null);
    setConfirmando(true);
    try {
      await onConfirm(apagarDados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível desconectar.");
      setConfirmando(false);
    }
  }

  return (
    <Modal title={`Desconectar ${conexao.connectorName}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Isso revoga o acesso do app a essa conexão e para a sincronização
          automática.
        </p>

        {temDados && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={apagarDados}
                onChange={(e) => setApagarDados(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span>
                Também apagar permanentemente {conexao.transacoesCount}{" "}
                transação(ões) e {conexao.investimentosCount}{" "}
                investimento(s) importados por essa conexão.
              </span>
            </label>
            {apagarDados && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-negative">
                <AlertTriangle size={12} />
                Essa ação não pode ser desfeita.
              </p>
            )}
          </div>
        )}

        {erro && <p className="text-sm text-negative">{erro}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={confirmando}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
              apagarDados ? "bg-negative" : "bg-gradient-to-br from-[#2563eb] to-[#7c3aed]"
            }`}
          >
            {confirmando
              ? "Desconectando..."
              : apagarDados
                ? "Desconectar e apagar dados"
                : "Desconectar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

type DadosOrfaos = { transacoesCount: number; investimentosCount: number };

function ModalApagarOrfaos({
  dadosOrfaos,
  onClose,
  onConfirm,
}: {
  dadosOrfaos: DadosOrfaos;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleConfirmar() {
    setErro(null);
    setConfirmando(true);
    try {
      await onConfirm();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível apagar.");
      setConfirmando(false);
    }
  }

  return (
    <Modal title="Apagar dados sem conexão ativa" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          {dadosOrfaos.transacoesCount} transação(ões) e{" "}
          {dadosOrfaos.investimentosCount} investimento(s) foram importados
          pelo Pluggy no passado, mas a conexão que os trouxe já foi
          desconectada. Isso apaga esses lançamentos permanentemente — os
          demais lançamentos manuais e de conexões ainda ativas não são
          afetados.
        </p>
        <p className="flex items-center gap-1.5 text-xs font-medium text-negative">
          <AlertTriangle size={12} />
          Essa ação não pode ser desfeita.
        </p>

        {erro && <p className="text-sm text-negative">{erro}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={confirmando}
            className="rounded-lg bg-negative px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmando ? "Apagando..." : "Apagar permanentemente"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function ConnectedAccountsClient({
  conexoesIniciais,
  dadosOrfaos,
}: {
  conexoesIniciais: Conexao[];
  dadosOrfaos: DadosOrfaos;
}) {
  const [conexoes, setConexoes] = useState(conexoesIniciais);
  const [orfaos, setOrfaos] = useState(dadosOrfaos);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [conexaoParaDesconectar, setConexaoParaDesconectar] = useState<Conexao | null>(null);
  const [mostrarModalOrfaos, setMostrarModalOrfaos] = useState(false);
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
            // Chave só pra essa renderização local — a lista real vem do
            // banco no próximo carregamento da página. Evita depender de
            // crypto.randomUUID(), que exige contexto seguro (HTTPS ou
            // localhost) e falha ao acessar via IP de rede em HTTP.
            id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            connectorName: result.connectorName,
            createdAt: new Date().toISOString(),
            lastSyncedAt: new Date().toISOString(),
            transacoesCount: result.transacoesImportadas ?? 0,
            investimentosCount: result.investimentosImportados ?? 0,
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

  async function handleReclassify() {
    setReclassifying(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/pluggy/reclassify-transfers", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível corrigir agora.");
        return;
      }
      setMessage(
        data.transacoesCorrigidas > 0
          ? `${data.transacoesCorrigidas} transação(ões) corrigida(s) — não eram transferência interna.`
          : "Nenhuma transação precisava de correção.",
      );
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setReclassifying(false);
    }
  }

  async function handleConfirmarDesconexao(conexao: Conexao, apagarDados: boolean) {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/pluggy/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conexao.id, apagarDados }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Não foi possível desconectar agora.");
    }
    setMessage(
      apagarDados
        ? `"${conexao.connectorName}" desconectado — ${data.transacoesApagadas} transação(ões) e ${data.investimentosApagados} investimento(s) apagados.`
        : `"${conexao.connectorName}" desconectado.`,
    );
    setConexoes((atual) => atual.filter((c) => c.id !== conexao.id));
    setConexaoParaDesconectar(null);
  }

  async function handleConfirmarApagarOrfaos() {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/pluggy/orphaned-data", { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Não foi possível apagar agora.");
    }
    setMessage(
      `${data.transacoesApagadas} transação(ões) e ${data.investimentosApagados} investimento(s) sem conexão ativa foram apagados.`,
    );
    setOrfaos({ transacoesCount: 0, investimentosCount: 0 });
    setMostrarModalOrfaos(false);
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

        {conexoes.length > 0 && (
          <button
            type="button"
            onClick={handleReclassify}
            disabled={reclassifying}
            title="Reprocessa transações já importadas que hoje aparecem como transferência interna, corrigindo as que na verdade são gastos reais."
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Wrench size={16} />
            {reclassifying ? "Corrigindo..." : "Corrigir transferências mal classificadas"}
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

      {(orfaos.transacoesCount > 0 || orfaos.investimentosCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4">
          <p className="text-sm text-warning">
            {orfaos.transacoesCount} transação(ões) e{" "}
            {orfaos.investimentosCount} investimento(s) importados do Pluggy
            continuam salvos de uma conexão já desconectada.
          </p>
          <button
            type="button"
            onClick={() => setMostrarModalOrfaos(true)}
            className="shrink-0 rounded-lg bg-negative px-3.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Apagar esses dados
          </button>
        </div>
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
                <th className="px-6 py-3 text-right">Ações</th>
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
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setConexaoParaDesconectar(c)}
                      title="Desconectar"
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-negative transition-colors hover:bg-negative-soft"
                    >
                      <Unlink size={14} />
                      Desconectar
                    </button>
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

      {conexaoParaDesconectar && (
        <ModalDesconectar
          conexao={conexaoParaDesconectar}
          onClose={() => setConexaoParaDesconectar(null)}
          onConfirm={(apagarDados) =>
            handleConfirmarDesconexao(conexaoParaDesconectar, apagarDados)
          }
        />
      )}

      {mostrarModalOrfaos && (
        <ModalApagarOrfaos
          dadosOrfaos={orfaos}
          onClose={() => setMostrarModalOrfaos(false)}
          onConfirm={handleConfirmarApagarOrfaos}
        />
      )}
    </div>
  );
}
