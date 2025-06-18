import { Card, Text, BlockStack, InlineStack, Banner } from "@shopify/polaris";
import type { UsageStats } from "app/types/billing";

interface UsageStatsCardProps {
  usage: UsageStats;
}

export function UsageStatsCard({ usage }: UsageStatsCardProps) {
  const usagePercentage = (usage.apiCallsUsed / usage.totalCredits) * 100;

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Current Usage
        </Text>
        <InlineStack align="space-between">
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              API Calls Used
            </Text>
            <Text variant="headingLg" as="h3">
              {usage.apiCallsUsed.toLocaleString()} /{" "}
              {usage.totalCredits.toLocaleString()}
            </Text>
          </BlockStack>
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              Remaining Credits
            </Text>
            <Text
              variant="headingLg"
              as="h3"
              tone={usage.apiCallsRemaining < 50 ? "critical" : "success"}
            >
              {usage.apiCallsRemaining.toLocaleString()}
            </Text>
          </BlockStack>
        </InlineStack>

        {usagePercentage > 80 && (
          <Banner tone="warning">
            <Text as="p" variant="bodyMd">
              You've used {Math.round(usagePercentage)}% of your API calls.
              Consider purchasing additional credits to avoid service
              interruption.
            </Text>
          </Banner>
        )}

        {usagePercentage > 95 && (
          <Banner tone="critical">
            <Text as="p" variant="bodyMd">
              You're running low on API calls! Purchase additional credits now
              to continue using the service.
            </Text>
          </Banner>
        )}
      </BlockStack>
    </Card>
  );
}
