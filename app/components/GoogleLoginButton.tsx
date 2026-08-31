"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleLoginButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setIsLoading(false);
      alert("Não foi possível iniciar o login com Google. Tente novamente.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={isLoading}
      className={className}
    >
      {children}
    </button>
  );
}
