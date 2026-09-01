-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "natureza" "NaturezaCusto";

-- Backfill: natureza now lives per-transaction instead of per-category, so
-- each Transaction is allowed its own Fixo/Variável classification.
-- Existing MANUAL transactions keep behaving exactly as before by inheriting
-- their category's current natureza. PLUGGY-imported transactions are left
-- NULL on purpose (they used to inherit "VARIAVEL" from their auto-created
-- category, which was wrong) so they show up under "Não classificadas" for
-- the user to review.
UPDATE "Transaction" t
SET "natureza" = c."natureza"
FROM "Category" c
WHERE t."categoryId" = c.id AND t."origem" = 'MANUAL';
