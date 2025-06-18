import { BillingError } from "../utils/error-handling.server";
import prisma from "app/lib/db.server";
import { Coupon } from "@prisma/client";
import { createAppSubscription } from "app/models/billing.server";

interface CreateSubscriptionParams {
  request: any;
  session: any;
  planId: string;
  billingCycle: "monthly" | "yearly";
  couponCode?: string;
}

// const APP_SUBSCRIPTION_CREATE = `#graphql
//   mutation AppSubscriptionCreate(
//     $name: String!
//     $lineItems: [AppSubscriptionLineItemInput!]!
//     $returnUrl: URL!
//     $test: Boolean
//     $trialDays: Int
//   ) {
//     appSubscriptionCreate(
//       name: $name
//       returnUrl: $returnUrl
//       test: $test
//       trialDays: $trialDays
//       lineItems: $lineItems
//     ) {
//       userErrors {
//         field
//         message
//       }
//       appSubscription {
//         id
//         name
//         status
//         createdAt
//         test
//       }
//       confirmationUrl
//     }
//   }`;

// Helper function to find plan
const findPlan = async (planId: string) => {
  const plan = await prisma.plan.findFirst({
    where: { id: planId },
  });
  if (!plan) {
    throw new BillingError("Invalid plan selected", "PLAN_NOT_FOUND");
  }
  return plan;
};

// Helper function to find coupon
const findCoupon = async (couponCode?: string) => {
  if (!couponCode) return null;
  return await prisma.coupon.findFirst({
    where: {
      code: couponCode,
      active: true,
    },
  });
};

// Helper function to create line item discount
const createLineItemDiscount = (
  discountAmount: number | null,
  percentage: number | null,
  discountDurationLimit: number,
) => {
  if (discountAmount !== null && discountAmount > 0) {
    return {
      durationLimitInIntervals: discountDurationLimit,
      value: { amount: discountAmount },
    };
  }
  if (percentage !== null && percentage > 0) {
    // Convert percentage from whole number (50) to decimal (0.50) for Shopify
    const shopifyPercentage = percentage / 100;
    return {
      durationLimitInIntervals: discountDurationLimit,
      value: { percentage: shopifyPercentage },
    };
  }
  return null;
};

// Helper function to calculate discount details
const calculateDiscountDetails = (coupon?: Coupon) => {
  if (!coupon) {
    return {
      discountAmount: null,
      percentage: null,
      discountDurationLimit: 1,
    };
  }

  return {
    discountAmount: coupon.type === "FIXED" ? coupon.discountAmount : null,
    percentage: coupon.type === "PERCENTAGE" ? coupon.percentage : null,
    discountDurationLimit: 1,
  };
};

// Helper function to track coupon usage
const trackCouponUsage = async (
  couponId: string,
  shopDomain: string,
  chargeId: string,
) => {
  const shop = await prisma.shop.findFirst({
    where: { shop: shopDomain },
    include: { user: true },
  });

  if (!shop?.user) return;

  try {
    const existingUsage = await prisma.couponUsage.findFirst({
      where: {
        couponId,
        shop: shopDomain,
        userId: shop.user.id,
      },
    });

    if (existingUsage) {
      await prisma.couponUsage.update({
        where: { id: existingUsage.id },
        data: { shopifyChargeId: Number(chargeId) },
      });
    } else {
      await prisma.couponUsage.create({
        data: {
          coupon: { connect: { id: couponId } },
          user: { connect: { id: shop.user.id } },
          shopModel: { connect: { id: shop.id } },
          usedAt: null,
          shopifyChargeId: Number(chargeId),
        },
      });
    }
  } catch (err) {
    console.error("Failed to track coupon usage:", err);
    throw new Error("Failed to track coupon usage");
  }
};

