import { useEffect, useState } from "react";
import {
  BlockStack,
  Box,
  Button,
  InlineStack,
  Text,
  Select,
  TextField,
  InlineError,
  Icon,
  Card,
  Banner,
} from "@shopify/polaris";
import { ProductFilledIcon, XIcon } from "@shopify/polaris-icons";
import type { Plan } from "@prisma/client";

export function PromoCard({
  plans,
  onSubmit,
  isLoading = false,
  error = "",
  onErrorChange,
  message,
  onRemoveCoupon,
}: {
  plans: Plan[];
  onSubmit: (data: { code: string; plan: string }) => void;
  isLoading?: boolean;
  error?: string;
  onErrorChange?: (error: string) => void;
  message: string | null;
  onRemoveCoupon: () => void;
}) {
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState(plans[0]?.id || "");

  const handleSubmit = async () => {
    if (!code.trim() || !plan) {
      onErrorChange?.("Please select a plan and enter a promo code.");
      return;
    }
    // Clear any existing error
    onErrorChange?.("");

    // Call parent's submit handler
    onSubmit({ code: code.trim(), plan });
  };

  // Clear error when code or plan changes
  useEffect(() => {
    if (error && (code || plan)) {
      onErrorChange?.("");
    }
  }, [code, plan, error, onErrorChange]);

  // Reset form when error is cleared
  useEffect(() => {
    if (!error) {
      setCode("");
    }
  }, [error]);

  const options = plans
    .map((plan) => {
      // don't add the 'isFree' plans to the options
      if (!plan.isFree) {
        return {
          label: `${plan.name}${plan.hasOwnProperty("monthlyPrice") ? ` ($${plan.monthlyPrice || 0}/month)` : ""}`,
          value: plan.id,
        };
      }
    })
    .filter((option) => option !== undefined);

  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <InlineStack gap="200">
            <Text as="h3" variant="headingLg">
              Discount Code
            </Text>
          </InlineStack>

          <BlockStack gap="400">
            <BlockStack gap="200">
              <InlineStack gap="100">
                <Text as="p" variant="bodyMd" fontWeight="medium">
                  {message
                    ? "Apply another discount"
                    : "Get a discount on your subscription"}
                </Text>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Enter your promo code below. Codes are case-sensitive and must
                be active to be applied.
              </Text>
            </BlockStack>

            <Select
              label="Choose Plan"
              options={options}
              value={plan}
              onChange={setPlan}
              disabled={isLoading}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!isLoading && code.trim() && plan) {
                  handleSubmit();
                }
              }}
            >
              <InlineStack align="space-between" blockAlign="end" gap={"400"}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Promo Code"
                    autoComplete="off"
                    value={code}
                    onChange={setCode}
                    error={!!error}
                    disabled={isLoading}
                    placeholder="Enter your promo code"
                  />
                </div>
                <div>
                  <Button
                    variant="primary"
                    size="large"
                    onClick={handleSubmit}
                    loading={isLoading}
                    disabled={!code.trim() || !plan || isLoading}
                  >
                    Apply
                  </Button>
                </div>
              </InlineStack>
            </form>

            {error && <InlineError message={error} fieldID="promo-code" />}
          </BlockStack>
          {message && (
            <Banner
              title="Discount Applied"
              tone="info"
              action={{
                content: "Remove",
                onAction: onRemoveCoupon,
              }}
            >
              <Text as="p" variant="bodyMd">
                {message}
              </Text>
            </Banner>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
}
