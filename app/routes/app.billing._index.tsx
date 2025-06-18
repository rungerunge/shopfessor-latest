import { Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  InlineStack,
  BlockStack,
  Icon,
  Badge,
  Divider,
  Box,
} from "@shopify/polaris";
import {
  CreditCardIcon,
  ClockIcon,
  GiftCardFilledIcon,
} from "@shopify/polaris-icons";

interface BillingOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  linkTo: string;
  badge?: string;
  badgeStatus?: "success" | "info" | "warning" | "critical" | "attention";
}

const billingOptions: BillingOption[] = [
  {
    id: "subscription",
    title: "Recurring Subscription",
    description:
      "Set up monthly or yearly subscription charges with automatic renewals. Perfect for SaaS features and premium services.",
    icon: CreditCardIcon,
    linkTo: "/app/billing/recurring",
    badge: "Popular",
    badgeStatus: "success",
  },
  {
    id: "usage",
    title: "Usage-Based Billing",
    description:
      "Charge customers based on actual usage metrics. Ideal for API calls, storage, or transaction-based pricing.",
    icon: ClockIcon,
    linkTo: "/app/billing/usage",
    badge: "Flexible",
    badgeStatus: "info",
  },
  {
    id: "onetime",
    title: "One-Time Purchases",
    description:
      "Single payment charges for premium features, add-ons, or standalone services without recurring fees.",
    icon: GiftCardFilledIcon,
    linkTo: "/app/billing/onetime",
    badge: "Simple",
    badgeStatus: "attention",
  },
];

export default function BillingIndex() {
  return (
    <Page
      title="Billing Management"
      subtitle="Choose and test different billing methods for your Shopify app"
      backAction={{ content: "Home", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="600">
              <BlockStack gap="200">
                <Text variant="headingLg" as="h2">
                  Billing Options
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Select a billing method to set up and test charges for your
                  app. Each option provides different ways to monetize your
                  Shopify app.
                </Text>
              </BlockStack>

              <Divider />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {billingOptions.map((option) => (
                  <Card key={option.id} background="bg-surface-secondary">
                    <BlockStack gap="400">
                      <InlineStack align="space-between" blockAlign="start">
                        <InlineStack gap="300" blockAlign="center">
                          <Box
                            background="bg-fill-brand"
                            padding="200"
                            borderRadius="200"
                          >
                            <Text as="p" tone="text-inverse">
                              <Icon source={option.icon} tone="inherit" />
                            </Text>
                          </Box>
                          <BlockStack gap="100">
                            <Text variant="headingMd" as="h3">
                              {option.title}
                            </Text>
                            {option.badge && (
                              <Badge status={option.badgeStatus}>
                                {option.badge}
                              </Badge>
                            )}
                          </BlockStack>
                        </InlineStack>
                      </InlineStack>

                      <Text variant="bodyMd" as="p" tone="subdued">
                        {option.description}
                      </Text>

                      <Box paddingBlockStart="200">
                        <Link
                          to={option.linkTo}
                          style={{ textDecoration: "none" }}
                        >
                          <Button
                            size="large"
                            variant="primary"
                            fullWidth
                            accessibilityLabel={`Test ${option.title}`}
                          >
                            Configure & Test
                          </Button>
                        </Link>
                      </Box>
                    </BlockStack>
                  </Card>
                ))}
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">
                  Getting Started
                </Text>
                <Text variant="bodyMd" as="p">
                  New to Shopify billing? Start with one-time purchases for
                  simplicity, then explore subscriptions for recurring revenue.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">
                  Best Practices
                </Text>
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p">
                    • Test thoroughly in development
                  </Text>
                  <Text variant="bodyMd" as="p">
                    • Clearly communicate pricing to users
                  </Text>
                  <Text variant="bodyMd" as="p">
                    • Handle billing errors gracefully
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
