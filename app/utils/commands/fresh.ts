import prisma from "app/lib/db.server";

async function main() {
  console.log("Freshing database...");
  await prisma.$queryRaw`TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;`;
  await prisma.$queryRaw`TRUNCATE TABLE "plans" RESTART IDENTITY CASCADE;`;
  await prisma.$queryRaw`TRUNCATE TABLE "sessions" RESTART IDENTITY CASCADE;`;
  await prisma.$queryRaw`TRUNCATE TABLE "shops" RESTART IDENTITY CASCADE;`;
  await prisma.$queryRaw`TRUNCATE TABLE "coupon_usages" RESTART IDENTITY CASCADE;`;
  await prisma.$queryRaw`TRUNCATE TABLE "coupons" RESTART IDENTITY CASCADE;`;
  await prisma.$queryRaw`TRUNCATE TABLE "subscriptions" RESTART IDENTITY CASCADE;`;
  await prisma.$queryRaw`TRUNCATE TABLE "one_time_purchases" RESTART IDENTITY CASCADE;`;
  await prisma.$queryRaw`TRUNCATE TABLE "usage_charges" RESTART IDENTITY CASCADE;`;
  await prisma.$queryRaw`TRUNCATE TABLE "user_activities" RESTART IDENTITY CASCADE;`;
  console.log("Freshed database!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
