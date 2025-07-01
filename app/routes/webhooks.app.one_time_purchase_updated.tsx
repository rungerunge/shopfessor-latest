import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../lib/shopify.server";
import prisma from "app/lib/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, shop, topic } = await authenticate.webhook(request);

    console.log(`👉 Received ${topic} webhook for ${shop}`);
    console.log("Payload:", payload);

    const { app_purchase_one_time } = payload;

    if (!app_purchase_one_time) {
      console.error("No app_purchase_one_time data in payload");
      return new Response("No purchase data", { status: 400 });
    }

    const shopifyPurchaseId = app_purchase_one_time.admin_graphql_api_id;

    // Find the shop
    const shopModel = await prisma.shop.findFirst({
      where: {
        shop: shop,
      },
      include: {
        oneTimePurchases: true,
      },
    });

    if (!shopModel) {
      console.error(`Shop not found: ${shop}`);
      return new Response("Shop not found", { status: 404 });
    }

    console.log(`Found shop: ${shopModel.id} for ${shop}`);

    // Find existing purchase by Shopify ID
    let existingPurchase = await prisma.oneTimePurchase.findFirst({
      where: {
        shopifyId: shopifyPurchaseId,
      },
    });

    // Status mapping
    const statusMapping: Record<string, string> = {
      PENDING: "PENDING",
      ACTIVE: "ACTIVE",
      CANCELLED: "CANCELLED",
      DECLINED: "DECLINED",
      EXPIRED: "EXPIRED",
    };

    const mappedStatus =
      statusMapping[app_purchase_one_time.status] || "PENDING";

    // Find plan by name
    const plan = await prisma.plan.findFirst({
      where: {
        name: {
          equals: app_purchase_one_time.name,
          mode: "insensitive",
        },
      },
    });

    // Always create new purchase record to maintain history
    const newPurchase = await prisma.oneTimePurchase.create({
      data: {
        shopifyId: shopifyPurchaseId,
        name: app_purchase_one_time.name,
        status: mappedStatus as any,
        price: plan?.oneTimePrice || 0,
        currency: "USD",
        activatedAt: mappedStatus === "ACTIVE" ? new Date() : null,
        shopId: shopModel.id,
        planId: plan?.id || null,
        isTest: false,
        createdAt: new Date(app_purchase_one_time.created_at),
      },
    });

    // If there's an existing purchase, mark it as superseded by updating status
    if (existingPurchase && existingPurchase.status !== "CANCELLED") {
      await prisma.oneTimePurchase.update({
        where: {
          id: existingPurchase.id,
        },
        data: {
          status: "CANCELLED", // Mark old one as cancelled
          updatedAt: new Date(),
        },
      });
      console.log(
        `Marked previous purchase as cancelled: ${existingPurchase.id}`,
      );
    }

    console.log(`Created new one-time purchase: ${newPurchase.id}`);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error in one-time purchase webhook handler:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
