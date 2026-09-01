-- CreateEnum
CREATE TYPE "MeioPagamento" AS ENUM ('PIX', 'DEBITO', 'CREDITO', 'TED', 'DOC', 'BOLETO', 'OUTRO');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "meioPagamento" "MeioPagamento";
