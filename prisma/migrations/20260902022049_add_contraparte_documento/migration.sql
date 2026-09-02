-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "contraparteDocumento" TEXT;

-- AlterTable
ALTER TABLE "FixedBill" ADD COLUMN "documentosAprendidos" TEXT[] NOT NULL DEFAULT '{}';
