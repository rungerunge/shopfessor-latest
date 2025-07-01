/*
  Warnings:

  - You are about to drop the column `userId` on the `coupon_usages` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `one_time_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `usage_charges` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_activities` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[couponId,shop]` on the table `coupon_usages` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "coupon_usages" DROP CONSTRAINT "coupon_usages_userId_fkey";

-- DropForeignKey
ALTER TABLE "one_time_purchases" DROP CONSTRAINT "one_time_purchases_userId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "usage_charges" DROP CONSTRAINT "usage_charges_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_activities" DROP CONSTRAINT "user_activities_userId_fkey";

-- DropIndex
DROP INDEX "coupon_usages_couponId_userId_shop_key";

-- AlterTable
ALTER TABLE "coupon_usages" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "one_time_purchases" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "usage_charges" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "user_activities" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "customer_tokens" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_verifiers" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_verifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_account_urls" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_account_urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_tokens_conversationId_idx" ON "customer_tokens"("conversationId");

-- CreateIndex
CREATE INDEX "customer_tokens_expiresAt_idx" ON "customer_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "code_verifiers_state_key" ON "code_verifiers"("state");

-- CreateIndex
CREATE INDEX "code_verifiers_state_idx" ON "code_verifiers"("state");

-- CreateIndex
CREATE INDEX "code_verifiers_expiresAt_idx" ON "code_verifiers"("expiresAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_account_urls_conversationId_key" ON "customer_account_urls"("conversationId");

-- CreateIndex
CREATE INDEX "customer_account_urls_conversationId_idx" ON "customer_account_urls"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usages_couponId_shop_key" ON "coupon_usages"("couponId", "shop");

-- AddForeignKey
ALTER TABLE "customer_tokens" ADD CONSTRAINT "customer_tokens_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_account_urls" ADD CONSTRAINT "customer_account_urls_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
