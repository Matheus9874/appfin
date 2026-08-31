import type { LucideIcon } from "lucide-react";
import InfoTooltip from "../components/InfoTooltip";

type Tone = "accent" | "positive" | "negative" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
  neutral: "bg-surface-hover text-foreground",
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  info,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  info?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}
        >
          <Icon size={20} />
        </div>
        <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
          {label}
          {info && <InfoTooltip text={info} />}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
