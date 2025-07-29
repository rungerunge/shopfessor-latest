import { useState } from "react";
import {
  Button,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  Icon,
  Badge,
  Box,
} from "@shopify/polaris";
import { StarFilledIcon, StarIcon, HeartIcon } from "@shopify/polaris-icons";

interface ReviewProps {
  onReviewRequested?: () => void;
  onReviewCompleted?: () => void;
}

export default function ShopifyReview({
  onReviewRequested,
  onReviewCompleted,
}: ReviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const triggerReview = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      onReviewRequested?.();
      const result = await (shopify as any).reviews.request();

      if (result.success) {
        setSuccess(true);
        onReviewCompleted?.();
        console.log("Review modal displayed successfully");
      } else {
        setError(
          `Review modal not displayed. Reason: ${result.code}: ${result.message}`,
        );
        console.log(
          `Review modal not displayed. Reason: ${result.code}: ${result.message}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Error requesting review:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setSuccess(false);
    triggerReview();
  };

  const resetComponent = () => {
    setSuccess(false);
    setError(null);
  };

  return (
    <Card padding="600">
      <BlockStack gap="600">
        {/* Header Section */}
        <Box>
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="400" blockAlign="center">
              <Box
                background="bg-surface-brand"
                padding="200"
                borderRadius="200"
              >
                <Icon source={StarFilledIcon} tone="warning" />
              </Box>
              <BlockStack>
                <Text as="h2" variant="headingMd">
                  Enjoying our app?
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Leave us a review on the App Store
                </Text>
              </BlockStack>
            </InlineStack>

            {success && (
              <Badge tone="success" size="large">
                <InlineStack gap="150" blockAlign="center">
                  <Icon source={HeartIcon} />
                  <Text variant="bodyMd">Thank you!</Text>
                </InlineStack>
              </Badge>
            )}
          </InlineStack>
        </Box>

        {/* Error State */}
        {error && (
          <Banner
            title="Unable to open review"
            tone="critical"
            action={{ content: "Try again", onAction: handleRetry }}
          >
            <Text as="p" variant="bodyMd">
              {error}
            </Text>
          </Banner>
        )}

        {/* Success State */}
        {success && (
          <Banner title="Thank you for your review!" tone="success">
            <Text as="p" variant="bodyMd">
              Your feedback helps us improve and helps other merchants discover
              our app.
            </Text>
          </Banner>
        )}

        {/* Benefits Section */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyLg">
            Your review helps us improve our app and helps other merchants
            discover tools that can grow their business.
          </Text>
          <Text as="h3" variant="headingMd">
            Why leave a review?
          </Text>
          <BlockStack gap="200">
            <Box
              background="bg-surface-secondary"
              padding="200"
              borderRadius="200"
            >
              <InlineStack gap="300" blockAlign="center">
                <Box
                  background="bg-surface-brand"
                  padding="200"
                  borderRadius="200"
                >
                  <Icon source={StarFilledIcon} tone="base" />
                </Box>
                <Text as="span" variant="bodyMd">
                  Help us improve our features and support
                </Text>
              </InlineStack>
            </Box>

            <Box
              background="bg-surface-secondary"
              padding="200"
              borderRadius="200"
            >
              <InlineStack gap="300" blockAlign="center">
                <Box
                  background="bg-surface-brand"
                  padding="200"
                  borderRadius="200"
                >
                  <Icon source={HeartIcon} tone="base" />
                </Box>
                <Text as="span" variant="bodyMd">
                  Guide other merchants to discover our app
                </Text>
              </InlineStack>
            </Box>

            <Box
              background="bg-surface-secondary"
              padding="200"
              borderRadius="200"
            >
              <InlineStack gap="300" blockAlign="center">
                <Box
                  background="bg-surface-brand"
                  padding="200"
                  borderRadius="200"
                >
                  <Icon source={StarIcon} tone="base" />
                </Box>
                <Text as="span" variant="bodyMd">
                  Share your experience with the community
                </Text>
              </InlineStack>
            </Box>
          </BlockStack>
        </BlockStack>

        {/* Action Buttons */}
        <InlineStack gap="300" align="end">
          <Button
            variant="primary"
            size="large"
            loading={isLoading}
            disabled={success}
            onClick={triggerReview}
            icon={StarIcon}
          >
            {isLoading
              ? "Opening review..."
              : success
                ? "Review submitted"
                : "Leave a review"}
          </Button>

          {success && (
            <Button variant="secondary" size="large" onClick={resetComponent}>
              Review again
            </Button>
          )}
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
