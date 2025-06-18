import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
  EmptyState,
} from "@shopify/polaris";
import type { Purchase } from "app/types/billing";

interface PurchaseHistoryProps {
  purchases: Purchase[];
}

export function PurchaseHistory({ purchases }: PurchaseHistoryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getBadgeTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "success";
      case "pending":
        return "attention";
      case "failed":
        return "critical";
      default:
        return "info";
    }
  };

  if (purchases.length === 0) {
    return (
      <Card>
        <EmptyState
          heading="No purchase history"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <Text as="p" variant="bodyMd" tone="subdued">
            Your purchase history will appear here once you make your first
            credit purchase.
          </Text>
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Purchase History
        </Text>

        <BlockStack gap="0">
          {purchases.map((purchase, index) => (
            <BlockStack key={purchase.id} gap="0">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="span" variant="bodyMd" fontWeight="medium">
                    {purchase.name}
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {formatDate(purchase.createdAt)}
                  </Text>
                </BlockStack>

                <InlineStack gap="300" blockAlign="center">
                  <BlockStack gap="050" align="end">
                    <Text as="span" variant="bodyMd" fontWeight="medium">
                      {formatPrice(purchase.price)}
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {purchase.credits.toLocaleString()} credits
                    </Text>
                  </BlockStack>

                  <Badge tone={getBadgeTone(purchase.status)} size="small">
                    {purchase.status.charAt(0).toUpperCase() +
                      purchase.status.slice(1)}
                  </Badge>
                </InlineStack>
              </InlineStack>

              {index < purchases.length - 1 && (
                <div style={{ margin: "12px 0" }}>
                  <Divider />
                </div>
              )}
            </BlockStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
