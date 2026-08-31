import { Info } from "lucide-react";

export default function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="Mais informações"
        className="flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
      >
        <Info size={14} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed font-normal whitespace-pre-line text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
