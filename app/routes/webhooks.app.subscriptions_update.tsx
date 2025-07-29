import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../lib/shopify.server";
import prisma from "app/lib/db.server";
import logger from "app/utils/logger";

/**
 * Webhook handler for Shopify app subscription updates
 * Handles subscription creation, updates, and cancellations
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, topic, shop, admin } = await authenticate.webhook(request);

    logger.info(`Received ${topic} webhook for ${shop}`);
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
