import prisma from "app/lib/db.server.js";
import { plansData } from "./plans.js";

async function main() {
  console.log("Seeding plans data...");
  for (const plan of plansData) {
    await prisma.plan.create({
      data: {
        name: plan.name,
        description: plan.description,
        features: plan.features,
        monthlyPrice: plan.pricing.monthly,
        yearlyDiscount: 0.2,
        isFeatured: plan.isFeatured,
        isFree: plan.isFree,
        trialDays: plan.trialDays,
        credits: plan.credits,
      },
    });
  }
  console.log("Plans data seeded.");
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
