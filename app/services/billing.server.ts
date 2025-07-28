import { BillingError } from "../utils/error-handling.server";
import prisma from "app/lib/db.server";
import { Coupon } from "@prisma/client";
import { authenticate } from "app/lib/shopify.server";

import {
  APP_SUBSCRIPTION_CREATE,
  CREATE_USAGE_SUBSCRIPTION,
  GET_CURRENT_SUBSCRIPTIONS,
  CANCEL_APP_SUBSCRIPTION,
  APP_ONE_TIME_PURCHASE_CREATE,
} from "app/graphql/billing";
import { CurrencyCode } from "app/types/admin.types.d";
import logger from "app/utils/logger";

// const IS_TEST_BILLING = process.env.NODE_ENV !== "production";
const IS_TEST_BILLING = true;

interface CreateSubscriptionParams {
  request: any;
  session: any;
  planId: string;
  billingCycle: "monthly" | "yearly";
  couponCode?: string;
}

interface SubscriptionInput {
  selectedPlan: {
    name: string;
    monthlyPrice: string | number;
  };
  usageData: {
    usageTerms: string;
    usageCappedAmount: number;
  };
}

interface OneTimePurchaseInput {
  name: string;
  price: string | number; // Assuming price can be a string or number and will be converted to MoneyInput internally by GraphQL
}

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
    const { admin, session } = await authenticate.admin(request);

    // Find plan and coupon
    const plan = await findPlan(planId);
    const coupon = couponCode ? await findCoupon(couponCode) : null;

    // Build line items and subscription details
    const lineItems = buildLineItems(plan, billingCycle, coupon);
    const subscriptionName = plan.name;

    // Prepare subscription input
    const subscriptionInput = {
      name: subscriptionName,
      returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing`,

      test: IS_TEST_BILLING,
      lineItems,
      ...(plan.trialDays && { trialDays: plan.trialDays }),
    };

    // Create Shopify billing subscription using GraphQL
    const response = await admin.graphql(APP_SUBSCRIPTION_CREATE, {
      variables: subscriptionInput,
    });

    const data = await response.json();

    // Check for GraphQL errors
    if (data.data?.appSubscriptionCreate?.userErrors?.length > 0) {
      const errors = data.data.appSubscriptionCreate.userErrors;
      logger.error("GraphQL errors:", errors);
      throw new BillingError(
        errors.map((err: any) => err.message).join(", "),
        "GRAPHQL_ERROR",
      );
    }

    const confirmationUrl = data.data?.appSubscriptionCreate?.confirmationUrl;
    const subscriptionId =
      data.data?.appSubscriptionCreate?.appSubscription?.id;

    // const { subscription, confirmationUrl, errors } =
    //   await createAppSubscription(request, subscriptionInput);

    if (!confirmationUrl) {
      throw new BillingError(
        "Failed to create subscription - no confirmation URL",
        "NO_CONFIRMATION_URL",
      );
    }

    return confirmationUrl;
  } catch (error) {
    if (error instanceof BillingError) {
      throw error;
    }

    logger.error("Billing error:", error);
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

export async function getCurrentSubscriptions(request: Request) {
  try {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(GET_CURRENT_SUBSCRIPTIONS);
    const responseJson = await response.json();

    return {
      subscriptions:
        responseJson.data?.currentAppInstallation?.activeSubscriptions || [],
    };
  } catch (error) {
    logger.error("Error in getCurrentSubscriptions", { error });
    return {
      subscriptions: [],
    };
  }
}

export async function createAppSubscription(
  request: Request,
  subscriptionData: SubscriptionInput,
) {
  try {
    const { admin, session } = await authenticate.admin(request);

    logger.info("\n\n\n\n🔥 ", subscriptionData);
    const { selectedPlan, usageData } = subscriptionData;

    const subscriptionInput = {
      name: selectedPlan.name,
      returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing`,
      usageTerms: usageData.usageTerms,
      usageCappedAmount: usageData.usageCappedAmount,
      usageCurrencyCode: CurrencyCode.Usd,
      recurringAmount: Number(selectedPlan.monthlyPrice),
      recurringCurrencyCode: CurrencyCode.Usd,
      test: IS_TEST_BILLING,
    };

    const response = await admin.graphql(CREATE_USAGE_SUBSCRIPTION, {
      variables: subscriptionInput,
    });
    const responseJson = await response.json();

    // Check for user errors
    const userErrors =
      responseJson.data?.appSubscriptionCreate?.userErrors ?? [];
    if (userErrors.length > 0) {
      const errors = userErrors;
      logger.error("User errors in createAppSubscription", {
        errors,
        subscriptionInput,
      });
      return {
        success: false,
        errors: errors,
        errorMessage: errors.map((err: any) => err.message).join(", "),
      };
    }

    // Check for confirmation URL
    const confirmationUrl =
      responseJson.data?.appSubscriptionCreate?.confirmationUrl;
    if (!confirmationUrl) {
      logger.error("No confirmation URL received in createAppSubscription", {
        subscriptionInput,
      });
      return {
        success: false,
        errors: [],
        errorMessage: "No confirmation URL received",
      };
    }

    return {
      success: true,
      confirmationUrl,
      subscription: responseJson.data?.appSubscriptionCreate?.appSubscription,
      errors: [],
    };
  } catch (error) {
    logger.error("Error in createAppSubscription", { error, subscriptionData });
    return {
      success: false,
      errors: [{ message: "Internal server error" }],
      errorMessage: "Internal server error",
    };
  }
}

