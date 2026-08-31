-- Enable Row Level Security on all app tables and restrict access so an
-- authenticated Supabase user can only read/write rows that belong to them.
--
-- Context: Prisma connects through the "postgres" role (BYPASSRLS = true),
-- so these policies do NOT affect the app's own server-side queries at all
-- — the app already enforces per-user access in application code. What this
-- closes is direct access to the database via Supabase's PostgREST API
-- using the public NEXT_PUBLIC_SUPABASE_ANON_KEY: today the "anon" and
-- "authenticated" roles hold full SELECT/INSERT/UPDATE/DELETE grants on
-- these tables with no RLS, meaning anyone with the (public) anon key could
-- read or modify any user's data directly, bypassing the app entirely.
--
-- "User.id" is a Prisma-generated cuid, unrelated to Supabase's
-- auth.uid() (a uuid), so ownership can't be checked by comparing the two
-- directly. Instead, policies resolve the current session to a User row via
-- auth.email() = "User".email (the same lookup app code already uses in
-- getCurrentUserId()), then scope child tables by that User's id.

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Investment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Goal" ENABLE ROW LEVEL SECURITY;

-- User: a signed-in user may read/update their own row. Insert/delete are
-- intentionally left unpoliced (and therefore blocked for anon/authenticated)
-- since only the server (via Prisma, which bypasses RLS) creates User rows.
CREATE POLICY "Users can view own row" ON "public"."User"
  FOR SELECT
  USING (email = auth.email());

CREATE POLICY "Users can update own row" ON "public"."User"
  FOR UPDATE
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

-- Transaction / Category / Investment / Goal: full CRUD, but only on rows
-- whose userId belongs to the current session's User row.
CREATE POLICY "Users can manage own transactions" ON "public"."Transaction"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));

CREATE POLICY "Users can manage own categories" ON "public"."Category"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));

CREATE POLICY "Users can manage own investments" ON "public"."Investment"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));

CREATE POLICY "Users can manage own goals" ON "public"."Goal"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));
