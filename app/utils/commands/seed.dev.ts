import { CouponType } from "@prisma/client";
import { plansConfig } from "./plans.js";
import prisma from "app/lib/db.server.js";

async function main() {
  console.log("Seeding plans data...");

  /**
   * Seed plans data
   */
  for (const planConfig of plansConfig) {
    // Calculate yearly price and discount if subscription billing is available
    let yearlyPrice = null;
    let yearlyDiscount = null;

    if (planConfig.subscription?.annual) {
      yearlyPrice = planConfig.subscription.annual;
      yearlyDiscount = planConfig.subscription.yearlyDiscount
        ? planConfig.subscription.yearlyDiscount / 100 // Convert percentage to decimal
        : null;
    }

    await prisma.plan.create({
      data: {
        name: planConfig.name,
        description: planConfig.description,
        features: planConfig.features,

        // One-time pricing
        oneTimePrice: planConfig.oneTime?.price || null,

        // Subscription pricing
        monthlyPrice: planConfig.subscription?.monthly || null,
        yearlyPrice: yearlyPrice,
        yearlyDiscount: yearlyDiscount,

        // Usage-based pricing
        usagePrice: planConfig.usage?.pricePerUnit || null,
        usageCap: planConfig.usage?.cappedAmount || null,
        usageTerms: planConfig.usage?.terms || null,

        // Plan settings
        isFeatured: planConfig.isFeatured || false,
        isFree: planConfig.isFree || false,
        trialDays: planConfig.trialDays || 0,
        credits: planConfig.credits || null,
        isActive: planConfig.isActive !== false, // Default to true unless explicitly false
      },
    });

    console.log(`✓ Created plan: ${planConfig.name}`);
  }

  /**
   * Seed coupons data
   */
  console.log("Seeding coupons data...");

  const plans = await prisma.plan.findMany();
  const planIds = plans.map((plan) => plan.id);

  // Create sample coupons
  await prisma.coupon.create({
    data: {
      name: "$10 Fixed Discount",
      code: "SAVE10",
      type: CouponType.FIXED,
      discountAmount: 10.0,
      applicablePlans: planIds,
      usageLimit: 100,
      shopUsageLimit: 1,
      allowOneTime: true,
      allowSubscription: true,
      allowUsageBased: false,
      yearlyApplicable: false,
      active: true,
      durationLimit: 1,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  });

  await prisma.coupon.create({
    data: {
      name: "20% Percentage Discount",
      code: "SAVE20",
      type: CouponType.PERCENTAGE,
      percentage: 20.0, // Store as whole number (20%)
      applicablePlans: planIds,
      usageLimit: 50,
      shopUsageLimit: 1,
      allowOneTime: true,
      allowSubscription: true,
      allowUsageBased: false,
      yearlyApplicable: true,
      active: true,
      durationLimit: 1,
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    },
  });

  // Create a special coupon for new users
  await prisma.coupon.create({
    data: {
      name: "New User Welcome",
      code: "WELCOME50",
      type: CouponType.PERCENTAGE,
      percentage: 50.0,
      applicablePlans: planIds.filter((_, index) => index > 0), // Exclude first plan (Free)
      usageLimit: 1000,
      shopUsageLimit: 1,
      allowOneTime: true,
      allowSubscription: true,
      allowUsageBased: true,
      yearlyApplicable: false,
      active: true,
      durationLimit: 3, // Can be used for 3 billing cycles
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
    },
  });

  // Create a usage-based specific coupon
  await prisma.coupon.create({
    data: {
      name: "Usage Credit Bonus",
      code: "USAGE25",
      type: CouponType.FIXED,
      discountAmount: 25.0,
      applicablePlans: planIds,
      usageLimit: 200,
      shopUsageLimit: 2,
      allowOneTime: false,
      allowSubscription: false,
      allowUsageBased: true,
      yearlyApplicable: false,
      active: true,
      durationLimit: 1,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 2 months from now
    },
  });

  console.log("✓ Created coupons");
  console.log("Database seeding completed successfully!");

  // Log summary
  const planCount = await prisma.plan.count();
  const couponCount = await prisma.coupon.count();
  console.log(`\nSummary:`);
  console.log(`- Plans created: ${planCount}`);
  console.log(`- Coupons created: ${couponCount}`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
