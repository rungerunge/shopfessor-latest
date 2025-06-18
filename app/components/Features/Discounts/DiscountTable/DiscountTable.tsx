import { Card, DataTable, Badge, EmptyState } from "@shopify/polaris";
import { DiscountNode } from "app/types/discounts";

interface DiscountTableProps {
  discounts: DiscountNode[];
}

export function DiscountTable({ discounts }: DiscountTableProps) {
  // Prepare table data
  const rows = discounts.map((node) => {
    const discount = node.discount;
    const isCodeDiscount = discount.__typename?.includes("Code");
    const discountCode = isCodeDiscount
      ? discount.codes?.nodes[0]?.code || "N/A"
      : "Automatic";

    return [
      discount.title,
      discount.discountClass?.toLowerCase().replace("_", " "),
      isCodeDiscount ? "Code" : "Automatic",
      discountCode,
      new Date(discount.startsAt).toLocaleDateString(),
      discount.endsAt
        ? new Date(discount.endsAt).toLocaleDateString()
        : "No end date",
      isCodeDiscount ? discount.usageLimit?.toString() || "Unlimited" : "N/A",
      <Badge tone="success" key={`status-${node.id}`}>
        Active
      </Badge>,
    ];
  });

  if (discounts.length === 0) {
    return (
      <Card>
        <EmptyState
          heading="Create your first discount"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            Start by creating a discount code or automatic discount to boost
            sales.
          </p>
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <DataTable
        columnContentTypes={[
          "text", // Title
          "text", // Type
          "text", // Method
          "text", // Code
          "text", // Start Date
          "text", // End Date
          "text", // Usage Limit
          "text", // Status
        ]}
        headings={[
          "Title",
          "Type",
          "Method",
          "Code",
          "Start Date",
          "End Date",
          "Usage Limit",
          "Status",
        ]}
        rows={rows}
        sortable={[true, true, true, false, true, true, false, false]}
      />
    </Card>
  );
}
