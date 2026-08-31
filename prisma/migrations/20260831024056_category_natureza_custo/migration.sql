-- CreateEnum
CREATE TYPE "NaturezaCusto" AS ENUM ('FIXO', 'VARIAVEL');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "natureza" "NaturezaCusto";

-- Backfill existing DESPESA categories with a sensible default classification.
-- Any DESPESA category not in the "fixed" list below falls back to VARIAVEL.
UPDATE "Category"
SET "natureza" = CASE
  WHEN "nome" IN (
    'Assinaturas',
    'Carro',
    'Condomínio',
    'Financiamento/Aluguel',
    'Internet',
    'Moradia',
    'Seguro',
    'Telefone',
    'Educação'
  ) THEN 'FIXO'::"NaturezaCusto"
  ELSE 'VARIAVEL'::"NaturezaCusto"
END
WHERE "tipo" = 'DESPESA';
