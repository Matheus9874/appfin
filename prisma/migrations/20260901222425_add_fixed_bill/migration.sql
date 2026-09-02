-- CreateEnum
CREATE TYPE "FixedBillMatchStatus" AS ENUM ('AUTOMATICO', 'MANUAL', 'NAO_ENCONTRADA');

-- CreateTable
CREATE TABLE "FixedBill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorEsperado" DECIMAL(12,2) NOT NULL,
    "valorMin" DECIMAL(12,2) NOT NULL,
    "valorMax" DECIMAL(12,2) NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "FixedBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedBillMatch" (
    "id" TEXT NOT NULL,
    "fixedBillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "transactionId" TEXT,
    "status" "FixedBillMatchStatus" NOT NULL,

    CONSTRAINT "FixedBillMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedBill_userId_idx" ON "FixedBill"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedBillMatch_transactionId_key" ON "FixedBillMatch"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedBillMatch_fixedBillId_mes_ano_key" ON "FixedBillMatch"("fixedBillId", "mes", "ano");

-- CreateIndex
CREATE INDEX "FixedBillMatch_userId_idx" ON "FixedBillMatch"("userId");

-- AddForeignKey
ALTER TABLE "FixedBill" ADD CONSTRAINT "FixedBill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedBill" ADD CONSTRAINT "FixedBill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedBillMatch" ADD CONSTRAINT "FixedBillMatch_fixedBillId_fkey" FOREIGN KEY ("fixedBillId") REFERENCES "FixedBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedBillMatch" ADD CONSTRAINT "FixedBillMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedBillMatch" ADD CONSTRAINT "FixedBillMatch_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security, consistent with every other user-owned table.
ALTER TABLE "public"."FixedBill" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own fixed bills" ON "public"."FixedBill"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));

ALTER TABLE "public"."FixedBillMatch" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own fixed bill matches" ON "public"."FixedBillMatch"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));
