import {
  BlockStack,
  Box,
  Card,
  Icon,
  InlineStack,
  Text,
  Tooltip,
  Link,
} from "@shopify/polaris";
import React from "react";
import { Minus } from "lucide-react";
import { ChartVerticalFilledIcon } from "@shopify/polaris-icons";
import { FaSortUp, FaSortDown } from "react-icons/fa";

type StatsdCardProps = {
  title: string;
  description?: string;
  count: number;
  percentageChange: number;
  tooltipContent: string;
};

export function StatsdCard({
  title,
  description,
  count,
  percentageChange,
  tooltipContent,
}: StatsdCardProps) {
  const isPositive = percentageChange > 0;
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack direction="row" align="space-between" blockAlign="center">
          <Tooltip content={tooltipContent}>
            <Text as="p" variant="headingMd">
              <Link monochrome removeUnderline url="/settings">
                {title}
              </Link>
            </Text>
          </Tooltip>
          <Box>
            <Link monochrome removeUnderline url="#">
              <Icon source={ChartVerticalFilledIcon} />
            </Link>
          </Box>
        </InlineStack>
        <InlineStack direction="row" gap="200" blockAlign="center">
          <Text as="p" variant="heading2xl">
            {count}
          </Text>
          <Box color="text-inverse-secondary">
            <InlineStack align="center">
              <Minus size="18" />
            </InlineStack>
          </Box>
          <InlineStack gap="100" align="center">
            <Text as="p" variant="bodyLg" tone="text-inverse-secondary">
              {`${percentageChange}%`}
            </Text>
            <InlineStack align="center">
              {isPositive ? (
                <FaSortUp size="18" color="green" />
              ) : (
                <FaSortDown size="18" color="red" />
              )}
            </InlineStack>
          </InlineStack>
        </InlineStack>
        {description && (
          <Text as="p" variant="bodySm" tone="subdued">
            {description}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
