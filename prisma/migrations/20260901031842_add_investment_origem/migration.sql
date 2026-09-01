-- AlterTable
ALTER TABLE "Investment" ADD COLUMN "origem" "OrigemTransacao" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Investment" ADD COLUMN "pluggyInvestmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Investment_pluggyInvestmentId_key" ON "Investment"("pluggyInvestmentId");
