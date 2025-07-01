import { useState, useEffect } from "react";
import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useFetcher,
  useSearchParams,
} from "@remix-run/react";
import { Page, Layout, Frame } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../lib/shopify.server";
import {
  handleActionError,
  createSuccessResponse,
} from "app/utils/error-handling.server";
import {
  getCurrentShop,
  getActivePlans,
  getUsageRecords,
  getMonthlyUsage,
  createUsageRecord,
  CREATE_USAGE_SUBSCRIPTION,
  CREATE_USAGE_RECORD,
} from "app/services/billing-usage.server";
import { SubscriptionStatusCard } from "app/components/Features/Billing/Usage/SubscriptionStatusCard";
import { UsageRecordsTable } from "app/components/Features/Billing/Usage/UsageRecordTable";
import { PlanSelection } from "app/components/Features/Billing/Usage/PlanSection";
import { UsageRecordForm } from "app/components/Features/Billing/Usage/UsageRecordForm";
import { LoaderData, UsageActivity } from "app/types/billing";
import prisma from "app/lib/db.server";
import { getCurrentSubscriptions } from "app/models/billing.server";

// Simulated usage activity types
const USAGE_ACTIVITIES: UsageActivity[] = [
  { id: "api_call", name: "API Call", description: "Single API request" },
  { id: "data_sync", name: "Data Sync", description: "Product/inventory sync" },
  { id: "email_send", name: "Email Send", description: "Automated email" },
  { id: "sms_send", name: "SMS Send", description: "SMS notification" },
  {
    id: "report_generate",
    name: "Report Generation",
    description: "Analytics report",
  },
];

// Loader function
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10;

  const shop = await getCurrentShop(session.shop);
  if (!shop) {
    throw new Error("Shop not found");
  }

  let currentSubscription = null;
  let usageLineItemId = null;
  let subscriptionData = {
    planName: null,
    status: null,
    cappedAmount: 0,
    cappedCurrency: "USD",
    recurringAmount: 0,
    recurringCurrency: "USD",
    usageTerms: null,
    currentPeriodEnd: null,
  };
  let monthlyUsage = {
    totalAmount: 0,
    recordCount: 0,
    cappedAmount: 0,
    isNearCap: false,
    isOverCap: false,
  };

  try {
    // Fetch current subscription
    const { subscriptions, errors } = await getCurrentSubscriptions(request);

    if (subscriptions.length > 0) {
      currentSubscription = subscriptions[0];
      subscriptionData.planName = currentSubscription.name;
      subscriptionData.status = currentSubscription.status;
      subscriptionData.currentPeriodEnd = currentSubscription.currentPeriodEnd;

      const usageLineItem = currentSubscription.lineItems.find(
        (item: any) =>
          item.plan.pricingDetails.__typename === "AppUsagePricing",
      );

      const recurringLineItem = currentSubscription.lineItems.find(
        (item: any) =>
          item.plan.pricingDetails.__typename === "AppRecurringPricing",
      );

      if (usageLineItem) {
        usageLineItemId = usageLineItem.id;
        subscriptionData.cappedAmount = parseFloat(
          usageLineItem.plan.pricingDetails.cappedAmount.amount,
        );
        subscriptionData.cappedCurrency =
          usageLineItem.plan.pricingDetails.cappedAmount.currencyCode;
        subscriptionData.usageTerms = usageLineItem.plan.pricingDetails.terms;
        monthlyUsage.cappedAmount = subscriptionData.cappedAmount;
      }

      if (recurringLineItem) {
        subscriptionData.recurringAmount = parseFloat(
          recurringLineItem.plan.pricingDetails.price.amount,
        );
        subscriptionData.recurringCurrency =
          recurringLineItem.plan.pricingDetails.price.currencyCode;
      }

      const usageData = await getMonthlyUsage(shop.id, currentSubscription.id);
      monthlyUsage.totalAmount = usageData.totalAmount;
      monthlyUsage.recordCount = usageData.recordCount;

      // Check cap status
      const usagePercentage =
        monthlyUsage.cappedAmount > 0
          ? (monthlyUsage.totalAmount / monthlyUsage.cappedAmount) * 100
          : 0;

      monthlyUsage.isNearCap = usagePercentage >= 80;
      monthlyUsage.isOverCap = usagePercentage >= 100;
    }
  } catch (error) {
    console.error("Error fetching subscription:", error);
  }

  const plans = await getActivePlans();
  const { records: usageRecords, pagination } = await getUsageRecords(
    shop.id,
    page,
    pageSize,
  );

  return json<LoaderData>({
    shop: session.shop,
    currentSubscription,
    usageLineItemId,
    subscriptionData,
    monthlyUsage,
    plans,
    usageRecords,
    pagination,
  });
}

