"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      title={collapsed ? "Sair" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-negative-soft hover:text-negative disabled:opacity-60 ${
        collapsed ? "md:justify-center md:px-0" : ""
      }`}
    >
      <LogOut size={18} className="shrink-0" />
      <span className={collapsed ? "md:hidden" : ""}>Sair</span>
    </button>
  );
}
