import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../lib/shopify.server";

// Fake product data for testing
const FAKE_PRODUCTS = {
  "239434": {
    id: "239434",
    title: "Awesome T-Shirt",
    description: "A really cool t-shirt that everyone loves",
    price: "$29.99",
    status: "active",
    inventory: 150,
    vendor: "Cool Clothing Co",
    created_at: "2024-01-15",
    tags: ["clothing", "t-shirt", "casual"],
    product_type: "Apparel",
    handle: "awesome-t-shirt",
  },
  "123456": {
    id: "123456",
    title: "Premium Hoodie",
    description: "Comfortable premium hoodie for cold weather",
    price: "$59.99",
    status: "active",
    inventory: 75,
    vendor: "Warm Wear Inc",
    created_at: "2024-02-01",
    tags: ["clothing", "hoodie", "winter"],
    product_type: "Apparel",
    handle: "premium-hoodie",
  },
  "789012": {
    id: "789012",
    title: "Classic Jeans",
    description: "Timeless denim jeans that never go out of style",
    price: "$79.99",
    status: "draft",
    inventory: 200,
    vendor: "Denim Dreams",
    created_at: "2024-01-20",
    tags: ["clothing", "jeans", "denim"],
    product_type: "Apparel",
    handle: "classic-jeans",
  },
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const productId = params.product_id;

  if (!productId) {
    throw new Response("Product ID is required", { status: 400 });
  }

  // For testing, use fake data
  const product = FAKE_PRODUCTS[productId as keyof typeof FAKE_PRODUCTS];

  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  return json({
    product,
    shopDomain: session.shop,
  });
};

export default function ProductDetail() {
  const { product, shopDomain } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge tone="success">Active</Badge>;
      case "draft":
        return <Badge tone="info">Draft</Badge>;
      case "archived":
        return <Badge tone="attention">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getInventoryStatus = (inventory: number) => {
    if (inventory > 100)
      return { status: "success" as const, text: "In stock" };
    if (inventory > 10)
      return { status: "warning" as const, text: "Low stock" };
    return { status: "critical" as const, text: "Very low stock" };
  };

  const inventoryStatus = getInventoryStatus(product.inventory);

  return (
    <Page
      backAction={{
        content: "Products",
        onAction: () => navigate("/app/products"),
      }}
      title={product.title}
      titleMetadata={getStatusBadge(product.status)}
      primaryAction={{
        content: "Edit product",
        onAction: () => {
          // Navigate to edit page or open edit modal
          console.log("Edit product", product.id);
        },
      }}
      secondaryActions={[
        {
          content: "View in store",
          onAction: () => {
            window.open(
              `https://${shopDomain}/products/${product.handle}`,
              "_blank",
            );
          },
        },
        {
          content: "Duplicate",
          onAction: () => {
            console.log("Duplicate product", product.id);
          },
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Product Overview */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Product Overview
                </Text>
                <Divider />
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p" fontWeight="medium">
                      Product ID:
                    </Text>
                    <Text variant="bodyMd" as="p">
                      {product.id}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p" fontWeight="medium">
                      Price:
                    </Text>
                    <Text variant="bodyMd" as="p">
                      {product.price}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p" fontWeight="medium">
                      Vendor:
                    </Text>
                    <Text variant="bodyMd" as="p">
                      {product.vendor}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p" fontWeight="medium">
                      Product Type:
                    </Text>
                    <Text variant="bodyMd" as="p">
                      {product.product_type}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p" fontWeight="medium">
                      Created:
                    </Text>
                    <Text variant="bodyMd" as="p">
                      {product.created_at}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Inventory */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Inventory
                </Text>
                <Divider />
                <InlineStack align="space-between">
                  <BlockStack gap="200">
                    <Text variant="bodyLg" as="p" fontWeight="semibold">
                      {product.inventory} units
                    </Text>
                    <Badge status={inventoryStatus.status}>
                      {inventoryStatus.text}
                    </Badge>
                  </BlockStack>
                  <div>
                    <Button variant="primary" size="slim">
                      Adjust inventory
                    </Button>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Description */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Description
                </Text>
                <Divider />
                <Text variant="bodyMd" as="p">
                  {product.description}
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            {/* Status */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Status
                </Text>
                <Divider />
                <Box paddingBlockStart="200">
                  {getStatusBadge(product.status)}
                </Box>
              </BlockStack>
            </Card>

            {/* Tags */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Tags
                </Text>
                <Divider />
                <InlineStack gap="200" wrap={false}>
                  {product.tags.map((tag, index) => (
                    <Badge key={index}>{tag}</Badge>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Debug Info */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Debug Info
                </Text>
                <Divider />
                <BlockStack gap="200">
                  <Text variant="bodySm" as="p" tone="subdued">
                    <strong>Route:</strong> /app/products/{product.id}
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    <strong>Shop:</strong> {shopDomain}
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    <strong>Handle:</strong> {product.handle}
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
