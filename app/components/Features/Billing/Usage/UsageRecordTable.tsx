import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  DataTable,
  Pagination,
  EmptyState,
  Badge,
} from "@shopify/polaris";
import { PaginationData } from "app/types/billing";

interface UsageRecord {
  id: string;
  description: string;
  price: number;
  quantity: number;
  currency: string;
  createdAt: Date;
  shopifyId: string | null;
}

interface UsageRecordsTableProps {
  records: UsageRecord[];
  pagination: PaginationData;
  onPageChange: (direction: "next" | "previous") => void;
}

export function UsageRecordsTable({
  records,
  pagination,
  onPageChange,
}: UsageRecordsTableProps) {
  const formatDateTime = (dateString: Date) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const usageTableRows = records.map((record) => [
    formatDateTime(record.createdAt),
    record.description,
    formatPrice(record.price, record.currency),
    record.quantity.toString(),
    record.shopifyId ? (
      <Badge tone="success">Synced</Badge>
    ) : (
      <Badge tone="attention">Pending</Badge>
    ),
  ]);

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h2">
            Usage History
          </Text>
        </InlineStack>

        {records.length > 0 ? (
          <>
            <DataTable
              columnContentTypes={[
                "text",
                "text",
                "numeric",
                "numeric",
                "text",
              ]}
              headings={[
                "Date & Time",
                "Description",
                "Amount",
                "Quantity",
                "Status",
              ]}
              rows={usageTableRows}
              footerContent={`Showing ${records.length} of ${pagination.total} records`}
            />
            <InlineStack align="center">
              <Pagination
                hasPrevious={pagination.page > 1}
                onPrevious={() => onPageChange("previous")}
                hasNext={pagination.page < pagination.totalPages}
                onNext={() => onPageChange("next")}
              />
            </InlineStack>
          </>
        ) : (
          <EmptyState
            heading="No usage records yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>When you use app features, the records will appear here.</p>
          </EmptyState>
        )}
      </BlockStack>
    </Card>
  );
}
