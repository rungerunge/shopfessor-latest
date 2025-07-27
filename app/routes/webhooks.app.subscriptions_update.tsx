import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../lib/shopify.server";
import prisma from "app/lib/db.server";
import { getCurrentSubscriptions } from "app/services/billing.server";
import logger from "app/utils/logger";

/**
 * Webhook handler for Shopify app subscription updates
 * Handles subscription creation, updates, and cancellations
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, topic, shop, admin } = await authenticate.webhook(request);

    logger.info(`Received ${topic} webhook for ${shop}`);
    logger.info("🔴 payload: ", payload);
    const { app_subscription } = payload;

    // Validate payload contains subscription data
    if (!app_subscription) {
      logger.error("No app_subscription data in payload");
      return new Response("No subscription data", { status: 400 });
    }

    const shopifySubscriptionId = app_subscription.admin_graphql_api_id;

    // Find the shop in our database
    const shopModel = await prisma.shop.findFirst({
      where: { shop: shop },
      include: {
        subscriptions: true,
      },
    });

    if (!shopModel) {
      logger.error(`Shop not found: ${shop}`);
      return new Response("Shop not found", { status: 404 });
    }

    logger.info(`Found shop: ${shopModel.id} for ${shop}`);

    // Find existing subscription by Shopify ID first, then by shop + name as fallback
    let existingSubscription = await prisma.subscription.findFirst({
      where: { shopifyId: shopifySubscriptionId },
    });

    if (!existingSubscription) {
      existingSubscription = await prisma.subscription.findFirst({
        where: {
          shopId: shopModel.id,
          name: app_subscription.name,
          status: { not: "CANCELLED" },
        },
      });
    }

    // Map Shopify subscription statuses to our internal statuses
    const statusMapping: Record<string, string> = {
      ACTIVE: "ACTIVE",
      CANCELLED: "CANCELLED",
      EXPIRED: "EXPIRED",
      FROZEN: "FROZEN",
      PENDING: "ACTIVE", // Treat pending as active for our purposes
    };

    const mappedStatus = statusMapping[app_subscription.status] || "ACTIVE";

    // Map Shopify billing intervals to our internal intervals
    const intervalMapping: Record<string, string> = {
      every_30_days: "EVERY_30_DAYS",
      annual: "ANNUAL",
      monthly: "MONTHLY",
    };

    const mappedInterval =
      intervalMapping[app_subscription.interval] || "EVERY_30_DAYS";

    // Calculate the next billing period end date based on interval
    const currentPeriodEnd = new Date();
    if (mappedInterval === "EVERY_30_DAYS") {
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
    } else if (mappedInterval === "ANNUAL") {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    // Find the corresponding plan in our database
    const plan = await prisma.plan.findFirst({
      where: {
        name: {
          equals: app_subscription.name,
          mode: "insensitive",
        },
      },
    });

    let subscriptionProcessed = false;

    // Handle subscription based on its status
    if (app_subscription.status === "CANCELLED") {
      // Handle subscription cancellation
      if (existingSubscription) {
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: "CANCELLED",
            updatedAt: new Date(),
          },
        });
        logger.info(`Cancelled subscription: ${existingSubscription.id}`);
        subscriptionProcessed = true;
      }
    } else if (existingSubscription) {
      // Update existing active subscription
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: mappedStatus as any,
          shopifyId: shopifySubscriptionId,
          name: app_subscription.name,
          price: parseFloat(app_subscription.price),
          currency: app_subscription.currency,
          interval: mappedInterval as any,
          currentPeriodEnd:
            mappedStatus === "ACTIVE"
              ? currentPeriodEnd
              : existingSubscription.currentPeriodEnd,
          updatedAt: new Date(),
        },
      });
      logger.info(`Updated subscription: ${existingSubscription.id}`);
      subscriptionProcessed = true;

      // Track coupon usage for updated active subscriptions
      if (mappedStatus === "ACTIVE") {
        logger.info(
          `Tracking coupon usage for updated subscription: ${existingSubscription.id}`,
        );
        await trackCouponUsage(request, shop, shopModel.id);
      }
    } else {
      // Create new subscription
      const newSubscription = await prisma.subscription.create({
        data: {
          shopifyId: shopifySubscriptionId,
          name: app_subscription.name,
          status: mappedStatus as any,
          price: parseFloat(app_subscription.price),
          currency: app_subscription.currency,
          interval: mappedInterval as any,
          currentPeriodStart: new Date(app_subscription.created_at),
          currentPeriodEnd: mappedStatus === "ACTIVE" ? currentPeriodEnd : null,
          shopId: shopModel.id,
          planId: plan?.id || null,
        },
      });
      logger.info(`Created subscription: ${newSubscription.id}`);
      subscriptionProcessed = true;

      // Track coupon usage for new active subscriptions
      if (mappedStatus === "ACTIVE") {
        logger.info(
          `Tracking coupon usage for new subscription: ${newSubscription.id}`,
        );
        await trackCouponUsage(admin, shop, shopModel.id);
      }
    }

    if (!subscriptionProcessed) {
      logger.warn(
        `No subscription processing occurred for ${shop} - ${app_subscription.name}`,
      );
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    logger.error("Error in subscription webhook handler:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

/**
 * Tracks coupon usage by querying Shopify's GraphQL API for active subscriptions
 * and matching them with coupons in our local database.
 *
 * LIMITATION: Shopify's AppSubscription GraphQL API doesn't provide the actual coupon code,
 * only the discount type and amount. This makes it challenging to accurately match
 * subscriptions with specific coupons in our database.
 *
 * @param admin - Shopify Admin API client
 * @param shopDomain - The shop domain
 * @param shopId - The shop ID from our database
 */