// Action function
export async function action({ request }: ActionFunctionArgs) {
  const { admin, redirect, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;

  const shop = await getCurrentShop(session.shop);
  if (!shop) {
    throw new Error("Shop not found");
  }

  if (actionType === "create_subscription") {
    const planId = formData.get("planId") as string;
    const selectedPlan = await prisma.plan.findUnique({
      where: {
        id: planId,
        isActive: true,
      },
    });

    if (!selectedPlan) {
      return handleActionError("Invalid plan selected", "create_subscription");
    }

    let usageData = {
      usageCappedAmount: 100.0,
      usageTerms: "$0.10 per API call up to $100/month",
    };

    if (Number(selectedPlan.monthlyPrice) >= 30) {
      usageData = {
        usageCappedAmount: 500.0,
        usageTerms: "$0.08 per API call up to $500/month",
      };
    }
    if (Number(selectedPlan.monthlyPrice) >= 100) {
      usageData = {
        usageCappedAmount: 2000.0,
        usageTerms: "$0.05 per API call up to $2000/month",
      };
    }

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

    const data = await response.json();

    if (data.data?.appSubscriptionCreate?.userErrors?.length > 0) {
      const errors = data.data.appSubscriptionCreate.userErrors;
      return handleActionError(
        errors.map((err: any) => err.message).join(", "),
        "create_subscription",
      );
    }

    const confirmationUrl = data.data?.appSubscriptionCreate?.confirmationUrl;
    if (!confirmationUrl) {
      return handleActionError(
        "No confirmation URL received",
        "create_subscription",
      );
    }

    return redirect(confirmationUrl!, { target: "_top" });
  }

  if (actionType === "create_usage_record") {
    const description = formData.get("description") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const subscriptionLineItemId = formData.get(
      "subscriptionLineItemId",
    ) as string;

    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyTotal = await prisma.usageCharge.aggregate({
        where: {
          shopId: shop.id,
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          price: true,
        },
      });

      const currentMonthlyUsage = Number(monthlyTotal._sum.price || 0);
      const monthlyCapAmount = 500.0; // Get this from subscription data

      if (currentMonthlyUsage + amount > monthlyCapAmount) {
        return json(
          {
            success: false,
            error: `Usage record would exceed monthly cap of $${monthlyCapAmount}. Current usage: $${currentMonthlyUsage}`,
          },
          { status: 400 },
        );
      }

      // Create usage record in Shopify
      const response = await admin.graphql(CREATE_USAGE_RECORD, {
        variables: {
          description,
          price: {
            amount,
            currencyCode: "USD",
          },
          subscriptionLineItemId,
        },
      });

      const data = await response.json();

      if (data.data?.appUsageRecordCreate?.userErrors?.length > 0) {
        const errors = data.data.appUsageRecordCreate.userErrors;
        return json(
          {
            success: false,
            error: errors.map((err: any) => err.message).join(", "),
          },
          { status: 400 },
        );
      }

      const shopifyUsageRecord =
        data.data?.appUsageRecordCreate?.appUsageRecord;

      await createUsageRecord({
        description,
        amount,
        shopId: shop.id,
        shopifyId: shopifyUsageRecord?.id,
      });

      return createSuccessResponse({
        usageRecordId: shopifyUsageRecord?.id,
        message: "Usage record created successfully",
      });
    } catch (error) {
      console.error("Error creating usage record:", error);
      return json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create usage record",
        },
        { status: 500 },
      );
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function UsageSubscriptionPage() {
  const {
    currentSubscription,
    usageLineItemId,
    subscriptionData,
    monthlyUsage,
    plans,
    usageRecords,
    pagination,
  } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const usageFetcher = useFetcher();
  const shopify = useAppBridge();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [usageDescription, setUsageDescription] = useState("");
  const [usageAmount, setUsageAmount] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("api_call");

  const isSubscriptionLoading =
    navigation.state === "submitting" &&
    navigation.formData?.get("_action") === "create_subscription";
  const isUsageLoading = usageFetcher.state === "submitting";

  // Handle usage record response
  useEffect(() => {
    if (usageFetcher.data && usageFetcher.state === "idle") {
      if ((usageFetcher.data as any).success) {
        shopify.toast.show((usageFetcher.data as any).data.message);
        setUsageDescription("");
        setUsageAmount("");
        window.location.reload();
      } else {
        shopify.toast.show((usageFetcher.data as any).error, { isError: true });
      }
    }
  }, [usageFetcher.data, usageFetcher.state, shopify]);

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    const formData = new FormData();
    formData.append("_action", "create_subscription");
    formData.append("planId", planId);
    submit(formData, { method: "post" });
  };

  const handleCreateUsageRecord = () => {
    if (!usageLineItemId || !usageDescription || !usageAmount) {
      shopify.toast.show("Please fill in all fields", { isError: true });
      return;
    }

    // Check if adding this usage would exceed cap
    const newAmount = parseFloat(usageAmount);
    if (monthlyUsage.totalAmount + newAmount > monthlyUsage.cappedAmount) {
      shopify.toast.show(
        `Usage record would exceed monthly cap of $${monthlyUsage.cappedAmount}. Current usage: $${monthlyUsage.totalAmount}`,
        { isError: true },
      );
      return;
    }

    const formData = new FormData();
    formData.append("_action", "create_usage_record");
    formData.append("description", usageDescription);
    formData.append("amount", usageAmount);
    formData.append("subscriptionLineItemId", usageLineItemId);

    usageFetcher.submit(formData, { method: "post" });
  };

  const generateUsageRecord = (activityType: string) => {
    const activity = USAGE_ACTIVITIES.find((a) => a.id === activityType);
    if (!activity) return;

    const currentPlan = plans.find((plan) =>
      subscriptionData.planName?.includes(plan.name.split(" ")[0]),
    );

    const unitPrice = currentPlan?.perUnitPrice || 0.1;

    setUsageDescription(`${activity.name} - ${activity.description}`);
    setUsageAmount(unitPrice.toString());
  };

  const handlePagination = (direction: "next" | "previous") => {
    const newPage =
      direction === "next" ? pagination.page + 1 : pagination.page - 1;
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", newPage.toString());
    setSearchParams(newSearchParams);
  };

  return (
    <Frame>
      <Page
        title="Usage Subscription Billing"
        backAction={{ content: "Billing", url: "/app/billing" }}
      >
        <Layout>
          {/* Current Subscription Status */}
          {currentSubscription && (
            <Layout.Section>
              <SubscriptionStatusCard
                subscriptionData={subscriptionData}
                monthlyUsage={monthlyUsage}
              />
            </Layout.Section>
          )}

          {/* Create Usage Record */}
          {currentSubscription && (
            <Layout.Section>
              <UsageRecordForm
                activities={USAGE_ACTIVITIES}
                selectedActivity={selectedActivity}
                onActivityChange={(value) => {
                  setSelectedActivity(value);
                  generateUsageRecord(value);
                }}
                description={usageDescription}
                onDescriptionChange={setUsageDescription}
                amount={usageAmount}
                onAmountChange={setUsageAmount}
                onSubmit={handleCreateUsageRecord}
                onGenerate={() => generateUsageRecord(selectedActivity)}
                isLoading={isUsageLoading}
                isDisabled={!usageLineItemId}
              />
            </Layout.Section>
          )}

          {/* Usage Records Table */}
          {currentSubscription && (
            <Layout.Section>
              <UsageRecordsTable
                records={usageRecords}
                pagination={pagination}
                onPageChange={handlePagination}
              />
            </Layout.Section>
          )}

          {/* Plan Selection */}
          <Layout.Section>
            <PlanSelection
              plans={plans}
              onSubscribe={handleSubscribe}
              isLoading={isSubscriptionLoading}
              selectedPlanId={selectedPlan}
            />
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
