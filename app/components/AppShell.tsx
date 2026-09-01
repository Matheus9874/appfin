"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import OnboardingTutorial from "./OnboardingTutorial";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";

const STORAGE_KEY = "rumofin:sidebar-collapsed";
const ONBOARDING_STORAGE_KEY = "rumofin:onboarding-dismissed";

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("justLoggedIn")) return;

    params.delete("justLoggedIn");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : ""),
    );

    if (localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "1") {
      setTutorialOpen(true);
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function closeTutorial(dontShowAgain: boolean) {
    setTutorialOpen(false);
    if (dontShowAgain) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    }
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenTutorial={() => setTutorialOpen(true)}
      />

      {tutorialOpen && <OnboardingTutorial onClose={closeTutorial} />}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`flex min-h-screen flex-col transition-[padding-left] duration-150 ${
          collapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="hidden md:block" />
          <ThemeToggle />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </>
  );
}
