import prisma from "app/lib/db.server";
import type { Plan } from "app/types/billing";
import {
  CREATE_USAGE_RECORD,
  CREATE_USAGE_SUBSCRIPTION,
} from "app/graphql/billing";
import { getCurrentSubscriptions } from "app/services/billing/billing.server";
import logger from "app/utils/logger";

export async function getCurrentShop(shop: string) {
  return await prisma.shop.findFirst({
    where: { shop },
  });
}

export async function getActivePlans() {
  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      monthlyPrice: true,
      features: true,
      isFeatured: true,
    },
    orderBy: [{ isFeatured: "desc" }, { monthlyPrice: "asc" }],
  });

  return plans.map((plan) => transformPlan(plan));
}

function transformPlan(plan: any): Plan {
  let usageData = {
    recurringAmount: Number(plan.monthlyPrice),
    usageCappedAmount: 100.0,
    perUnitPrice: 0.1,
    usageTerms: "$0.10 per API call up to $100/month",
  };

  if (Number(plan.monthlyPrice) >= 30) {
    usageData = {
      recurringAmount: Number(plan.monthlyPrice),
      usageCappedAmount: 500.0,
      perUnitPrice: 0.08,
      usageTerms: "$0.08 per API call up to $500/month",
    };
  }
  if (Number(plan.monthlyPrice) >= 100) {
    usageData = {
      recurringAmount: Number(plan.monthlyPrice),
      usageCappedAmount: 2000.0,
      perUnitPrice: 0.05,
      usageTerms: "$0.05 per API call up to $2000/month",
    };
  }

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPrice: Number(plan.monthlyPrice),
    features: plan.features,
    isFeatured: plan.isFeatured,
    ...usageData,
  };
}

