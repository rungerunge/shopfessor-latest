import { useState } from "react";
import { Card, BlockStack, Text, InlineStack, Button } from "@shopify/polaris";
import { XIcon } from "@shopify/polaris-icons";

interface ReviewCardProps {
  title: string;
  description: string;
  onReview: (rating: number) => void;
  onClose: () => void;
}

export function ReviewCard({
  title,
  description,
  onReview,
  onClose,
}: ReviewCardProps): JSX.Element {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleStarClick = (index: number): void => {
    const newRating = index + 1;
    setRating(newRating);
    setIsSubmitted(true);

    setTimeout(() => {
      onReview(newRating);
    }, 300);
  };

  const renderStarIcon = (filled: boolean, index: number): JSX.Element => {
    const isActive = index < (hoverRating || rating);

    return (
      <div
        key={`star-${index}`}
        onClick={() => handleStarClick(index)}
        onMouseEnter={() => setHoverRating(index + 1)}
        onMouseLeave={() => setHoverRating(null)}
        style={{
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isActive ? "scale(1.1)" : "scale(1)",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill={isActive ? "#FFD700" : "#E5E7EB"}
          stroke={isActive ? "#FFA500" : "#9CA3AF"}
          strokeWidth="1"
          style={{
            transition: "all 0.2s ease",
          }}
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      </div>
    );
  };

  const getRatingText = (currentRating: number): string => {
    const ratingTexts = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
    return ratingTexts[currentRating] || "";
  };

  return (
    <Card>
      <BlockStack gap="400" align="start">
        <BlockStack gap={"200"}>
          <InlineStack align="space-between" blockAlign="start">
            <Text
              variant="headingLg"
              as="h2"
              tone={isSubmitted ? "success" : "base"}
            >
              {isSubmitted ? "Thank you!" : title}
            </Text>

            <Button
              icon={XIcon}
              variant="tertiary"
              onClick={onClose}
              accessibilityLabel="Close review card"
              size="large"
            />
          </InlineStack>

          <Text as="p" variant="bodyMd" tone="subdued">
            {isSubmitted ? "Your feedback has been recorded." : description}
          </Text>
        </BlockStack>

        {!isSubmitted && (
          <div style={{ position: "relative", zIndex: 1 }}>
            <BlockStack gap="300" align="center">
              <InlineStack gap="200" align="center">
                {[...Array(5)].map((_, index) => renderStarIcon(false, index))}
              </InlineStack>

              <div
                style={{
                  minHeight: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {(hoverRating || rating) > 0 && (
                  <Text
                    as="p"
                    variant="bodyMd"
                    tone="base"
                    alignment="center"
                    fontWeight="medium"
                  >
                    {getRatingText(hoverRating || rating)}
                  </Text>
                )}
              </div>
            </BlockStack>
          </div>
        )}

        {isSubmitted && (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              textAlign: "center",
              padding: "16px 0",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                borderRadius: "50%",
                marginBottom: "12px",
                animation: "bounce 0.6s ease-in-out",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
            <Text as="p" variant="bodyMd" tone="success" fontWeight="medium">
              Rating: {rating} star{rating !== 1 ? "s" : ""}
            </Text>
          </div>
        )}
      </BlockStack>

      <style>
        {`
              @keyframes bounce {
                0%, 20%, 53%, 80%, 100% {
                  transform: translate3d(0,0,0);
                }
                40%, 43% {
                  transform: translate3d(0, -8px, 0);
                }
                70% {
                  transform: translate3d(0, -4px, 0);
                }
                90% {
                  transform: translate3d(0, -2px, 0);
                }
              }
            `}
      </style>
    </Card>
  );
}
