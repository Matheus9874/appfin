-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "pluggyItemId" TEXT;

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN "pluggyItemId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_pluggyItemId_fkey" FOREIGN KEY ("pluggyItemId") REFERENCES "PluggyItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_pluggyItemId_fkey" FOREIGN KEY ("pluggyItemId") REFERENCES "PluggyItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
