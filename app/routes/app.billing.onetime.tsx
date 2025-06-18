import { useState } from "react";
import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { Page, Layout, BlockStack, Text, Grid, Frame } from "@shopify/polaris";
import { authenticate } from "app/lib/shopify.server";
import type { BillingLoaderData } from "app/types/billing";
import { UsageStatsCard } from "app/components/Features/Billing/OneTime/UsageStatsCard";
import { PlanCard } from "app/components/Features/Billing/OneTime/PlanCard";
import { PurchaseHistory } from "app/components/Features/Billing/OneTime/PurchaseHistory";
import {
  getCurrentUsage,
  getRecentPurchases,
  getAvailablePlans,
  createOneTimePurchase,
} from "app/services/billing-onetime.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const [currentUsage, recentPurchases, plans] = await Promise.all([
    getCurrentUsage(),
    getRecentPurchases(session.shop),
    getAvailablePlans(),
  ]);

  return json<BillingLoaderData>({
    shop: session.shop,
    currentUsage,
    recentPurchases,
    plans,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin, redirect } = await authenticate.admin(request);
  const formData = await request.formData();
  const planId = formData.get("planId") as string;

  const { confirmationUrl } = await createOneTimePurchase(
    planId,
    session.shop,
    admin,
  );
  return redirect(confirmationUrl, { target: "_top" });
}

export default function UsageBillingPage() {
  const { currentUsage, recentPurchases, plans } =
    useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const isLoading = navigation.state === "submitting";

  const handlePurchase = (planId: string) => {
    setSelectedPlan(planId);
    const formData = new FormData();
    formData.append("planId", planId);
    submit(formData, { method: "post" });
  };

  return (
    <Frame>
      <Page
        title="Usage Billing"
        backAction={{ content: "Settings", url: "/app/billing" }}
      >
        <Layout>
          <Layout.Section>
            <UsageStatsCard usage={currentUsage} />
          </Layout.Section>

          <Layout.Section>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Purchase Additional Credits
              </Text>

              {plans.length === 0 ? (
                <Text as="p" variant="bodyMd" tone="subdued">
                  No credit packages are currently available. Please check back
                  later.
                </Text>
              ) : (
                <Grid columns={{ xs: 1, sm: 1, md: 2, lg: 4, xl: 4 }}>
                  {plans.map((plan) => (
                    <Grid.Cell key={plan.id}>
                      <PlanCard
                        plan={plan}
                        isLoading={isLoading}
                        isSelected={selectedPlan === plan.id}
                        onPurchase={handlePurchase}
                      />
                    </Grid.Cell>
                  ))}
                </Grid>
              )}
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <PurchaseHistory purchases={recentPurchases} />
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
