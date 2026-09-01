-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, consistent with every other user-owned table (see the
-- enable_row_level_security migration): Prisma connects as "postgres"
-- (BYPASSRLS), so this doesn't affect the app's own queries — it only closes
-- direct PostgREST access via the public anon key.
ALTER TABLE "public"."ChatMessage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat messages" ON "public"."ChatMessage"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));
