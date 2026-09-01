-- CreateEnum
CREATE TYPE "PluggyAccountType" AS ENUM ('BANK', 'CREDIT');

-- CreateTable
CREATE TABLE "PluggyAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pluggyItemId" TEXT NOT NULL,
    "pluggyAccountId" TEXT NOT NULL,
    "tipo" "PluggyAccountType" NOT NULL,
    "nome" TEXT NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluggyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PluggyAccount_pluggyAccountId_key" ON "PluggyAccount"("pluggyAccountId");

-- CreateIndex
CREATE INDEX "PluggyAccount_userId_idx" ON "PluggyAccount"("userId");

-- AddForeignKey
ALTER TABLE "PluggyAccount" ADD CONSTRAINT "PluggyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluggyAccount" ADD CONSTRAINT "PluggyAccount_pluggyItemId_fkey" FOREIGN KEY ("pluggyItemId") REFERENCES "PluggyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security, consistent with every other user-owned table.
ALTER TABLE "public"."PluggyAccount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pluggy accounts" ON "public"."PluggyAccount"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));
