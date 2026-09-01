-- CreateEnum
CREATE TYPE "OrigemTransacao" AS ENUM ('MANUAL', 'PLUGGY');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "origem" "OrigemTransacao" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Transaction" ADD COLUMN "pluggyTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_pluggyTransactionId_key" ON "Transaction"("pluggyTransactionId");

-- CreateTable
CREATE TABLE "PluggyItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pluggyItemId" TEXT NOT NULL,
    "connectorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "PluggyItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PluggyItem_pluggyItemId_key" ON "PluggyItem"("pluggyItemId");

-- CreateIndex
CREATE INDEX "PluggyItem_userId_idx" ON "PluggyItem"("userId");

-- AddForeignKey
ALTER TABLE "PluggyItem" ADD CONSTRAINT "PluggyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, consistent with every other user-owned table.
ALTER TABLE "public"."PluggyItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pluggy items" ON "public"."PluggyItem"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));
