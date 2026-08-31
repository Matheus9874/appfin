import { Target } from "lucide-react";

export default function MetasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
        <p className="mt-1 text-sm text-muted">
          Defina e acompanhe seus objetivos financeiros
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-16 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Target size={22} />
        </div>
        <p className="font-medium">Em breve</p>
        <p className="max-w-sm text-sm text-muted">
          Em breve você poderá criar metas de economia e acompanhar o
          progresso por aqui.
        </p>
      </div>
    </div>
  );
}
