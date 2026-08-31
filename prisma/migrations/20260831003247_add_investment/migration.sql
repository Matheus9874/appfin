-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('POUPANCA', 'TESOURO_DIRETO', 'CDB', 'ACOES', 'FUNDOS', 'RESERVA_EMERGENCIA', 'OUTRO');

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "InvestmentType" NOT NULL,
    "instituicao" TEXT NOT NULL,
    "nome" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
