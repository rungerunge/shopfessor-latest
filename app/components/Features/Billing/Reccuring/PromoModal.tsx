import { useEffect, useState, useCallback } from "react";
import {
  BlockStack,
  Box,
  Button,
  InlineStack,
  Modal,
  Text,
  Select,
  TextField,
  InlineError,
  Icon,
} from "@shopify/polaris";
import { promoCode } from "app/assets";
import { ProductFilledIcon, XIcon } from "@shopify/polaris-icons";
import type { Plan } from "@prisma/client";

export function PromoModal({
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
  const [active, setActive] = useState(false);
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState(plans[0]?.id || "");

  const handleChange = useCallback(() => setActive(!active), [active]);

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

  useEffect(() => {
    if (message) {
      setActive(false);
    }
  }, [message]);

  // Clear error when code or plan changes
  useEffect(() => {
    if (error && (code || plan)) {
      onErrorChange?.("");
    }
  }, [code, plan, error, onErrorChange]);

  // Reset form when modal closes
  useEffect(() => {
    if (!active) {
      setCode("");
      onErrorChange?.("");
    }
  }, [active, onErrorChange]);

  const activator = (
    <div>
      {message ? (
        <Box
          padding="200"
          background="bg-fill-success-secondary"
          borderRadius="150"
        >
          <InlineStack gap="100" align="center">
            <Icon source={ProductFilledIcon} tone="success" />
            <Text as="p" variant="bodyLg" tone="success">
              {message}
            </Text>
            <Button
              variant="plain"
              size="large"
              icon={XIcon}
              onClick={onRemoveCoupon}
              accessibilityLabel="Remove promo code"
            />
          </InlineStack>
        </Box>
      ) : (
        <div onClick={handleChange} style={{ cursor: "pointer" }}>
          <Text as="p" variant="bodyLg" tone="base" fontWeight="bold">
            Have a promo code?
          </Text>
        </div>
      )}
    </div>
  );

  const options = plans
    .map((plan) => {
      // don't add the 'isFree' plans to the options
      if (!plan.isFree) {
        return {
          label: `${plan.name}${plan.hasOwnProperty("monthlyPrice") ? ` ($${plan.monthlyPrice}/month)` : ""}`,
          value: plan.id,
        };
      }
    })
    .filter((option) => option !== undefined);
  return (
    <Modal
      activator={activator}
      open={active}
      onClose={handleChange}
      title="Apply Promo Code"
      primaryAction={{
        content: "Apply Code",
        onAction: handleSubmit,
        loading: isLoading,
        disabled: !code.trim() || !plan || isLoading,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: handleChange,
          disabled: isLoading,
        },
      ]}
    >
      <Modal.Section>
        <InlineStack gap="400" align="start" wrap={false}>
          <Box padding="100" minWidth="60%">
            <BlockStack gap="300">
              <Text as="p" variant="headingMd">
                Enter your promo code to get a discount on your subscription.
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Promo codes are case-sensitive and must be active to be applied.
              </Text>

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
                style={{ width: "100%" }}
                method="POST"
              >
                <TextField
                  label="Promo Code"
                  autoComplete="off"
                  value={code || "SAVE10"}
                  onChange={setCode}
                  error={!!error}
                  disabled={isLoading}
                  placeholder="Enter your promo code"
                />
              </form>

              {error && <InlineError message={error} fieldID="promo-code" />}
            </BlockStack>
          </Box>

          <Box padding="200" minWidth="40%">
            <img
              src={promoCode}
              alt="Promo code illustration"
              style={{
                width: "100%",
                height: "auto",
                maxWidth: "200px",
              }}
            />
          </Box>
        </InlineStack>
      </Modal.Section>
    </Modal>
  );
}
