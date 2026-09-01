-- CreateTable
CREATE TABLE "MonthlyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "rendaPlanejada" DECIMAL(12,2) NOT NULL,
    "percentualEssencial" DECIMAL(5,2) NOT NULL,
    "percentualPessoal" DECIMAL(5,2) NOT NULL,
    "percentualReserva" DECIMAL(5,2) NOT NULL,
    "percentualInvestimento" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "MonthlyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPlan_userId_mes_ano_key" ON "MonthlyPlan"("userId", "mes", "ano");

-- CreateIndex
CREATE INDEX "MonthlyPlan_userId_idx" ON "MonthlyPlan"("userId");

-- AddForeignKey
ALTER TABLE "MonthlyPlan" ADD CONSTRAINT "MonthlyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, consistent with every other user-owned table.
ALTER TABLE "public"."MonthlyPlan" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own monthly plans" ON "public"."MonthlyPlan"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));
