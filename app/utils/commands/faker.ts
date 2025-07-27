import { faker } from "@faker-js/faker";
import { Coupon, Plan, User } from "@prisma/client";
import prisma from "app/lib/db.server.js";

const USERS_TO_CREATE = 22;
const SHOPS_PER_USER = 2;
const PLANS_TO_CREATE = 3;
const COUPONS_TO_CREATE = 8;
const ACTIVITIES_PER_SHOP = 7;

function generateRecentDate(baseDate = new Date()) {
  const sixMonthsAgo = new Date(baseDate);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return faker.date.between({ from: sixMonthsAgo, to: baseDate });
}

async function clearDatabase() {
  await prisma.userActivity.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.charge.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.session.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
}

async function createPlans() {
  const plans = [];
  const features = [
    "Unlimited Products",
    "Priority Support",
    "Advanced Analytics",
    "Custom Domain",
    "API Access",
    "Email Marketing",
    "Abandoned Cart Recovery",
  ];

  const baseDate = new Date();

  for (let i = 0; i < PLANS_TO_CREATE; i++) {
    const createdAt = generateRecentDate(baseDate);
    const monthlyPrice = faker.number.float({
      min: 29,
      max: 299,
      fractionDigits: 2,
    });

    const plan = await prisma.plan.create({
      data: {
        name: `${faker.company.buzzNoun()} Plan`,
        description: faker.company.catchPhrase(),
        features: features.filter(() => Math.random() > 0.5),
        monthlyPrice: monthlyPrice,
        annualPrice: monthlyPrice * 12,
        annualMonthlyPrice: monthlyPrice * 0.8,
        currencySymbol: "$",
        currencyCode: "USD",
        isFeatured: faker.datatype.boolean(),
        isFree: i === 0,
        trialDays: faker.number.int({ min: 0, max: 30 }),
        credits: faker.number.int({ min: 100, max: 1000 }),
        cappedAmount: faker.number.float({
          min: 50,
          max: 500,
          fractionDigits: 2,
        }),
        terms: faker.lorem.paragraph(),
        createdAt: createdAt,
        updatedAt: generateRecentDate(createdAt),
      },
    });
    plans.push(plan);
  }
  return plans;
}

async function createCoupons() {
  const coupons = [];
  const baseDate = new Date();

  for (let i = 0; i < COUPONS_TO_CREATE; i++) {
    const createdAt = generateRecentDate(baseDate);
    const isCouponTypeFixed = faker.datatype.boolean();

    const coupon = await prisma.coupon.create({
      data: {
        name: `${faker.commerce.productAdjective()} Discount`,
        code: faker.string.alphanumeric(8).toUpperCase(),
        discountAmount: isCouponTypeFixed
          ? faker.number.float({ min: 10, max: 100, fractionDigits: 2 })
          : null,
        percentage: !isCouponTypeFixed
          ? faker.number.float({ min: 5, max: 50, fractionDigits: 2 })
          : null,
        usageLimit: faker.number.int({ min: 10, max: 1000 }),
        shopUsageLimit: faker.number.int({ min: 1, max: 5 }),
        expiresAt: faker.date.future(),
        applicablePlans: ["ALL"],
        active: faker.datatype.boolean(),
        type: isCouponTypeFixed ? "FIXED" : "PERCENTAGE",
        durationLimit: faker.number.int({ min: 1, max: 12 }),
        createdAt: createdAt,
        updatedAt: generateRecentDate(createdAt),
      },
    });
    coupons.push(coupon);
  }
  return coupons;
}

async function createUsers() {
  const users = [];
  const baseDate = new Date();

  const superAdminCreatedAt = generateRecentDate(baseDate);
  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      firstName: "Super",
      lastName: "Admin",
      emailVerifiedAt: generateRecentDate(superAdminCreatedAt),
      role: "SUPER_ADMIN",
      createdAt: superAdminCreatedAt,
      updatedAt: generateRecentDate(superAdminCreatedAt),
    },
  });
  users.push(superAdmin);

  for (let i = 0; i < USERS_TO_CREATE; i++) {
    const userCreatedAt = generateRecentDate(baseDate);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const user = await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName, lastName }),
        firstName: firstName,
        lastName: lastName,
        emailVerifiedAt: generateRecentDate(userCreatedAt),
        role: "USER",
        createdAt: userCreatedAt,
        updatedAt: generateRecentDate(userCreatedAt),
      },
    });
    users.push(user);
  }
  return users;
}

