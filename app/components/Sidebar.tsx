"use client";

import {
  ArrowLeftRight,
  FileBarChart,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Tags,
  Target,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import LogoutButton from "./LogoutButton";

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

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface px-4 py-6 transition-transform duration-200 md:translate-x-0 md:transition-[width] md:duration-150 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "md:w-20 md:px-2" : "md:w-64 md:px-4"}`}
    >
      <div
        className={`mb-8 flex items-center justify-between gap-2 px-2 ${
          collapsed ? "md:flex-col md:justify-center" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white">
            <Logo size={20} />
          </div>
          <span
            className={`text-lg font-semibold tracking-tight ${collapsed ? "md:hidden" : ""}`}
          >
            Rumo
            <span className="bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
              Fin
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:flex"
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
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
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  collapsed ? "md:justify-center md:px-0" : ""
                } ${
                  parentActive
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className={collapsed ? "md:hidden" : ""}>
                  {item.label}
                </span>
              </Link>

              {item.children && expanded && (
                <div
                  className={`mt-1 ml-4 flex flex-col gap-1 border-l border-border pl-3 ${
                    collapsed ? "md:hidden" : ""
                  }`}
                >
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const active = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onCloseMobile}
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

      <div className="border-t border-border pt-2">
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