export async function getUsageRecords(
  shopId: string,
  page: number,
  pageSize: number,
) {
  const [records, total] = await Promise.all([
    prisma.usageCharge.findMany({
      where: {
        shopId,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        description: true,
        price: true,
        quantity: true,
        currency: true,
        createdAt: true,
        shopifyId: true,
      },
    }),
    prisma.usageCharge.count({
      where: {
        shopId,
      },
    }),
  ]);

  return {
    records,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getMonthlyUsage(shopId: string, subscriptionId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyUsageData = await prisma.usageCharge.aggregate({
    where: {
      shopId,
      // subscriptionId,
      // createdAt: {
      //   gte: startOfMonth,
      // },
    },
    _sum: {
      price: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    totalAmount: Number(monthlyUsageData._sum.price || 0),
    recordCount: monthlyUsageData._count.id,
  };
}

export async function createUsageRecord(data: {
  description: string;
  amount: number;
  shopId: string;
  shopifyId: string;
}) {
  return await prisma.usageCharge.create({
    data: {
      description: data.description,
      price: data.amount,
      quantity: 1,
      currency: "USD",
      shopifyId: data.shopifyId,
      isTest: process.env.NODE_ENV !== "production",
      shopId: data.shopId,
      planId: null,
    },
  });
}

// New service functions for billing logic
export async function getSubscriptionData(request: Request, shop: any) {
  let currentSubscription = null;
  let usageLineItemId = null;
  let subscriptionData = {
    planName: null,
    status: null,
    cappedAmount: 0,
    cappedCurrency: "USD",
    recurringAmount: 0, // Keep for backward compatibility, but will be 0 for usage-only
    recurringCurrency: "USD", // Keep for backward compatibility
    usageTerms: null,
    currentPeriodEnd: null,
  };
  let monthlyUsage = {
    totalAmount: 0,
    recordCount: 0,
    cappedAmount: 0,
    isNearCap: false,
    isOverCap: false,
  };

  try {
    // Fetch current subscriptions
    const { subscriptions, errors } = await getCurrentSubscriptions(request);

    logger.info("🔴 All subscriptions: ", JSON.stringify(subscriptions));

    if (subscriptions.length > 0) {
      // Filter to find usage-based subscriptions only
      const usageSubscriptions = subscriptions.filter((subscription: any) =>
        subscription.lineItems.some(
          (item: any) =>
            item.plan.pricingDetails.__typename === "AppUsagePricing",
        ),
      );

      logger.info(
        "🟡 Usage-only subscriptions: ",
        JSON.stringify(usageSubscriptions),
      );

      if (usageSubscriptions.length > 0) {
        // Use the first usage-based subscription found
        currentSubscription = usageSubscriptions[0];

        subscriptionData.planName = currentSubscription.name;
        subscriptionData.status = currentSubscription.status;
        subscriptionData.currentPeriodEnd =
          currentSubscription.currentPeriodEnd;

        // Find the usage line item
        const usageLineItem = currentSubscription.lineItems.find(
          (item: any) =>
            item.plan.pricingDetails.__typename === "AppUsagePricing",
        );

        logger.info("🥬 Usage line item: ", JSON.stringify(usageLineItem));

        if (usageLineItem) {
          usageLineItemId = usageLineItem.id;
          subscriptionData.cappedAmount = parseFloat(
            usageLineItem.plan.pricingDetails.cappedAmount.amount,
          );
          subscriptionData.cappedCurrency =
            usageLineItem.plan.pricingDetails.cappedAmount.currencyCode;
          subscriptionData.usageTerms = usageLineItem.plan.pricingDetails.terms;
          monthlyUsage.cappedAmount = subscriptionData.cappedAmount;

          // Get monthly usage data
          const usageData = await getMonthlyUsage(
            shop.id,
            currentSubscription.id,
          );

          monthlyUsage.totalAmount = usageData.totalAmount;
          monthlyUsage.recordCount = usageData.recordCount;

          // Check cap status
          const usagePercentage =
            monthlyUsage.cappedAmount > 0
              ? (monthlyUsage.totalAmount / monthlyUsage.cappedAmount) * 100
              : 0;

          monthlyUsage.isNearCap = usagePercentage >= 80;
          monthlyUsage.isOverCap = usagePercentage >= 100;

          logger.info("📊 Usage summary: ", {
            totalAmount: monthlyUsage.totalAmount,
            cappedAmount: monthlyUsage.cappedAmount,
            usagePercentage: usagePercentage.toFixed(2) + "%",
            isNearCap: monthlyUsage.isNearCap,
            isOverCap: monthlyUsage.isOverCap,
          });
        } else {
          logger.info("⚠️ No usage line item found in subscription");
        }
      } else {
        logger.info(
          "⚠️ No usage-based subscriptions found. Available subscriptions have only recurring pricing.",
        );

        // Log details about non-usage subscriptions for debugging
        subscriptions.forEach((sub: any, index: number) => {
          const pricingTypes = sub.lineItems.map(
            (item: any) => item.plan.pricingDetails.__typename,
          );
          logger.info(
            `📋 Subscription ${index + 1} (${sub.name}): ${pricingTypes.join(", ")}`,
          );
        });
      }
    } else {
      logger.info("ℹ️ No subscriptions found");
    }
  } catch (error) {
    logger.error("❌ Error fetching subscription data:", error);
  }

  return {
    currentSubscription,
    usageLineItemId,
    subscriptionData,
    monthlyUsage,
  };
}

// Helper function to check if a subscription is usage-based
export function isUsageSubscription(subscription: any): boolean {
  return subscription.lineItems.some(
    (item: any) => item.plan.pricingDetails.__typename === "AppUsagePricing",
  );
}

// Helper function to get all usage subscriptions
export async function getUsageSubscriptions(request: Request) {
  const { subscriptions, errors } = await getCurrentSubscriptions(request);

  if (errors) {
    throw new Error(`Failed to fetch subscriptions: ${errors.join(", ")}`);
  }

  return subscriptions.filter(isUsageSubscription);
}

export async function createSubscription(
  admin: any,
  session: any,
  planId: string,
) {
  const selectedPlan = await prisma.plan.findUnique({
    where: {
      id: planId,
      isActive: true,
    },
  });

  if (!selectedPlan) {
    throw new Error("Invalid plan selected");
  }

  let usageData = {
    usageCappedAmount: 100.0,
    usageTerms: "$0.10 per API call up to $100/month",
  };

  if (Number(selectedPlan.monthlyPrice) >= 30) {
    usageData = {
      usageCappedAmount: 500.0,
      usageTerms: "$0.08 per API call up to $500/month",
    };
  }
  if (Number(selectedPlan.monthlyPrice) >= 100) {
    usageData = {
      usageCappedAmount: 2000.0,
      usageTerms: "$0.05 per API call up to $2000/month",
    };
  }

  const subscriptionInput = {
    name: selectedPlan.name,
    returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing`,
    usageTerms: usageData.usageTerms,
    usageCappedAmount: usageData.usageCappedAmount,
    usageCurrencyCode: "USD",
    recurringAmount: Number(selectedPlan.monthlyPrice),
    recurringCurrencyCode: "USD",
    test: process.env.NODE_ENV !== "production",
  };

  const response = await admin.graphql(CREATE_USAGE_SUBSCRIPTION, {
    variables: subscriptionInput,
  });

  const data = await response.json();

  if (data.data?.appSubscriptionCreate?.userErrors?.length > 0) {
    const errors = data.data.appSubscriptionCreate.userErrors;
    throw new Error(errors.map((err: any) => err.message).join(", "));
  }

  const confirmationUrl = data.data?.appSubscriptionCreate?.confirmationUrl;
  if (!confirmationUrl) {
    throw new Error("No confirmation URL received");
  }

  return confirmationUrl;
}

export async function createUsageRecordWithValidation(
  admin: any,
  shop: any,
  data: {
    description: string;
    amount: number;
    subscriptionLineItemId: string;
  },
) {
  const { description, amount, subscriptionLineItemId } = data;

  // Validate monthly cap
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyTotal = await prisma.usageCharge.aggregate({
    where: {
      shopId: shop.id,
      createdAt: {
        gte: startOfMonth,
      },
    },
    _sum: {
      price: true,
    },
  });

  const currentMonthlyUsage = Number(monthlyTotal._sum.price || 0);
  const monthlyCapAmount = 500.0; // Get this from subscription data

  if (currentMonthlyUsage + amount > monthlyCapAmount) {
    throw new Error(
      `Usage record would exceed monthly cap of $${monthlyCapAmount}. Current usage: $${currentMonthlyUsage}`,
    );
  }

  // Create usage record in Shopify
  const response = await admin.graphql(CREATE_USAGE_RECORD, {
    variables: {
      description,
      price: {
        amount,
        currencyCode: "USD",
      },
      subscriptionLineItemId,
    },
  });

  const responseData = await response.json();

  if (responseData.data?.appUsageRecordCreate?.userErrors?.length > 0) {
    const errors = responseData.data.appUsageRecordCreate.userErrors;
    throw new Error(errors.map((err: any) => err.message).join(", "));
  }

  const shopifyUsageRecord =
    responseData.data?.appUsageRecordCreate?.appUsageRecord;

  // Save to local database
  await createUsageRecord({
    description,
    amount,
    shopId: shop.id,
    shopifyId: shopifyUsageRecord?.id,
  });

  return {
    usageRecordId: shopifyUsageRecord?.id,
    message: "Usage record created successfully",
  };
}
