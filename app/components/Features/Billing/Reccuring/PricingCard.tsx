import {
  BlockStack,
  Card,
  Text,
  InlineStack,
  Box,
  Button,
  Badge,
  ButtonGroup,
  Icon,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

type PricingCardProps = {
  title: string;
  description?: string;
  price: string | number;
  originalPrice?: string | number;
  features?: string[];
  featuredText?: string;
  discountBadge?: string | null;
  button: {
    props?: Record<string, any>;
    content: string | string[];
  };
  frequency: string;
};

export const PricingCard = ({
  title,
  description,
  price,
  originalPrice,
  features,
  featuredText,
  discountBadge,
  button,
  frequency,
}: PricingCardProps) => {
  const hasDiscount = originalPrice && originalPrice !== price;

  return (
    <Box
      borderWidth={featuredText ? "050" : "0"}
      borderColor={featuredText ? "border-success" : "transparent"}
      borderRadius="300"
      position="relative"
      padding={"0"}
    >
      {featuredText && (
        <div
          style={{
            position: "absolute",
            top: "-1.2rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "1",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
          }}
        >
          <Badge size="large" tone="success">
            {featuredText}
          </Badge>
        </div>
      )}

      <Card>
        <BlockStack gap={"800"}>
          <Box padding={"200"}></Box>
          <BlockStack gap={"400"}>
            <BlockStack gap="200" align="start">
              <InlineStack gap={"200"}>
                <Text as="h3" variant="headingLg">
                  {title}
                </Text>

                {discountBadge && (
                  <Badge size="medium" tone="attention">
                    {discountBadge}
                  </Badge>
                )}
              </InlineStack>
              {description ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  {description}
                </Text>
              ) : null}
            </BlockStack>

            <BlockStack gap="100" align="start">
              <InlineStack blockAlign="end" gap="100" align="start">
                <Text as="h2" variant="heading2xl">
                  {price}
                </Text>
                <Box paddingBlockEnd="200">
                  <Text as="span" variant="bodySm">
                    / {frequency}
                  </Text>
                </Box>
              </InlineStack>

              {hasDiscount && (
                <InlineStack gap="100" align="start">
                  <Text
                    as="span"
                    variant="bodyMd"
                    tone="subdued"
                    textDecorationLine="line-through"
                  >
                    {originalPrice}
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    / {frequency}
                  </Text>
                </InlineStack>
              )}
            </BlockStack>

            <div
              style={{
                height: "200px",
              }}
            >
              <BlockStack gap="100">
                {features?.map((feature, id) => (
                  <InlineStack
                    blockAlign="start"
                    align="start"
                    gap="100"
                    wrap={false}
                    direction="row"
                    key={id}
                  >
                    <div>
                      <Icon source={CheckIcon} tone="base" />
                    </div>
                    <Text as="p" variant="bodyMd">
                      {feature}
                    </Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </div>
          </BlockStack>

          <Box paddingBlockStart="200" paddingBlockEnd="200">
            <ButtonGroup fullWidth>
              <Button {...button.props}>{button.content}</Button>
            </ButtonGroup>
          </Box>
        </BlockStack>
      </Card>
    </Box>
  );
};
