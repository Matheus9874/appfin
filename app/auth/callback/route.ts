import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * `request.url` inside this route handler doesn't reflect the actual Host
 * the browser connected to (it resolves to `localhost:<port>` regardless),
 * so the redirect target must be built from the Host/X-Forwarded-Host
 * headers instead — otherwise clients on a LAN IP get bounced to localhost.
 */
function resolveOrigin(request: Request): string {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const protocol =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const origin = resolveOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destino = new URL(next, origin);
      // Lets the app know this page load follows a fresh login, so it can
      // show the onboarding tutorial — see AppShell.tsx.
      destino.searchParams.set("justLoggedIn", "1");
      return NextResponse.redirect(destino);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
