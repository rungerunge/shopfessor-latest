import prisma from "app/lib/db.server";
import { Plan } from "app/types/billing";

export const GET_CURRENT_SUBSCRIPTIONS = `#graphql
 query GetCurrentSubscriptions {
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
                    ... on AppRecurringPricing {
                      price {
                        amount
                        currencyCode
                      }
                      interval
                      discount {
                        durationLimitInIntervals
                        remainingDurationInIntervals
                        priceAfterDiscount {
                          amount
                          currencyCode
                        }
                        value {
                          __typename
                          ... on AppSubscriptionDiscountAmount {
                            amount {
                              amount
                              currencyCode
                            }
                          }
                          ... on AppSubscriptionDiscountPercentage {
                            percentage
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
    `;

export const CANCEL_APP_SUBSCRIPTION = `#graphql
  mutation AppSubscriptionCancel($id: ID!) {
    appSubscriptionCancel(id: $id) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
        status
      }
    }
  }
`;

export const APP_ONE_TIME_PURCHASE_CREATE = `#graphql
  mutation AppPurchaseOneTimeCreate(
    $name: String!,
    $price: MoneyInput!,
    $returnUrl: URL!
    $test: Boolean
  ) {
    appPurchaseOneTimeCreate(
      name: $name,
      returnUrl: $returnUrl,
      price: $price
      test: $test
    ) {
      userErrors {
        field
        message
      }
      appPurchaseOneTime {
        createdAt
        id
      }
      confirmationUrl
    }
  }
`;

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