export async function cancelAppSubscription(request: Request, id: string) {
  try {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(CANCEL_APP_SUBSCRIPTION, {
      variables: { id },
    });

    const responseJson = await response.json();

    // Check for user errors
    const userErrors =
      responseJson.data?.appSubscriptionCancel?.userErrors ?? [];
    if (userErrors.length > 0) {
      const errors = userErrors;
      logger.error("User errors in cancelAppSubscription", { errors, id });
      return {
        success: false,
        errors: errors,
        errorMessage: errors.map((err: any) => err.message).join(", "),
      };
    }

    // Check if subscription was successfully cancelled
    const appSubscription =
      responseJson.data?.appSubscriptionCancel?.appSubscription;
    if (!appSubscription || appSubscription.status !== "CANCELLED") {
      logger.error(
        "Subscription could not be cancelled in cancelAppSubscription",
        { id },
      );
      return {
        success: false,
        errors: [],
        errorMessage: "Subscription could not be cancelled",
      };
    }

    return {
      success: true,
      subscription: appSubscription,
      errors: [],
    };
  } catch (error) {
    logger.error("Error in cancelAppSubscription", { error, id });
    return {
      success: false,
      errors: [{ message: "Internal server error" }],
      errorMessage: "Internal server error",
    };
  }
}

export async function createOneTimePurchase(
  request: Request,
  purchaseData: OneTimePurchaseInput,
) {
  try {
    const { admin, session } = await authenticate.admin(request);

    const { name, price } = purchaseData;

    const purchaseInput = {
      name: name,
      price: {
        amount: Number(price), // Ensure amount is a number
        currencyCode: CurrencyCode.Usd,
      },
      returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing`, // Adjust return URL as needed
      test: IS_TEST_BILLING,
    };

    const response = await admin.graphql(APP_ONE_TIME_PURCHASE_CREATE, {
      variables: purchaseInput,
    });

    const responseJson = await response.json();

    // Check for user errors
    const userErrors =
      responseJson.data?.appPurchaseOneTimeCreate?.userErrors ?? [];
    if (userErrors.length > 0) {
      const errors = userErrors;
      logger.error("User errors in createOneTimePurchase", {
        errors,
        purchaseInput,
      });
      return {
        success: false,
        errors: errors,
        errorMessage: errors.map((err: any) => err.message).join(", "),
      };
    }

    // Check for confirmation URL
    const confirmationUrl =
      responseJson.data?.appPurchaseOneTimeCreate?.confirmationUrl;
    if (!confirmationUrl) {
      logger.error("No confirmation URL received in createOneTimePurchase", {
        purchaseInput,
      });
      return {
        success: false,
        errors: [],
        errorMessage: "No confirmation URL received",
      };
    }

    return {
      success: true,
      confirmationUrl,
      purchase: responseJson.data?.appPurchaseOneTimeCreate?.appPurchaseOneTime,
      errors: [],
    };
  } catch (error) {
    logger.error("Error in createOneTimePurchase", { error, purchaseData });
    return {
      success: false,
      errors: [{ message: "Internal server error" }],
      errorMessage: "Internal server error",
    };
  }
}
