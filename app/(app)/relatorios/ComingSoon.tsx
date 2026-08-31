import type { LucideIcon } from "lucide-react";

export default function ComingSoon({
  icon: Icon,
  message,
}: {
  icon: LucideIcon;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-16 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon size={22} />
      </div>
      <p className="font-medium">Em breve</p>
      <p className="max-w-sm text-sm text-muted">{message}</p>
    </div>
  );
}
