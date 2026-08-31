import Link from "next/link";
import AppleIcon from "@/app/components/AppleIcon";
import FacebookIcon from "@/app/components/FacebookIcon";
import GoogleIcon from "@/app/components/GoogleIcon";
import GoogleLoginButton from "@/app/components/GoogleLoginButton";
import Logo from "@/app/components/Logo";

const buttonBaseClass =
  "flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-foreground">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white">
          <Logo size={20} />
        </div>
        <span className="text-lg font-semibold tracking-tight">
          Rumo
          <span className="bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
            Fin
          </span>
        </span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
          <p className="mt-1 text-sm text-muted">
            Escolha uma forma de continuar
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <GoogleLoginButton
            className={`${buttonBaseClass} border-border bg-background text-foreground hover:bg-surface-hover`}
          >
            <GoogleIcon size={18} />
            Continuar com Google
          </GoogleLoginButton>

          <button
            type="button"
            disabled
            title="Em breve"
            className={`${buttonBaseClass} cursor-not-allowed border-border bg-background text-muted opacity-60`}
          >
            <FacebookIcon size={18} />
            Continuar com Facebook
            <span className="text-xs text-muted">(em breve)</span>
          </button>

          <button
            type="button"
            disabled
            title="Em breve"
            className={`${buttonBaseClass} cursor-not-allowed border-border bg-background text-muted opacity-60`}
          >
            <AppleIcon size={18} />
            Continuar com Apple
            <span className="text-xs text-muted">(em breve)</span>
          </button>
        </div>
      </div>

      <Link
        href="/"
        className="mt-6 text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Voltar para a página inicial
      </Link>
    </div>
  );
}
