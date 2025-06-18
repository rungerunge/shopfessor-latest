import dayjs from "dayjs";
import { BlockStack, Card, Text, Divider, InlineStack } from "@shopify/polaris";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface ActivityItem {
  id: string | number;
  activity: string;
  date: string | Date;
}

interface ActivityProps {
  title: string;
  activities: ActivityItem[];
}

export function Activity({ title, activities }: ActivityProps) {
  return (
    <BlockStack gap="500">
      <Text as="p" variant="headingLg" fontWeight="bold">
        {title}
      </Text>
      <Card>
        <BlockStack gap="400">
          {activities.map((item) => (
            <BlockStack key={item.id} gap="200">
              <InlineStack gap="100" align="space-between">
                <Text as="p" variant="headingMd">
                  {item.activity}
                </Text>
                <Text as="p" variant="bodySm">
                  {dayjs(item.date).fromNow()}
                </Text>
              </InlineStack>
              <Divider />
            </BlockStack>
          ))}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
