import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
  Box,
  Button,
} from "@shopify/polaris";
import type { Plan } from "app/types/billing";

interface PlanCardProps {
  plan: Plan;
  isLoading: boolean;
  isSelected: boolean;
  onPurchase: (planId: string) => void;
}

export function PlanCard({
  plan,
  isLoading,
  isSelected,
  onPurchase,
}: PlanCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Card>
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: "280px", // Adjust this value based on your needs,
            gap: "10px",
          }}
        >
          {/* Badge section - fixed height container */}
          <div style={{ minHeight: "24px" }}>
            {plan.isFeatured && <Badge tone="success">Most Popular</Badge>}
            {plan.isFree && <Badge tone="info">Free</Badge>}
          </div>

          {/* Header section */}
          <BlockStack gap="200">
            <Text variant="headingMd" as="h3">
              {plan.name}
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              {plan.description}
            </Text>
          </BlockStack>

          <Divider />

          {/* Content section - this will grow to fill available space */}
          <div style={{ flex: 1 }}>
            <BlockStack gap="200">
              <InlineStack align="space-between">
                <Text as="p" variant="bodyMd">
                  Credits
                </Text>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  {plan.credits?.toLocaleString() || "N/A"}
                </Text>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="p" variant="bodyMd">
                  Price
                </Text>
                <Text
                  as="p"
                  variant="headingMd"
                  tone={plan.isFree ? "subdued" : "success"}
                >
                  {plan.isFree ? "Free" : formatPrice(plan.monthlyPrice)}
                </Text>
              </InlineStack>
              {!plan.isFree && plan.credits && (
                <InlineStack align="space-between">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Per credit
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    ${(plan.monthlyPrice / plan.credits).toFixed(3)}
                  </Text>
                </InlineStack>
              )}
            </BlockStack>
          </div>

          {/* Button section - always at the bottom */}
          <div style={{ marginTop: "auto" }}>
            <Button
              variant={plan.isFeatured ? "primary" : "secondary"}
              size="large"
              fullWidth
              disabled={isLoading}
              loading={isLoading && isSelected}
              onClick={() => onPurchase(plan.id)}
            >
              {isLoading && isSelected
                ? "Processing..."
                : plan.isFree
                  ? "Get Credits"
                  : "Purchase Now"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