const trackCouponUsage = async (
  request: any,
  shopDomain: string,
  shopId: string,
) => {
  try {
    logger.info(
      `Starting coupon usage tracking for shop: ${shopDomain}, shopId: ${shopId}`,
    );

    const { subscriptions } = await getCurrentSubscriptions(request);

    // Process each active subscription
    for (const sub of subscriptions) {
      const shopifySubscriptionId = sub.id;

      // Find the corresponding subscription in our local database
      const existingSubscription = await prisma.subscription.findFirst({
        where: { shopifyId: shopifySubscriptionId },
      });

      if (!existingSubscription) {
        logger.warn(
          `Subscription with shopifyId ${shopifySubscriptionId} not found in local DB. Skipping coupon tracking.`,
        );
        continue;
      }

      logger.info(
        `Processing subscription: ${existingSubscription.id} (Shopify ID: ${shopifySubscriptionId})`,
      );

      // Check each line item for discounts
      for (const item of sub.lineItems) {
        const discount = item.plan.pricingDetails?.discount;

        if (!discount) {
          logger.info(`No discount found for line item ${item.id}`);
          continue;
        }

        // Determine the coupon type based on Shopify's discount structure
        let couponType: "FIXED" | "PERCENTAGE" | null = null;
        let discountValue: number | null = null;

        if (discount.value.__typename === "AppSubscriptionDiscountAmount") {
          couponType = "FIXED";
          discountValue = parseFloat(discount.value.amount.amount);
        } else if (
          discount.value.__typename === "AppSubscriptionDiscountPercentage"
        ) {
          couponType = "PERCENTAGE";
          discountValue = discount.value.percentage;
        }

        if (couponType === null) {
          logger.info(`Unknown discount type for line item ${item.id}`);
          continue;
        }

        logger.info(
          `Found ${couponType} discount of ${discountValue} for line item ${item.id}`,
        );

        // CRITICAL LIMITATION: Shopify doesn't provide the actual coupon code
        // We can only match by type and potentially by discount value, which is unreliable
        // TODO: Consider enhancing this by:
        // 1. Storing coupon codes in subscription metadata when initially applied
        // 2. Using subscription names if they contain coupon codes
        // 3. Implementing a more sophisticated matching algorithm

        const coupon = await prisma.coupon.findFirst({
          where: {
            type: couponType,
            active: true,
            // Additional matching criteria could be added here if available
            // For example: discountAmount: discountValue (for FIXED coupons)
            // or discountPercentage: discountValue (for PERCENTAGE coupons)
          },
          orderBy: { createdAt: "desc" }, // Get the most recent matching coupon
        });

        if (!coupon) {
          logger.warn(
            `No active coupon found in local DB matching type '${couponType}' with value ${discountValue}. Cannot track usage without a specific coupon code.`,
          );
          continue;
        }

        // Check if coupon usage is already tracked for this subscription
        const existingUsage = await prisma.couponUsage.findFirst({
          where: {
            couponId: coupon.id,
            shop: shopDomain,
            subscriptionId: existingSubscription.id,
          },
        });

        if (existingUsage) {
          logger.info(
            `Coupon usage already tracked for subscription ${existingSubscription.id} with coupon ${coupon.code}.`,
          );
          continue;
        }

        // Create new coupon usage record
        await prisma.couponUsage.create({
          data: {
            couponId: coupon.id,
            shop: shopDomain,
            subscriptionId: existingSubscription.id,
            usedAt: new Date(),
          },
        });

        logger.info(
          `Successfully tracked coupon usage for subscription ${existingSubscription.id} with coupon ${coupon.code} (Type: ${coupon.type}, Value: ${discountValue}).`,
        );
      }
    }
  } catch (error) {
    logger.error("Error in trackCouponUsage:", error);
    // Don't throw the error to prevent webhook processing failure
    // Coupon tracking is supplementary functionality
  }
};
