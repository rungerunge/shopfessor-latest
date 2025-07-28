/*
  Warnings:

  - You are about to drop the `coupon_usages` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "coupon_usages" DROP CONSTRAINT "coupon_usages_couponId_fkey";

-- DropForeignKey
ALTER TABLE "coupon_usages" DROP CONSTRAINT "coupon_usages_oneTimePurchaseId_fkey";

-- DropForeignKey
ALTER TABLE "coupon_usages" DROP CONSTRAINT "coupon_usages_shop_fkey";

-- DropForeignKey
ALTER TABLE "coupon_usages" DROP CONSTRAINT "coupon_usages_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "coupon_usages" DROP CONSTRAINT "coupon_usages_usageChargeId_fkey";

-- DropTable
DROP TABLE "coupon_usages";