// Helper function to build line items
const buildLineItems = (plan: any, billingCycle: string, coupon?: Coupon) => {
  let basePrice = 0;
  if (billingCycle === "monthly") {
    basePrice = plan.monthlyPrice;
  } else {
    basePrice = getYearlyPrice(plan.monthlyPrice, plan.yearlyDiscount);
  }

  const interval = billingCycle === "monthly" ? "EVERY_30_DAYS" : "ANNUAL";
  const discountDetails = calculateDiscountDetails(coupon);

  // Create discount object only if discount exists
  const lineItemDiscount = createLineItemDiscount(
    discountDetails.discountAmount,
    discountDetails.percentage,
    discountDetails.discountDurationLimit,
  );

  const lineItem = {
    plan: {
      appRecurringPricingDetails: {
        interval,
        price: {
          amount: basePrice,
          currencyCode: "USD",
        },
      },
    },
  };

  // Only add discount if it exists
  if (lineItemDiscount) {
    lineItem.plan.appRecurringPricingDetails.discount = lineItemDiscount;
  }

  return [lineItem];
};

export const createSubscription = async ({
  request,
  session,
  planId,
  billingCycle,
  couponCode,
}: CreateSubscriptionParams): Promise<string> => {
  try {
    // Find plan and coupon
    const plan = await findPlan(planId);
    const coupon = couponCode ? await findCoupon(couponCode) : null;

    // Build line items and subscription details
    const lineItems = buildLineItems(plan, billingCycle, coupon);
    const subscriptionName = plan.name;

    // Prepare subscription input
    const subscriptionInput = {
      name: subscriptionName,
      returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`,

      test: process.env.NODE_ENV !== "production",
      lineItems,
      ...(plan.trialDays && { trialDays: plan.trialDays }),
    };

    // Create Shopify billing subscription using GraphQL
    // const response = await admin.graphql(APP_SUBSCRIPTION_CREATE, {
    //   variables: subscriptionInput,
    // });

    // const data = await response.json();

    // // Check for GraphQL errors
    // if (data.data?.appSubscriptionCreate?.userErrors?.length > 0) {
    //   const errors = data.data.appSubscriptionCreate.userErrors;
    //   console.error("GraphQL errors:", errors);
    //   throw new BillingError(
    //     errors.map((err: any) => err.message).join(", "),
    //     "GRAPHQL_ERROR",
    //   );
    // }

    // const confirmationUrl = data.data?.appSubscriptionCreate?.confirmationUrl;
    // const subscriptionId =
    //   data.data?.appSubscriptionCreate?.appSubscription?.id;

    const { subscription, confirmationUrl, errors } =
      await createAppSubscription(request, subscriptionInput);

    if (!confirmationUrl) {
      throw new BillingError(
        "Failed to create subscription - no confirmation URL",
        "NO_CONFIRMATION_URL",
      );
    }

    const subscriptionId = subscription?.id;

    // Record coupon usage if a coupon was applied
    if (couponCode && coupon && subscriptionId) {
      try {
        const chargeId = subscriptionId.split("/").pop();
        await trackCouponUsage(coupon.id, session.shop, chargeId);
      } catch (error) {
        console.error("Error recording coupon usage:", error);
        // Don't fail the subscription creation if coupon recording fails
      }
    }

    return confirmationUrl;
  } catch (error) {
    if (error instanceof BillingError) {
      throw error;
    }

    console.error("Billing error:", error);
    throw new BillingError(
      error instanceof Error ? error.message : "Failed to create subscription",
      "SUBSCRIPTION_CREATION_FAILED",
    );
  }
};

export const calculateDiscountedPrice = (
  originalPrice: number,
  discountValue: number,
  discountType: "fixed" | "percentage",
): number => {
  if (discountType === "percentage") {
    return originalPrice * (1 - discountValue / 100);
  } else if (discountType === "fixed") {
    return Math.max(0, originalPrice - discountValue);
  }
  return originalPrice;
};

export const getYearlyPrice = (
  monthlyPrice: number,
  yearlyDiscount: number,
): number => {
  // yearlyDiscount is in decimal 0.2 -> 20%
  return monthlyPrice * 12 * (1 - yearlyDiscount);
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};
