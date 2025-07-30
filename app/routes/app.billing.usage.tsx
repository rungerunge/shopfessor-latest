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
import { Page, Layout, Frame, Banner, List } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../lib/shopify.server";
import { createSuccessResponse } from "app/utils/error-handling.server";
import {
  getCurrentShop,
  getActivePlans,
  getUsageRecords,
  getSubscriptionData,
  createSubscription,
  createUsageRecordWithValidation,
} from "app/services/billing/billing-usage.server";
import { SubscriptionStatusCard } from "app/components/Features/Billing/Usage/SubscriptionStatusCard";
import { UsageRecordsTable } from "app/components/Features/Billing/Usage/UsageRecordTable";
import { PlanSelection } from "app/components/Features/Billing/Usage/PlanSection";
import { UsageRecordForm } from "app/components/Features/Billing/Usage/UsageRecordForm";
import type { LoaderData, UsageActivity } from "app/types/billing";

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
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10;

  const shop = await getCurrentShop(session.shop);
  if (!shop) {
    throw new Error("Shop not found");
  }
  // Get subscription data using service
  const {
    currentSubscription,
    usageLineItemId,
    subscriptionData,
    monthlyUsage,
  } = await getSubscriptionData(request, shop);


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
    const confirmationUrl = await createSubscription(admin, session, planId);
    return redirect(confirmationUrl, { target: "_top" });
  }

  if (actionType === "create_usage_record") {
    const description = formData.get("description") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const subscriptionLineItemId = formData.get(
      "subscriptionLineItemId",
    ) as string;

    try {
      const result = await createUsageRecordWithValidation(admin, shop, {
        description,
        amount,
        subscriptionLineItemId,
      });

      return createSuccessResponse(result);
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

  const scrollToPlanSelection = () => {
    const planSelectionElement = document.getElementById("plan-selection");
    if (planSelectionElement) {
      planSelectionElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <Frame>
      <Page
        title="Usage Subscription Billing"
        backAction={{ content: "Billing", url: "/app/billing" }}
      >
        <Layout>
          {/* No Subscription Warning Banner */}
          {!currentSubscription && (
            <Layout.Section>
              <Banner
                title="Before you can start tracking usage and billing, you need to subscribe to a plan:"
                action={{
                  content: "Choose Plan",
                  onAction: scrollToPlanSelection,
                }}
                tone="warning"
              >
                <List>
                  <List.Item>
                    You don't have an active subscription. Select a plan below
                    to start using our billing features.
                  </List.Item>
                  <List.Item>
                    Usage tracking and billing records will be available once
                    you subscribe to a plan.
                  </List.Item>
                </List>
              </Banner>
            </Layout.Section>
          )}

          {/* Current Subscription Status */}
          {currentSubscription && (
            <Layout.Section>
              <SubscriptionStatusCard
                subscriptionData={subscriptionData}
                monthlyUsage={monthlyUsage}
              />
            </Layout.Section>
          )}

          {/* Create Usage Record - Only show if subscribed */}
          {currentSubscription && (
            <Layout.Section variant="oneThird">
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

          {/* Usage Records Table - Only show if subscribed */}
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
            <div id="plan-selection">
              <PlanSelection
                plans={plans}
                onSubscribe={handleSubscribe}
                isLoading={isSubscriptionLoading}
                selectedPlanId={selectedPlan}
              />
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
