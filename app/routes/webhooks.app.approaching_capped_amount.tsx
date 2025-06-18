import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../lib/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`🔥 🔥 🔥 🔥 🔥   Received ${topic} webhook for ${shop}`);
  console.log("Payload:", payload);
  // payload sample:

  // Payload: {
  //   app_purchase_one_time: {
  //     admin_graphql_api_id: 'gid://shopify/AppPurchaseOneTime/2628616364',
  //     name: 'Pro',
  //     status: 'ACTIVE',
  //     admin_graphql_api_shop_id: 'gid://shopify/Shop/65949302956',
  //     created_at: '2025-06-09T11:54:13-04:00',
  //     updated_at: '2025-06-09T11:54:16-04:00'
  //   }
  // }

  return "ok";
};
