-- AlterTable: substitui a coluna única "textoAprendido" por um array
-- "textosAprendidos", preservando o valor já aprendido de cada conta como
-- primeiro elemento da lista.
ALTER TABLE "FixedBill" ADD COLUMN "textosAprendidos" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "FixedBill"
SET "textosAprendidos" = ARRAY["textoAprendido"]
WHERE "textoAprendido" IS NOT NULL;

ALTER TABLE "FixedBill" DROP COLUMN "textoAprendido";
