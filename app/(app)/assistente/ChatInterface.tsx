"use client";

import { Bot, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatRole } from "@/app/generated/prisma/enums";

type Mensagem = {
  id: string;
  role: ChatRole;
  content: string;
};

export default function ChatInterface({
  mensagensIniciais,
}: {
  mensagensIniciais: Mensagem[];
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensIniciais);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [mensagens, loading]);

  async function handleSend() {
    const pergunta = input.trim();
    if (!pergunta || loading) return;

    setLoading(true);
    setError(null);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: pergunta }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar sua mensagem.");
        setInput(pergunta);
        return;
      }

      setMensagens((atual) => [
        ...atual,
        { id: `${Date.now()}-u`, role: "USER", content: pergunta },
        { id: `${Date.now()}-a`, role: "ASSISTANT", content: data.reply },
      ]);
    } catch {
      setError(
        "Não foi possível conectar ao assistente. Verifique sua conexão e tente novamente.",
      );
      setInput(pergunta);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6"
      >
        {mensagens.length === 0 && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted">
            <Bot size={28} className="text-muted" />
            Nenhuma mensagem ainda. Pergunte algo sobre suas finanças, como
            &ldquo;quanto gastei com Mercado este mês?&rdquo;
          </div>
        )}

        {mensagens.map((m) => {
          const isUser = m.role === "USER";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isUser
                    ? "bg-accent-soft text-accent"
                    : "bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white"
                }`}
              >
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-accent-soft text-foreground"
                    : "bg-surface-hover text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white">
              <Bot size={16} />
            </div>
            <div className="rounded-2xl bg-surface-hover px-4 py-2.5 text-sm text-muted">
              Pensando...
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mb-4 rounded-lg bg-negative-soft px-4 py-3 text-sm text-negative">
          {error}
        </div>
      )}

      <div className="flex items-end gap-3 border-t border-border p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo sobre suas finanças..."
          rows={1}
          disabled={loading}
          className="min-h-10 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          aria-label="Enviar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
