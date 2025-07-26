import {
  BlockStack,
  InlineStack,
  Text,
  Card,
  Button,
  Badge,
  ProgressBar,
  Icon,
} from "@shopify/polaris";
import { LinkIcon, FileIcon, TextIcon } from "@shopify/polaris-icons";
import { ProcessingItem } from "app/types/data-sources";

interface ProcessingQueueProps {
  processingQueue: ProcessingItem[];
  onCancelProcessing: (id: string) => void;
}

export function ProcessingQueue({
  processingQueue,
  onCancelProcessing,
}: ProcessingQueueProps) {
  if (processingQueue.length === 0) {
    return null;
  }

  const getSourceIcon = (type: string) => {
    if (type.includes("Documents")) return FileIcon;
    if (type.includes("URLs")) return LinkIcon;
    if (type.includes("Text")) return TextIcon;
    return FileIcon;
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

                  <Button
                    size="slim"
                    tone="critical"
                    onClick={() => onCancelProcessing(item.id)}
                  >
                    Cancel
                  </Button>
                </InlineStack>

                <BlockStack gap="200">
                  <ProgressBar progress={item.progress} size="small" />
                  <Text as="p" variant="bodySm" tone="subdued">
                    {Math.round(item.progress)}% complete
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
