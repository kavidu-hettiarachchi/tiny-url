-- CreateEnum
CREATE TYPE "RedirectType" AS ENUM ('PERMANENTLY', 'TEMPORARILY');

-- CreateTable
CREATE TABLE "urlMapping" (
    "id" SERIAL NOT NULL,
    "longUrl" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisited" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "redirectType" "RedirectType" NOT NULL DEFAULT 'TEMPORARILY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "urlMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "urlMapping_shortCode_key" ON "urlMapping"("shortCode");
