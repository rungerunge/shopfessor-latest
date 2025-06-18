import { authenticate } from "../lib/shopify.server";
import prisma from "../lib/db.server";
import type { Plan, UsageStats, Purchase } from "../types/billing";

// GraphQL mutation for one-time purchase
const APP_ONE_TIME_PURCHASE_CREATE = `#graphql
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

export async function getCurrentUsage(): Promise<UsageStats> {
  // In a real app, you'd fetch this from your database
  return {
    apiCallsUsed: 45,
    apiCallsRemaining: 155,
    totalCredits: 200,
  };
}
export async function getRecentPurchases(domain: string): Promise<Purchase[]> {
  const purchases = await prisma.oneTimePurchase.findMany({
    where: {
      shop: {
        shop: domain,
      },
    },
    include: {
      plan: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return purchases.map((purchase) => ({
    id: purchase.id,
    name: purchase.name,
    price: Number(purchase.price),
    credits: purchase.plan?.credits ?? 0,
    createdAt: purchase.createdAt.toISOString(),
    status: purchase.status.toLowerCase(),
  }));
}

export async function getAvailablePlans(): Promise<Plan[]> {
  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
      // credits: {
      //   not: null,
      // },
    },
    select: {
      id: true,
      name: true,
      description: true,
      monthlyPrice: true,
      credits: true,
      isFeatured: true,
      isFree: true,
    },
    orderBy: [{ isFeatured: "desc" }, { credits: "asc" }],
  });

  return plans.map((plan) => ({
    ...plan,
    monthlyPrice: Number(plan.monthlyPrice),
  }));
}

export async function createOneTimePurchase(
  planId: string,
  shop: string,
  admin: any,
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

  if (selectedPlan.isFree) {
    return { confirmationUrl: "/app/billing/onetime?success=true" };
  }

  const purchaseInput = {
    name: selectedPlan.name,
    price: {
      amount: Number(selectedPlan.monthlyPrice),
      currencyCode: "USD",
    },
    returnUrl: `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing/onetime`,
    test: process.env.NODE_ENV !== "production",
  };

  const response = await admin.graphql(APP_ONE_TIME_PURCHASE_CREATE, {
    variables: purchaseInput,
  });

  const data = await response.json();

  if (data.data?.appPurchaseOneTimeCreate?.userErrors?.length > 0) {
    const errors = data.data.appPurchaseOneTimeCreate.userErrors;
    throw new Error(errors.map((err: any) => err.message).join(", "));
  }

  const confirmationUrl = data.data?.appPurchaseOneTimeCreate?.confirmationUrl;
  const purchaseId =
    data.data?.appPurchaseOneTimeCreate?.appPurchaseOneTime?.id;

  if (!confirmationUrl) {
    throw new Error("Failed to create purchase - no confirmation URL");
  }

  return { confirmationUrl, purchaseId };
}
