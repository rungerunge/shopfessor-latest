import {
  BlockStack,
  InlineStack,
  Text,
  Card,
  Badge,
  ProgressBar,
  Icon,
  Spinner,
} from "@shopify/polaris";
import {
  LinkIcon,
  FileIcon,
  TextIcon,
  CheckIcon,
  XCircleIcon,
} from "@shopify/polaris-icons";
import { ProcessingItem } from "app/types/data-sources";
import { useEffect, useState } from "react";

interface ProcessingQueueProps {
  processingQueue: ProcessingItem[];
}

export function ProcessingQueue({ processingQueue }: ProcessingQueueProps) {
  if (processingQueue.length === 0) {
    return null;
  }

  const getSourceIcon = (type: string) => {
    if (type.includes("Documents")) return FileIcon;
    if (type.includes("URLs")) return LinkIcon;
    if (type.includes("Text")) return TextIcon;
    return FileIcon;
  };

  const getStatusIcon = (status: ProcessingItem["status"]) => {
    switch (status) {
      case "completed":
        return CheckIcon;
      case "failed":
        return XCircleIcon;
      case "processing":
        return Spinner;
      default:
        return undefined;
    }
  };

  const getStatusTone = (status: ProcessingItem["status"]) => {
    switch (status) {
      case "completed":
        return "success";
      case "failed":
        return "critical";
      case "processing":
        return "info";
      default:
        return "attention";
    }
  };

  const getProgressColor = (status: ProcessingItem["status"]) => {
    switch (status) {
      case "completed":
        return "success";
      case "failed":
        return "critical";
      case "processing":
        return "info";
      default:
        return "base";
    }
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text as="h2" variant="headingMd">
            Processing Queue
          </Text>
          <Badge tone="attention">
            {`${processingQueue.length} processing`}
          </Badge>
        </InlineStack>

        <BlockStack gap="300">
          {processingQueue.map((item) => (
            <Card key={item.id}>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <InlineStack gap="200">
                    <Icon source={getSourceIcon(item.type)} />
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyMd" fontWeight="medium">
                        {item.name}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {item.stage}
                      </Text>
                    </BlockStack>
                  </InlineStack>

                  <InlineStack gap="200" align="center">
                    {item.status === "processing" && <Spinner size="small" />}
                    {item.status === "completed" && (
                      <Icon source={CheckIcon} tone="success" />
                    )}
                    {item.status === "failed" && (
                      <Icon source={XCircleIcon} tone="critical" />
                    )}
                    <Badge tone={getStatusTone(item.status)}>
                      {item.status}
                    </Badge>
                  </InlineStack>
                </InlineStack>

                <BlockStack gap="200">
                  <ProgressBar progress={item.progress} size="small" />
                  <Text as="p" variant="bodySm" tone="subdued">
                    {item.status === "completed"
                      ? "Processing completed successfully"
                      : item.status === "failed"
                        ? `Failed: ${item.error || "Unknown error"}`
                        : `${Math.round(item.progress)}% complete`}
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
