import {
  Card,
  Text,
  BlockStack,
  Grid,
  Badge,
  Box,
  Button,
} from "@shopify/polaris";
import { Plan } from "app/types/billing";

interface PlanSelectionProps {
  plans: Plan[];
  onSubscribe: (planId: string) => void;
  isLoading: boolean;
  selectedPlanId: string | null;
}

export function PlanSelection({
  plans,
  onSubscribe,
  isLoading,
  selectedPlanId,
}: PlanSelectionProps) {
  const formatPrice = (price: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  return (
    <BlockStack gap="500">
      <Text variant="headingLg" as="h2">
        Choose Your Plan
      </Text>
      <Grid>
        {plans.map((plan) => (
          <Grid.Cell key={plan.id} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4 }}>
            <Card>
              <BlockStack gap="400">
                {plan.isFeatured && (
                  <div>
                    <Badge tone="success">Most Popular</Badge>
                  </div>
                )}
                <Text variant="headingMd" as="h3">
                  {plan.name}
                </Text>
                <Text as="p">{plan.description}</Text>
                <Box>
                  <Text as="span" variant="headingXl">
                    {formatPrice(plan.monthlyPrice)}
                  </Text>
                  <Text as="span" tone="subdued">
                    /month
                  </Text>
                </Box>
                <Text as="p" tone="subdued">
                  {plan.usageTerms}
                </Text>
                <BlockStack gap="200">
                  {plan.features.map((feature, index) => (
                    <Text key={index} as="p">
                      ✓ {feature}
                    </Text>
                  ))}
                </BlockStack>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => onSubscribe(plan.id)}
                  loading={isLoading && selectedPlanId === plan.id}
                >
                  Subscribe
                </Button>
              </BlockStack>
            </Card>
          </Grid.Cell>
        ))}
      </Grid>
    </BlockStack>
  );
}
