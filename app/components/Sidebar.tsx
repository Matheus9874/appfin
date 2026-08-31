"use client";

import {
  ArrowLeftRight,
  FileBarChart,
  LayoutDashboard,
  PiggyBank,
  Tags,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/transacoes",
    label: "Transações",
    icon: ArrowLeftRight,
    children: [{ href: "/categorias", label: "Categorias", icon: Tags }],
  },
  {
    href: "/reserva-investimentos",
    label: "Reserva e Investimentos",
    icon: PiggyBank,
  },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface px-4 py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Wallet size={18} />
        </div>
        <span className="text-lg font-semibold tracking-tight">
          Finanças
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const parentActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const childActive =
            item.children?.some((c) => pathname === c.href) ?? false;
          const expanded = parentActive || childActive;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  parentActive
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>

              {item.children && expanded && (
                <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-border pl-3">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const active = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-accent-soft text-accent"
                            : "text-muted hover:bg-surface-hover hover:text-foreground"
                        }`}
                      >
                        <ChildIcon size={16} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
