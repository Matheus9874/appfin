-- AlterTable: Category becomes per-user. Add nullable column first so
-- existing rows can be backfilled before making it required.
ALTER TABLE "Category" ADD COLUMN "userId" TEXT;

-- Backfill existing categories to the single pre-existing user account.
UPDATE "Category" SET "userId" = (SELECT "id" FROM "User" ORDER BY "id" LIMIT 1);

-- AlterTable: now safe to enforce NOT NULL
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;

-- DropIndex (old global uniqueness on nome+tipo)
DROP INDEX "Category_nome_tipo_key";

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_nome_tipo_key" ON "Category"("userId", "nome", "tipo");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
