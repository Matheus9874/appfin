"use client";

import { Check, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Estado = "ocioso" | "sincronizando" | "sucesso" | "erro";

/**
 * Botão de sincronização manual com o Pluggy, disponível na barra lateral
 * (qualquer página) — chama /api/pluggy/sync, que já revalida os caminhos
 * que dependem de dados importados (dashboard, transações, investimentos,
 * metas, relatórios), e depois atualiza a página atual com router.refresh()
 * para refletir os dados novos sem precisar recarregar manualmente.
 */
export default function SyncPluggyButton({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function handleClick() {
    if (estado === "sincronizando") return;
    setEstado("sincronizando");
    setMensagem(null);
    try {
      const res = await fetch("/api/pluggy/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setEstado("erro");
        setMensagem(data.error ?? "Não foi possível sincronizar agora.");
        return;
      }
      setEstado("sucesso");
      setMensagem(
        `${data.transacoesImportadas} novas transações, ${data.investimentosImportados} investimentos atualizados.`,
      );
      router.refresh();
    } catch {
      setEstado("erro");
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setTimeout(() => {
        setEstado("ocioso");
        setMensagem(null);
      }, 4000);
    }
  }

  const Icon = estado === "sucesso" ? Check : RefreshCw;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={estado === "sincronizando"}
        title={collapsed ? "Atualizar dados do banco" : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
          collapsed ? "md:justify-center md:px-0" : ""
        }`}
      >
        <Icon
          size={18}
          className={`shrink-0 ${estado === "sincronizando" ? "animate-spin" : ""}`}
        />
        <span className={collapsed ? "md:hidden" : ""}>
          {estado === "sincronizando"
            ? "Sincronizando..."
            : estado === "sucesso"
              ? "Dados atualizados"
              : "Atualizar dados do banco"}
        </span>
      </button>
      {mensagem && !collapsed && (
        <p
          className={`px-3 text-xs ${estado === "erro" ? "text-negative" : "text-muted"}`}
        >
          {mensagem}
        </p>
      )}
    </div>
  );
}
