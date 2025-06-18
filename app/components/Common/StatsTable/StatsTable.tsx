import { BlockStack, Card, Text, DataTable, Link } from "@shopify/polaris";

export function StatsTable({ title, items }) {
  const rows = items.map((product) => [
    <Link removeUnderline url={product.url} key={product.sku}>
      {product.name}
    </Link>,
    product.sku,
    product.quantity,
    product.sales,
  ]);

  return (
    <BlockStack gap="500">
      <Text as="p" variant="headingLg" fontWeight="bold">
        {title}
      </Text>
      <Card padding="0">
        <DataTable
          columnContentTypes={["text", "numeric", "numeric", "numeric"]}
          headings={["Product", "SKU Number", "Quantity", "Net sales"]}
          rows={rows}
        />
      </Card>
    </BlockStack>
  );
}
