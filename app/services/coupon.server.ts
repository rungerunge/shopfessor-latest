import { Coupon, Plan, Shop, CouponType } from "@prisma/client";
import prisma from "app/lib/db.server";

/**
 * Defines the context of the purchase to validate the coupon against.
 * Using Prisma-generated types for better type safety.
 */
export type PurchaseContext =
  | { type: "SUBSCRIPTION"; cycle: "monthly" | "yearly" }
  | { type: "ONETIME" }
  | { type: "USAGE_BASED" }; // Added for completeness

/**
 * Extended Shop type (user relation removed)
 */
type ShopWithId = Shop;

export const verifyCoupon = async (
  session: any,
  couponCode: string,
  planId: string,
  purchaseContext: PurchaseContext,
): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    code: string;
    message: string;
    discountValue: number;
    discountType: CouponType;
    durationLimit: number;
  };
}> => {
  try {
    // Input validation
    if (!couponCode?.trim()) {
      return { success: false, error: "Coupon code is required." };
    }

    if (!planId?.trim()) {
      return { success: false, error: "Plan ID is required." };
    }

    if (!session?.shop) {
      return { success: false, error: "Invalid session." };
    }

    // Fetch coupon and plan in parallel
    const [coupon, plan] = await Promise.all([
      prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() }, // Normalize coupon code
      }),
      prisma.plan.findUnique({
        where: { id: planId, isActive: true }, // Only active plans
      }),
    ]);

    // Check if coupon exists and is valid
    if (!coupon) {
      return { success: false, error: "Coupon code not found." };
    }

    if (!coupon.active) {
      return { success: false, error: "This coupon is no longer active." };
    }

    if (isCouponExpired(coupon)) {
      return { success: false, error: "This coupon has expired." };
    }

    // Check if plan exists
    if (!plan) {
      return { success: false, error: "Selected plan is not available." };
    }

    // 1. Validate that the plan supports the requested purchase type
    if (!isPurchaseTypeSupported(plan, purchaseContext)) {
      const contextType = purchaseContext.type.toLowerCase().replace("_", "-");
      return {
        success: false,
        error: `The ${plan.name} plan does not support ${contextType} purchases.`,
      };
    }

    // 2. Validate coupon applicability
    if (!isPlanApplicable(coupon, plan.id)) {
      return {
        success: false,
        error: `This coupon is not valid for the ${plan.name} plan.`,
      };
    }

    if (!isBillingTypeApplicable(coupon, purchaseContext.type)) {
      const contextType = purchaseContext.type.toLowerCase().replace("_", "-");
      return {
        success: false,
        error: `This coupon is not valid for ${contextType} purchases.`,
      };
    }

    // Check yearly subscription specific validation
    if (
      purchaseContext.type === "SUBSCRIPTION" &&
      purchaseContext.cycle === "yearly" &&
      !coupon.yearlyApplicable
    ) {
      return {
        success: false,
        error: "This coupon cannot be applied to yearly subscriptions.",
      };
    }

    // 3. Get shop information
    const shop = await getShopByDomain(session.shop);
    if (!shop) {
      return { success: false, error: "Shop not found." };
    }

    // 5. Calculate discount and construct success response
    const discountResult = calculateDiscount(coupon, plan, purchaseContext);

    return {
      success: true,
      message: "Coupon applied successfully.",
      data: {
        code: coupon.code,
        message: discountResult.message,
        discountValue: discountResult.discountValue,
        discountType: coupon.type,
        durationLimit: coupon.durationLimit,
      },
    };
  } catch (error) {
    console.error("Error verifying coupon:", error);
    return {
      success: false,
      error: "An error occurred while verifying the coupon. Please try again.",
    };
  }
};

// --- HELPER FUNCTIONS ---

/**
 * Checks if the plan supports the intended purchase type
 */
const isPurchaseTypeSupported = (
  plan: Plan,
  context: PurchaseContext,
): boolean => {
  switch (context.type) {
    case "ONETIME":
      return plan.oneTimePrice !== null && plan.oneTimePrice.gt(0);

    case "SUBSCRIPTION":
      if (context.cycle === "monthly") {
        return plan.monthlyPrice !== null && plan.monthlyPrice.gt(0);
      } else if (context.cycle === "yearly") {
        return plan.yearlyPrice !== null && plan.yearlyPrice.gt(0);
      }
      return false;

    case "USAGE_BASED":
      return plan.usagePrice !== null && plan.usagePrice.gt(0);

    default:
      return false;
  }
};

/**
 * Checks if coupon has expired
 */
const isCouponExpired = (coupon: Coupon): boolean => {
  if (!coupon.expiresAt) return false;
  return coupon.expiresAt < new Date();
};

/**
 * Checks if coupon is applicable to the specific plan
 */
const isPlanApplicable = (coupon: Coupon, planId: string): boolean => {
  // If no specific plans are set, coupon applies to all plans
  if (!coupon.applicablePlans || coupon.applicablePlans.length === 0) {
    return true;
  }
  return coupon.applicablePlans.includes(planId);
};

/**
 * Checks if coupon supports the billing type
 */
const isBillingTypeApplicable = (
  coupon: Coupon,
  purchaseType: PurchaseContext["type"],
): boolean => {
  switch (purchaseType) {
    case "ONETIME":
      return coupon.allowOneTime;
    case "SUBSCRIPTION":
      return coupon.allowSubscription;
    case "USAGE_BASED":
      return coupon.allowUsageBased;
    default:
      return false;
  }
};

/**
 * Calculates the discount amount and message
 */
const calculateDiscount = (
  coupon: Coupon,
  plan: Plan,
  context: PurchaseContext,
): { discountValue: number; message: string } => {
  // Get the base price for the purchase context
  let basePrice: number = 0;

  switch (context.type) {
    case "ONETIME":
      basePrice = plan.oneTimePrice?.toNumber() ?? 0;
      break;
    case "SUBSCRIPTION":
      basePrice =
        context.cycle === "monthly"
          ? (plan.monthlyPrice?.toNumber() ?? 0)
          : (plan.yearlyPrice?.toNumber() ?? 0);
      break;
    case "USAGE_BASED":
      basePrice = plan.usagePrice?.toNumber() ?? 0;
      break;
  }

  let discountValue: number;
  let message: string;

  if (coupon.type === CouponType.FIXED) {
    discountValue = coupon.discountAmount?.toNumber() ?? 0;
    discountValue = Math.min(discountValue, basePrice);
    message = `$${discountValue.toFixed(2)} off ${plan.name}`;
  } else {
    const percentage = coupon.percentage?.toNumber() ?? 0;
    const discountRate = percentage / 100;
    const discountAmount = basePrice * discountRate;
    discountValue = discountAmount;
    message = `${percentage}% off ${plan.name} (Save $${discountAmount.toFixed(2)})`;
  }

  return { discountValue, message };
};

/**
 * Gets shop by domain
 */
const getShopByDomain = async (
  shopDomain: string,
): Promise<ShopWithId | null> => {
  try {
    return await prisma.shop.findFirst({
      where: {
        shop: shopDomain,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Error getting shop by domain:", error);
    return null;
  }
};
