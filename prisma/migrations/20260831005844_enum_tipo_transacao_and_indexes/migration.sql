-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('RECEITA', 'DESPESA');

-- AlterTable: Category.tipo (String -> TipoTransacao), migrating existing data
ALTER TABLE "Category" ALTER COLUMN "tipo" TYPE "TipoTransacao" USING (
  CASE "tipo"
    WHEN 'receita' THEN 'RECEITA'
    WHEN 'despesa' THEN 'DESPESA'
    ELSE upper("tipo")::"TipoTransacao"
  END
);

-- AlterTable: Transaction.tipo (String -> TipoTransacao), migrating existing data
ALTER TABLE "Transaction" ALTER COLUMN "tipo" TYPE "TipoTransacao" USING (
  CASE "tipo"
    WHEN 'receita' THEN 'RECEITA'
    WHEN 'despesa' THEN 'DESPESA'
    ELSE upper("tipo")::"TipoTransacao"
  END
);

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");
