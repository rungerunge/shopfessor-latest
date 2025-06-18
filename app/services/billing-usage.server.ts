import prisma from "app/lib/db.server";
import { Plan } from "app/types/billing";

// GraphQL Mutations
export const CREATE_USAGE_SUBSCRIPTION = `#graphql
  mutation CreateUsageSubscription(
    $name: String!,
    $returnUrl: URL!,
    $usageTerms: String!,
    $usageCappedAmount: Decimal!,
    $usageCurrencyCode: CurrencyCode!,
    $recurringAmount: Decimal!,
    $test: Boolean!,
    $recurringCurrencyCode: CurrencyCode!
  ) {
    appSubscriptionCreate(
      name: $name,
      returnUrl: $returnUrl,
      test: $test,
      lineItems: [
        {
          plan: {
            appUsagePricingDetails: {
              terms: $usageTerms,
              cappedAmount: {
                amount: $usageCappedAmount,
                currencyCode: $usageCurrencyCode
              }
            }
          }
        },
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: $recurringAmount,
                currencyCode: $recurringCurrencyCode
              }
            }
          }
        }
      ]
    ) {
      userErrors {
        field,
        message
      },
      confirmationUrl,
      appSubscription {
        id,
        lineItems {
          id,
          plan {
            pricingDetails {
              __typename
            }
          }
        }
      }
    }
  }
`;

export const CREATE_USAGE_RECORD = `#graphql
  mutation appUsageRecordCreate(
    $description: String!,
    $price: MoneyInput!,
    $subscriptionLineItemId: ID!
  ) {
    appUsageRecordCreate(
      description: $description,
      price: $price,
      subscriptionLineItemId: $subscriptionLineItemId
    ) {
      userErrors {
        field
        message
      }
      appUsageRecord {
        id
        description
        price {
          amount
          currencyCode
        }
        createdAt
      }
    }
  }
`;

export const GET_CURRENT_SUBSCRIPTION = `#graphql
  query GetCurrentSubscription {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        createdAt
        currentPeriodEnd
        lineItems {
          id
          plan {
            pricingDetails {
              __typename
              ... on AppUsagePricing {
                terms
                cappedAmount {
                  amount
                  currencyCode
                }
              }
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function getCurrentShop(shop: string) {
  return await prisma.shop.findFirst({
    where: { shop },
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
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
      subscriptionId,
      createdAt: {
        gte: startOfMonth,
      },
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
  userId: string;
  shopifyId?: string;
}) {
  return await prisma.usageCharge.create({
    data: {
      description: data.description,
      price: data.amount,
      quantity: 1,
      currency: "USD",
      shopifyId: data.shopifyId,
      isTest: process.env.NODE_ENV !== "production",
      userId: data.userId,
      shopId: data.shopId,
      planId: null,
      subscriptionId: null,
    },
  });
}
