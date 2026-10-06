-- lastVisited should be NULL until the first visit
ALTER TABLE "urlMapping" ALTER COLUMN "lastVisited" DROP DEFAULT;

-- Remove duplicate (longUrl, redirectType) rows, keeping the oldest, so the unique index can be created
DELETE FROM "urlMapping" a
USING "urlMapping" b
WHERE a."longUrl" = b."longUrl"
  AND a."redirectType" = b."redirectType"
  AND a."id" > b."id";

-- CreateIndex
CREATE UNIQUE INDEX "urlMapping_longUrl_redirectType_key" ON "urlMapping"("longUrl", "redirectType");
