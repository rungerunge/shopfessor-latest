import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  InlineStack,
  Layout,
  Link,
  Page,
  Text,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "../lib/shopify.server";
import { useLoaderData } from "@remix-run/react";
import { getYearlyPrice, LoaderData } from "app/utils/billing";
import { DomainLandingPageIcon, OutgoingIcon } from "@shopify/polaris-icons";
import { CancelSubscriptionButton } from "app/components/Features/Billing/Reccuring/CancelPlanButton";
import { BillingActivity } from "app/components/Features/Billing/Reccuring/BillingActivity";
import prisma from "app/lib/db.server";
import { UserActivity } from "@prisma/client";
import {
  getCurrentSubscriptions,
  createAppSubscription,
  cancelAppSubscription,
} from "app/services/billing/billing.server";

// Enhanced interfaces with proper TypeScript support
interface Subscription {
  id: string;
  name: string;
  status:
    | "ACTIVE"
    | "CANCELLED"
    | "DECLINED"
    | "EXPIRED"
    | "FROZEN"
    | "PENDING";
  createdAt: string;
  currentPeriodEnd?: string;
  test: boolean;
  lineItems: Array<{
    id: string;
    plan: {
      pricingDetails: {
        price: {
          amount: string;
          currencyCode: string;
        };
        interval: "ANNUAL" | "EVERY_30_DAYS";
      };
    };
  }>;
}

interface EnhancedLoaderData extends LoaderData {
  currentSubscription: Subscription | null;
  activities: UserActivity[];
  shopName: string;
}

// Loader function with improved error handling and TypeScript
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  const plans = await prisma.plan.findMany();

  let currentPlan = null;
  let currentSubscription: Subscription | null = null;
  let interval: "monthly" | "yearly" | null = null;

  const { subscriptions, errors } = await getCurrentSubscriptions(request);
  if (subscriptions.length > 0) {
    currentSubscription = subscriptions[0]; // Get the first active subscription
    // Determine current plan based on subscription name
    const subscriptionName = currentSubscription.name.toLowerCase();

    currentPlan = subscriptionName;

    // Get the billing interval
    const pricingInterval =
      currentSubscription.lineItems[0]?.plan?.pricingDetails?.interval;
    if (pricingInterval === "ANNUAL") {
      interval = "yearly";
    } else if (pricingInterval === "EVERY_30_DAYS") {
      interval = "monthly";
    }
  }

  // Fetch billing-related activities from the database
  const activities = await prisma.userActivity.findMany({
    where: {
      domain: session.shop,
      // activityType: {
      //   in: [
      //     "SUBSCRIPTION_CREATED",
      //     "SUBSCRIPTION_CANCELLED",
      //     "PAYMENT_SUCCESS",
      //     "PAYMENT_FAILED",
      //     "COUPON_APPLIED",
      //     "PLAN_CHANGED",
      //   ],
      // },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50, // Limit to latest 50 activities
  });
  return json<EnhancedLoaderData>({
    currentPlan,
    shop: session.shop,
    shopName: session.shop.split(".")[0] || session.shop,
    plans: plans,
    currentSubscription,
    interval,
    session,
    activities,
  });
}

// Action function to handle subscription changes and cancellations
export async function action({ request }: ActionFunctionArgs) {
  const { redirect } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Handle subscription cancellation
  if (intent === "cancel-subscription") {
    const subscriptionId = formData.get("subscriptionId") as string;

    if (!subscriptionId) {
      return json({ error: "Subscription ID is required" }, { status: 400 });
    }

    const { subscription, errors } = await cancelAppSubscription(
      request,
      subscriptionId,
    );

    if (errors?.length > 0) {
      return json({ error: errors[0].message }, { status: 400 });
    }

    if (!subscription) {
      return json({ error: "Failed to cancel subscription" }, { status: 500 });
    }

    return json({
      success: true,
      subscription: subscription,
    });
  }

  // Handle plan changes using the helper function
  const planId = formData.get("planId") as string;
  const billingCycle = formData.get("billingCycle") as "monthly" | "yearly";

  const plan = await prisma.plan.findFirst({
    where: {
      id: planId,
    },
  });

  if (!plan) {
    return json({ error: "Invalid plan selected" }, { status: 400 });
  }

  const price =
    billingCycle === "monthly"
      ? plan.monthlyPrice
      : getYearlyPrice(plan.monthlyPrice);

  try {
    // Use the helper function instead of inline GraphQL
    const result = await createAppSubscription(request, {
      selectedPlan: {
        name: `${plan.name} Plan - ${billingCycle} billing`,
        monthlyPrice: price,
      },
      usageData: {
        usageTerms: "Standard usage terms",
        usageCappedAmount: 1000,
      },
    });

    if (!result.success) {
      return json(
        {
          error: result.errorMessage || "Failed to create subscription",
        },
        { status: 400 },
      );
    }

    if (!result.confirmationUrl) {
      return json(
        { error: "Failed to create subscription - no confirmation URL" },
        { status: 500 },
      );
    }

    // Perform redirect outside try-catch
    return redirect(result.confirmationUrl, { target: "_top" });
  } catch (error) {
    console.error("Billing error:", error);
    return json({ error: "Failed to create subscription" }, { status: 500 });
  }
}

