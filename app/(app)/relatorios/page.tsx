import Link from "next/link";
import { REPORTS } from "./reports";

export default function RelatoriosPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="mt-1 text-sm text-muted">
          Escolha um relatório para explorar suas finanças
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.slug}
              href={`/relatorios/${report.slug}`}
              className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-accent"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={20} />
                </div>
                {report.status === "em-breve" && (
                  <span className="rounded-full bg-surface-hover px-2.5 py-1 text-xs font-medium text-muted">
                    Em breve
                  </span>
                )}
              </div>
              <div>
                <h2 className="font-semibold transition-colors group-hover:text-accent">
                  {report.title}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {report.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
