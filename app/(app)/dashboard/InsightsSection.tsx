"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

export default function InsightsSection() {
  const [insights, setInsights] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGerar() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setInsights(null);

    try {
      const res = await fetch("/api/insights", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível gerar os insights agora.");
        return;
      }

      if (data.message) {
        setMessage(data.message);
        return;
      }

      setInsights(Array.isArray(data.insights) ? data.insights : []);
    } catch {
      setError(
        "Não foi possível conectar ao serviço de insights. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-base font-semibold">
          <Sparkles size={16} className="text-muted" />
          Insights financeiros
        </h2>
        <button
          type="button"
          onClick={handleGerar}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles size={14} />
          {loading ? "Gerando..." : "Gerar insights"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-border bg-negative-soft p-4 text-sm text-negative">
          {error}
        </div>
      )}

      {message && !error && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
          {message}
        </div>
      )}

      {insights && insights.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed shadow-sm"
            >
              {insight}
            </div>
          ))}
        </div>
      )}

      {!insights && !message && !error && !loading && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
          Clique em &ldquo;Gerar insights&rdquo; para receber uma análise
          personalizada das suas finanças recentes.
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
          Analisando suas finanças...
        </div>
      )}
    </section>
  );
}
