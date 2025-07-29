import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
  Box,
  ProgressBar,
  Banner,
  Icon,
} from "@shopify/polaris";
import { AlertTriangleIcon, StarFilledIcon } from "@shopify/polaris-icons";
import { SubscriptionData, MonthlyUsage } from "app/types/billing";

interface SubscriptionStatusCardProps {
  subscriptionData: SubscriptionData;
  monthlyUsage: MonthlyUsage;
}

export function SubscriptionStatusCard({
  subscriptionData,
  monthlyUsage,
}: SubscriptionStatusCardProps) {
  console.log("🔴 subscriptoin data: ", subscriptionData);
  console.log("🔴 motnthlly usage: ", monthlyUsage);
  const formatPrice = (price: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const usagePercentage =
    subscriptionData.cappedAmount > 0
      ? (monthlyUsage.totalAmount / subscriptionData.cappedAmount) * 100
      : 0;

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Current Usage Subscription
        </Text>
        <InlineStack align="space-between" blockAlign="start">
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              Plan
            </Text>
            <Text variant="headingLg" as="h3">
              {subscriptionData.planName || "Unknown Plan"}
            </Text>
            <div>
              <Badge tone="success">
                {subscriptionData.status || "ACTIVE"}
              </Badge>
            </div>
            {subscriptionData.currentPeriodEnd && (
              <Text as="p" variant="bodyMd" tone="subdued">
                Renews on {formatDate(subscriptionData.currentPeriodEnd)}
              </Text>
            )}
          </BlockStack>
          <BlockStack gap="200" inlineAlign="end">
            <Text as="p" variant="bodyMd">
              This Month's Usage
            </Text>
            <Text variant="headingLg" as="h3">
              {formatPrice(monthlyUsage.totalAmount)}
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              {monthlyUsage.recordCount} records
            </Text>
          </BlockStack>
        </InlineStack>

        <Divider />
        <InlineStack align="space-between">
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Monthly Base Fee
            </Text>
            <Text variant="headingMd" as="h4">
              {formatPrice(
                subscriptionData.recurringAmount,
                subscriptionData.recurringCurrency,
              )}
            </Text>
          </BlockStack>
          <BlockStack gap="200" inlineAlign="end">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Usage Cap
            </Text>
            <Text variant="headingMd" as="h4">
              {formatPrice(
                subscriptionData.cappedAmount,
                subscriptionData.cappedCurrency,
              )}
            </Text>
          </BlockStack>
        </InlineStack>

        {subscriptionData.usageTerms && (
          <Box
            padding="300"
            background="bg-surface-secondary"
            borderRadius="200"
          >
            <Text as="p" variant="bodyMd" tone="subdued">
              {subscriptionData.usageTerms}
            </Text>
          </Box>
        )}

        <Box>
          <BlockStack gap={"200"}>
            <InlineStack align="space-between" blockAlign="center">
              <Text as="p">Usage Progress</Text>
              <InlineStack gap="100" blockAlign="center">
                <Icon source={StarFilledIcon} />
                <Text
                  as="p"
                  variant="bodyMd"
                  tone={usagePercentage > 80 ? "critical" : "subdued"}
                >
                  {Math.round(usagePercentage)}%
                </Text>
              </InlineStack>
            </InlineStack>

            <ProgressBar
              progress={Math.min(usagePercentage, 100)}
              size="small"
              tone={
                usagePercentage > 95
                  ? "critical"
                  : usagePercentage > 80
                    ? "highlight"
                    : "primary"
              }
            />

            <InlineStack align="space-between" blockAlign="center">
              <Text as="p" variant="bodyMd">
                {formatPrice(monthlyUsage.totalAmount)} spent |{" "}
                {formatPrice(
                  subscriptionData.cappedAmount,
                  subscriptionData.cappedCurrency,
                )}{" "}
                limit
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {monthlyUsage.recordCount} records
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>

        {monthlyUsage.isOverCap && (
          <Banner tone="critical">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={AlertTriangleIcon} />
              <Text as="p" variant="bodyMd">
                You have reached your monthly usage cap! No additional charges
                will be applied this month.
              </Text>
            </InlineStack>
          </Banner>
        )}

        {monthlyUsage.isNearCap && !monthlyUsage.isOverCap && (
          <Banner tone="warning">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={AlertTriangleIcon} />
              <Text as="p" variant="bodyMd">
                You've used {Math.round(usagePercentage)}% of your monthly usage
                allowance.
              </Text>
            </InlineStack>
          </Banner>
        )}
      </BlockStack>
    </Card>
  );
}
