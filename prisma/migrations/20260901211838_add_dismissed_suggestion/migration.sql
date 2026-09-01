-- CreateTable
CREATE TABLE "DismissedSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DismissedSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DismissedSuggestion_userId_chave_key" ON "DismissedSuggestion"("userId", "chave");

-- CreateIndex
CREATE INDEX "DismissedSuggestion_userId_idx" ON "DismissedSuggestion"("userId");

-- AddForeignKey
ALTER TABLE "DismissedSuggestion" ADD CONSTRAINT "DismissedSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, consistent with every other user-owned table.
ALTER TABLE "public"."DismissedSuggestion" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dismissed suggestions" ON "public"."DismissedSuggestion"
  FOR ALL
  USING ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()))
  WITH CHECK ("userId" IN (SELECT id FROM "public"."User" WHERE email = auth.email()));