export default function SettingsPage() {
  const {
    currentPlan,
    currentSubscription,
    interval,
    session,
    activities,
    shopName,
  } = useLoaderData<typeof loader>();

  // Format subscription end date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get current plan details
  const getCurrentPlanDetails = () => {
    if (!currentPlan) return null;
    return {
      name: currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1),
      credits: currentPlan === "enterprise" ? "Unlimited" : "1000",
      price:
        currentSubscription?.lineItems[0]?.plan?.pricingDetails?.price.amount,
      interval: interval,
    };
  };

  const planDetails = getCurrentPlanDetails();

  return (
    <Page
      title="Settings"
      subtitle="Manage your app preferences and subscription"
      backAction={{ content: "Back", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Layout.AnnotatedSection
            id="storeDetails"
            title="Store Information"
            description="View your connected Shopify store details and domain information."
          >
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start">
                  <Text as="h3" variant="headingMd">
                    Connected Store
                  </Text>
                  <Badge tone="success">Active</Badge>
                </InlineStack>

                <InlineStack gap="300" blockAlign="center">
                  <Box
                    borderRadius="full"
                    background="bg-surface-secondary"
                    padding="200"
                  >
                    <Icon source={DomainLandingPageIcon} />
                  </Box>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Store Domain
                    </Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="p" fontWeight="semibold" variant="bodyMd">
                        {session.shop}
                      </Text>
                      <Link
                        url={`https://${session.shop}`}
                        target="_blank"
                        external
                      >
                        <Icon source={OutgoingIcon} tone="base" />
                      </Link>
                    </InlineStack>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.AnnotatedSection
            id="subscriptionPlan"
            title="Subscription Plan"
            description="Manage your current subscription plan, billing cycle, and usage credits."
          >
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between" blockAlign="start">
                  <Text as="h3" variant="headingMd">
                    Current Plan
                  </Text>
                  {currentPlan && (
                    <Badge
                      tone={
                        currentPlan === "enterprise"
                          ? "attention"
                          : currentPlan === "professional"
                            ? "info"
                            : "success"
                      }
                    >
                      {currentPlan.charAt(0).toUpperCase() +
                        currentPlan.slice(1)}
                    </Badge>
                  )}
                </InlineStack>

                {currentPlan && currentSubscription ? (
                  <BlockStack gap="300">
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Plan Details
                      </Text>
                      <Text as="p" variant="bodyMd">
                        You are currently subscribed to the{" "}
                        <Text as="span" fontWeight="semibold">
                          {currentPlan.charAt(0).toUpperCase() +
                            currentPlan.slice(1)}
                        </Text>{" "}
                        plan with {interval} billing.
                      </Text>
                      {currentSubscription.currentPeriodEnd && (
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Your subscription renews on{" "}
                          <Text as="span" fontWeight="medium">
                            {formatDate(currentSubscription.currentPeriodEnd)}
                          </Text>
                        </Text>
                      )}
                    </BlockStack>

                    <InlineStack gap="400" wrap={false}>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Billing Cycle
                        </Text>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          {interval?.charAt(0).toUpperCase() +
                            interval?.slice(1)}
                        </Text>
                      </BlockStack>

                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Available Credits
                        </Text>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          {planDetails?.credits || "Unlimited"} credits
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </BlockStack>
                ) : (
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      You don't have an active subscription plan.
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Choose a plan to unlock premium features and start using
                      the app.
                    </Text>
                  </BlockStack>
                )}

                <Box
                  paddingBlock="0"
                  borderColor="border"
                  borderBlockStartWidth="0165"
                />

                <InlineStack align="end" gap="300">
                  {currentPlan && currentSubscription && (
                    <CancelSubscriptionButton
                      subscriptionId={currentSubscription.id}
                      shopName={shopName}
                    />
                  )}
                  <Link url="/app/billing">
                    <Button variant="primary">
                      {currentPlan ? "Change Plan" : "Choose Plan"}
                    </Button>
                  </Link>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.AnnotatedSection
            id="billingActivity"
            title="Billing Activity"
            description="View your recent billing transactions and subscription history."
          >
            <BillingActivity activities={activities} />
          </Layout.AnnotatedSection>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