async function createShopsAndRelatedData(
  users: User[],
  plans: Plan[],
  coupons: Coupon[],
) {
  for (const user of users) {
    for (let i = 0; i < SHOPS_PER_USER; i++) {
      const shopCreatedAt = user.createdAt;
      const shop = await prisma.shop.create({
        data: {
          shop: faker.internet.domainName(),
          isActive: faker.datatype.boolean(),
          user: {
            connect: { id: user.id },
          },
          shopData: {
            domain: faker.internet.domainName(),
            email: faker.internet.email(),
            country: faker.location.country(),
            currency: "USD",
          },
          settings: {
            timezone: faker.location.timeZone(),
            notifications: true,
            language: "en",
          },
          createdAt: shopCreatedAt,
          updatedAt: generateRecentDate(shopCreatedAt),
        },
      });

      await prisma.session.create({
        data: {
          shop: shop.shop,
          state: faker.string.alphanumeric(16),
          isOnline: true,
          scope: "read_products,write_products",
          expires: faker.date.future(),
          accessToken: faker.string.alphanumeric(64),
          userId: user.id,
        },
      });

      await prisma.subscription.create({
        data: {
          plan: {
            connect: { id: plans[0].id },
          },
          shop: {
            connect: { id: shop.id },
          },
          startDate: generateRecentDate(shopCreatedAt),
          endDate: faker.date.future(),
          status: faker.helpers.arrayElement([
            "ACTIVE",
            "CANCELLED",
            "EXPIRED",
          ]),
          cappedAmount: faker.number.float({
            min: 50,
            max: 500,
            fractionDigits: 2,
          }),
          shopifySubscriptionId: BigInt(
            faker.number.int({ min: 1000000, max: 9999999 }),
          ),
          interval: faker.helpers.arrayElement(["MONTHLY", "ANNUAL"]),
          createdAt: generateRecentDate(shopCreatedAt),
          updatedAt: generateRecentDate(shopCreatedAt),
        },
      });

      const chargeCount = faker.number.int({ min: 1, max: 5 });
      for (let j = 0; j < chargeCount; j++) {
        const selectedPlan = faker.helpers.arrayElement(plans);
        const chargeCreatedAt = generateRecentDate(shop.createdAt);
        await prisma.charge.create({
          data: {
            usageChargeId: faker.number
              .int({ min: 1000000, max: 9999999 })
              .toString(),
            status: faker.helpers.arrayElement([
              "PENDING",
              "COMPLETED",
              "FAILED",
            ]),
            name: selectedPlan.name,
            type: faker.helpers.arrayElement(["ONE_TIME", "RECURRING"]),
            price: selectedPlan.monthlyPrice,
            currency: "USD",
            planId: selectedPlan.id,
            billingOn: faker.date.future(),
            activatedOn: generateRecentDate(chargeCreatedAt),
            trialDays: selectedPlan.trialDays,
            trialEndsOn: faker.date.future(),
            cancelledOn: faker.datatype.boolean()
              ? generateRecentDate(chargeCreatedAt)
              : null,
            createdAt: chargeCreatedAt,
            updatedAt: generateRecentDate(chargeCreatedAt),
          },
        });
      }

      for (let k = 0; k < ACTIVITIES_PER_SHOP; k++) {
        const activityCreatedAt = generateRecentDate(shop.createdAt);
        await prisma.userActivity.create({
          data: {
            activityType: faker.helpers.arrayElement([
              "LOGIN",
              "SETTINGS_UPDATE",
              "UNINSTALL",
              "billing",
            ]),
            title: faker.lorem.sentence(),
            details: faker.lorem.paragraph(),
            ipAddress: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
            location: faker.location.city(),
            domain: shop.shop,
            createdAt: activityCreatedAt,
            updatedAt: generateRecentDate(activityCreatedAt),
          },
        });
      }
    }
  }
}

async function seedDatabase() {
  try {
    console.log("🌱 Starting seeding process...");

    await clearDatabase();

    console.log("Creating plans...");
    const plans = await createPlans();

    console.log("Creating coupons...");
    const coupons = await createCoupons();

    console.log("Creating users...");
    const users = await createUsers();

    console.log("Creating shops and related data...");
    await createShopsAndRelatedData(users, plans, coupons);

    console.log("✅ Seeding completed successfully!");

    return {
      usersCreated: users.length,
      plansCreated: plans.length,
      couponsCreated: coupons.length,
      shopsCreated: users.length * SHOPS_PER_USER,
    };
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedDatabase()
  .then((results) => {
    console.log("📊 Seeding results:", results);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
