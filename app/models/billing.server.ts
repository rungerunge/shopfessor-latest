import {
  CREATE_USAGE_SUBSCRIPTION,
  GET_CURRENT_SUBSCRIPTIONS,
  CANCEL_APP_SUBSCRIPTION,
  APP_ONE_TIME_PURCHASE_CREATE, // Import the new mutation
} from "app/graphql/billing";
import { authenticate } from "app/lib/shopify.server";
import type { UserError } from "app/types/admin.types.d";

export async function getCurrentSubscriptions(request: Request) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(GET_CURRENT_SUBSCRIPTIONS);

  const responseJson = await response.json();

  return {
    errors: responseJson.data?.currentAppInstallation.userErrors as UserError[],
    subscriptions:
      responseJson.data?.currentAppInstallation?.activeSubscriptions || [],
  };
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

export async function createAppSubscription(
  request: Request,
  subscriptionData: SubscriptionInput,
) {
  const { admin, session } = await authenticate.admin(request);

  const { selectedPlan, usageData } = subscriptionData;

  const subscriptionInput = {
    name: selectedPlan.name,
    returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing`,
    usageTerms: usageData.usageTerms,
    usageCappedAmount: usageData.usageCappedAmount,
    usageCurrencyCode: "USD",
    recurringAmount: Number(selectedPlan.monthlyPrice),
    recurringCurrencyCode: "USD",
    test: process.env.NODE_ENV !== "production",
  };

  const response = await admin.graphql(CREATE_USAGE_SUBSCRIPTION, {
    variables: subscriptionInput,
  });

  const responseJson = await response.json();

  // Check for user errors
  if (responseJson.data?.appSubscriptionCreate?.userErrors?.length > 0) {
    const errors = responseJson.data.appSubscriptionCreate.userErrors;
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
}

export async function cancelAppSubscription(request: Request, id: string) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(CANCEL_APP_SUBSCRIPTION, {
    variables: { id },
  });

  const responseJson = await response.json();

  // Check for user errors
  if (responseJson.data?.appSubscriptionCancel?.userErrors?.length > 0) {
    const errors = responseJson.data.appSubscriptionCancel.userErrors;
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
}

interface OneTimePurchaseInput {
  name: string;
  price: string | number; // Assuming price can be a string or number and will be converted to MoneyInput internally by GraphQL
}

export async function createOneTimePurchase(
  request: Request,
  purchaseData: OneTimePurchaseInput,
) {
  const { admin, session } = await authenticate.admin(request);

  const { name, price } = purchaseData;

  const purchaseInput = {
    name: name,
    price: {
      amount: Number(price), // Ensure amount is a number
      currencyCode: "USD",
    },
    returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/app/billing`, // Adjust return URL as needed
    test: process.env.NODE_ENV !== "production",
  };

  const response = await admin.graphql(APP_ONE_TIME_PURCHASE_CREATE, {
    variables: purchaseInput,
  });

  const responseJson = await response.json();

  // Check for user errors
  if (responseJson.data?.appPurchaseOneTimeCreate?.userErrors?.length > 0) {
    const errors = responseJson.data.appPurchaseOneTimeCreate.userErrors;
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
}
