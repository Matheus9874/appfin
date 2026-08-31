import {
  ArrowLeftRight,
  ArrowRight,
  LayoutDashboard,
  PiggyBank,
  Target,
} from "lucide-react";
import Link from "next/link";
import Logo from "./components/Logo";

const LOGIN_HREF = "/login";

const FEATURES = [
  {
    icon: ArrowLeftRight,
    title: "Transações",
    description:
      "Registre receitas e despesas em segundos e organize tudo por categoria.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard com gráficos",
    description:
      "Veja saldo, patrimônio e a evolução dos seus gastos em um único painel.",
  },
  {
    icon: Target,
    title: "Metas",
    description:
      "Defina objetivos financeiros e acompanhe quanto falta para alcançá-los.",
  },
  {
    icon: PiggyBank,
    title: "Investimentos e Reserva",
    description:
      "Acompanhe onde seu dinheiro está investido e sua reserva de emergência.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white">
              <Logo size={20} />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Rumo
              <span className="bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
                Fin
              </span>
            </span>
          </div>
          <Link
            href={LOGIN_HREF}
            className="rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-16">
        <section className="bg-[#0a1130] text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Controle financeiro pessoal simples e inteligente
            </h1>
            <p className="max-w-xl text-base text-white/70 sm:text-lg">
              Organize suas transações, acompanhe metas e enxergue sua vida
              financeira com clareza — tudo em um só lugar.
            </p>
            <Link
              href={LOGIN_HREF}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Começar agora
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              O que você pode fazer
            </h2>
            <p className="mt-2 text-sm text-muted">
              Tudo o que você precisa para organizar suas finanças no dia a
              dia
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-muted">
          © {new Date().getFullYear()} RumoFin. Controle financeiro pessoal.
        </div>
      </footer>
    </div>
  );
}
