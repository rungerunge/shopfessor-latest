import {
  Page,
  Layout,
  BlockStack,
  Text,
  Frame,
  InlineStack,
  Button,
  InlineGrid,
  Grid,
  Card,
  Divider,
} from "@shopify/polaris";
import { DateRangePicker } from "../components/UI/DateRangePicker/DateRangePicker";
import { ChartVerticalFilledIcon } from "@shopify/polaris-icons";
import { Link } from "@remix-run/react";

import { Faqs } from "../components/Common/FAQs/FAQs";
import Carousel from "../components/Common/Carousel/Carousel";
import { StatsdCard } from "../components/Common/StatsCard/StatsCard";
import { Activity } from "../components/Common/Acitivity/Activity";
import { StatsTable } from "../components/Common/StatsTable/StatsTable";
import { ReviewCard } from "../components/Common/ReviewCard/ReviewCard";
import { Bg1, Bg2, Bg3, Bg4, ShopiFastLogo } from "../assets/index";
import { Advertisement } from "../components/Common/Advertisement/Advertisement";
import { useState } from "react";
import { StatBox } from "app/components/Common/ChartCard/ChartCard";
import {
  ProductResource,
  CollectionResource,
  VariantResource,
  ResourcePicker,
  ShopifyResource,
} from "app/components/Common/ResourcePicker/ResourcePicker";
import ShopifyReview from "app/components/Common/ShopifyReview/ShopifyReview";

const slides = [
  {
    title: "Streamlined Inventory Management",
    description:
      "Keep track of your stock levels in real-time and avoid overselling.",
    image: Bg1,
    link: {
      url: "/features/inventory-management",
      text: "Get started",
    },
    externalLink: {
      url: "https://externalapp.com/inventory",
      text: "Learn more",
    },
  },
  {
    title: "Advanced Analytics",
    description:
      "Gain insights into your sales performance and customer behavior with our advanced analytics tools.",
    image: Bg2,
    link: {
      url: "/features/analytics",
      text: "Get started",
    },
    externalLink: {
      url: "https://externalapp.com/analytics",
      text: "Learn more",
    },
  },
  {
    title: "Seamless Integration with Third-Party Apps",
    description:
      "Easily connect your store with popular apps to enhance functionality.",
    image: Bg3,
    link: {
      url: "/features/integrations",
      text: "Get started",
    },
    externalLink: {
      url: "https://externalapp.com/integration",
      text: "Learn more",
    },
  },
  {
    title: "Automated Marketing Campaigns",
    description:
      "Automate your email marketing campaigns and boost your sales effortlessly.",
    image: Bg4,
    link: {
      url: "/features/marketing",
      text: "Get started",
    },
    externalLink: {
      url: "https://externalapp.com/marketing",
      text: "Learn more",
    },
  },
];

const activities = [
  {
    id: 1,
    activity: "Product 'Winter Jacket' was updated.",
    date: "2024-05-25",
  },
  {
    id: 2,
    activity: "New product 'Summer Hat' was added.",
    date: "2024-05-24",
  },
  {
    id: 3,
    activity: "Product 'Running Shoes' was deleted.",
    date: "2024-05-23",
  },
  {
    id: 4,
    activity: "Product 'Winter Jacket' was updated.",
    date: "2024-05-22",
  },
  {
    id: 5,
    activity: "New product 'Summer Hat' was added.",
    date: "2024-05-21",
  },
];

const products = [
  {
    name: "Emerald Silk Gown",
    url: "https://www.example.com",
    sku: 124689,
    quantity: 140,
    sales: "$122,500.00",
  },
  {
    name: "Mauve Cashmere Scarf",
    url: "https://www.example.com",
    sku: 124533,
    quantity: 83,
    sales: "$19,090.00",
  },
  {
    name: "Navy Merino Wool Blazer with khaki chinos and yellow belt",
    url: "https://www.example.com",
    sku: 124518,
    quantity: 32,
    sales: "$14,240.00",
  },
  {
    name: "Black Cashmere Sweater",
    url: "https://www.example.com",
    sku: 124509,
    quantity: 12,
    sales: "$12,500.00",
  },
];

export default function ComponentsPage() {
  const [showAd, setShowAd] = useState(true);
  const inventoryStats = {
    lowStockItems: [23, 18, 25, 15, 12, 8, 6],
    topSellingProducts: [450, 520, 480, 580, 620, 590, 680],
    inventoryTurnover: [8.2, 8.8, 8.1, 9.2, 9.6, 9.3, 10.1],
  };

  // Single Product Picker States
  const [singleProduct, setSingleProduct] = useState<ProductResource | null>(
    null,
  );
  const [singleProductError, setSingleProductError] = useState<string | null>(
    null,
  );
  const [singleProductLoading, setSingleProductLoading] = useState(false);

  // Multiple Products Picker States
  const [multipleProducts, setMultipleProducts] = useState<ProductResource[]>(
    [],
  );
  const [multipleProductsError, setMultipleProductsError] = useState<
    string | null
  >(null);
  const [multipleProductsLoading, setMultipleProductsLoading] = useState(false);

  // Collection Picker States
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionResource | null>(null);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);

  // Variant Picker States
  const [selectedVariants, setSelectedVariants] = useState<VariantResource[]>(
    [],
  );
  const [variantError, setVariantError] = useState<string | null>(null);
  const [variantLoading, setVariantLoading] = useState(false);

  // Single Product Handlers
  const handleSingleProductSelect = async (resources: ShopifyResource[]) => {
    if (!resources.length) return;

    setSingleProductLoading(true);
    try {
      const product = resources[0] as ProductResource;
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSingleProduct(product);
      setSingleProductError(null);
    } catch (error) {
      setSingleProductError("Failed to select product");
    } finally {
      setSingleProductLoading(false);
    }
  };

  const handleSingleProductClear = () => {
    setSingleProduct(null);
    setSingleProductError(null);
  };

  // Multiple Products Handlers
  const handleMultipleProductsSelect = async (resources: ShopifyResource[]) => {
    if (!resources.length) return;

    setMultipleProductsLoading(true);
    try {
      const products = resources as ProductResource[];
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMultipleProducts(products);
      setMultipleProductsError(null);
    } catch (error) {
      setMultipleProductsError("Failed to select products");
    } finally {
      setMultipleProductsLoading(false);
    }
  };
  const handleMultipleProductsClear = () => {
    setMultipleProducts([]);
    setMultipleProductsError(null);
  };

  // Collection Handlers
  const handleCollectionSelect = async (resources: ShopifyResource[]) => {
    if (!resources.length) return;

    setCollectionLoading(true);
    try {
      const collection = resources[0] as CollectionResource;
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSelectedCollection(collection);
      setCollectionError(null);
    } catch (error) {
      setCollectionError("Failed to select collection");
    } finally {
      setCollectionLoading(false);
    }
  };

  const handleCollectionClear = () => {
    setSelectedCollection(null);
    setCollectionError(null);
  };

  // Variant Handlers
  const handleVariantSelect = async (resources: ShopifyResource[]) => {
    if (!resources.length) return;

    setVariantLoading(true);
    try {
      const variants = resources as VariantResource[];
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSelectedVariants(variants);
      setVariantError(null);
    } catch (error) {
      setVariantError("Failed to select variants");
    } finally {
      setVariantLoading(false);
    }
  };

  const handleVariantClear = () => {
    setSelectedVariants([]);
    setVariantError(null);
  };

  return (
    <Frame>
      <Page>
        <Layout>
          <Layout.Section>
            {showAd && (
              <Advertisement
                title="Build your shopify app faster!"
                description="Get your app up and running in no time with our easy-to-use platform. Start your free trial today."
                image={ShopiFastLogo}
                buttonText="Get it Now"
                url="https://shopifast.dev"
                onClose={() => setShowAd(false)}
              />
            )}
          </Layout.Section>

          <Layout.Section>
            <BlockStack gap="400">
              <InlineStack
                gap="400"
                direction="row"
                blockAlign="center"
                align="space-between"
              >
                <Text as="p" variant="headingLg">
                  Your Insights
                </Text>
                <InlineStack gap="400" direction="row" blockAlign="center">
                  <DateRangePicker />
                  <Link to="/reports/product">
                    <Button icon={ChartVerticalFilledIcon} size="large">
                      View reports
                    </Button>
                  </Link>
                </InlineStack>
              </InlineStack>
              <InlineGrid
                gap="400"
                columns={{
                  sm: 1,
                  md: 3,
                }}
              >
                <StatsdCard
                  title="Review request sent"
                  description="You have sent a review request to the customer."
                  count={12}
                  percentageChange={+2.4}
                  tooltipContent="This order has shipping labels."
                />
                <StatsdCard
                  title="New Orders"
                  description="New orders placed in the last 24 hours."
                  count={35}
                  percentageChange={+5.0}
                  tooltipContent="These are new orders."
                />
                <StatsdCard
                  title="Pending Shipments"
                  description="Orders that need to be shipped."
                  count={8}
                  percentageChange={-1.2}
                  tooltipContent="These orders are awaiting shipment."
                />
              </InlineGrid>
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <Grid
              columns={{
                xs: 1,
                sm: 3,
              }}
            >
              <Grid.Cell columnSpan={{ xs: 6, lg: 4 }}>
                <StatBox
                  title="Low Stock Items"
                  value={inventoryStats.lowStockItems.at(-1) || "0"}
                  data={inventoryStats.lowStockItems}
                />
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, lg: 4 }}>
                <StatBox
                  title="Top Products Sold"
                  value={
                    inventoryStats.topSellingProducts
                      .at(-1)
                      ?.toLocaleString() || "0"
                  }
                  data={inventoryStats.topSellingProducts}
                />
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, lg: 4 }}>
                <StatBox
                  title="Inventory Turnover"
                  value={`${inventoryStats.inventoryTurnover.at(-1) || "0"}x`}
                  data={inventoryStats.inventoryTurnover}
                />
              </Grid.Cell>
            </Grid>
          </Layout.Section>

          <Layout.Section>
            <InlineGrid
              gap="400"
              columns={{
                sm: 1,
                md: 2,
              }}
            >
              <StatsTable title="Top Products" items={products} />
              <Activity title="Recent activity" activities={activities} />
            </InlineGrid>
          </Layout.Section>

          <Layout.Section>
            <ShopifyReview />
          </Layout.Section>

          {/* Resource Pickers Section */}
          <Layout.Section>
            <BlockStack gap="600">
              <Text as="h2" variant="headingLg">
                Resource Pickers
              </Text>

              <InlineGrid
                gap="400"
                columns={{
                  sm: 1,
                  md: 2,
                }}
              >
                {/* Single Product Picker */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Single Product Picker
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Select a single product from your store
                    </Text>
                    <ResourcePicker
                      resourceType="product"
                      action="select"
                      selectedResource={singleProduct}
                      onResourceSelect={handleSingleProductSelect}
                      onClear={handleSingleProductClear}
                      loading={singleProductLoading}
                      disabled={false}
                      selectButtonText="Choose Product"
                      changeButtonText="Change Product"
                      showThumbnail={true}
                      thumbnailSize="small"
                      filters={{
                        query: "",
                        hidden: false,
                        variants: false,
                        draft: false,
                        archived: false,
                      }}
                      initialQuery=""
                      error={singleProductError}
                    />
                    {singleProduct && (
                      <Text as="p" variant="bodyMd" tone="success">
                        Selected: {singleProduct.title}
                      </Text>
                    )}
                  </BlockStack>
                </Card>

                {/* Multiple Products Picker */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Multiple Products Picker
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Select up to 5 products from your store
                    </Text>
                    <ResourcePicker
                      resourceType="product"
                      action="add"
                      multiple={5}
                      selectedResource={multipleProducts}
                      onResourceSelect={handleMultipleProductsSelect}
                      onClear={handleMultipleProductsClear}
                      loading={multipleProductsLoading}
                      disabled={false}
                      selectButtonText="Add Products"
                      changeButtonText="Change Selection"
                      showThumbnail={true}
                      thumbnailSize="small"
                      filters={{
                        query: "",
                        hidden: false,
                        variants: false,
                        draft: false,
                        archived: false,
                      }}
                      initialQuery=""
                      error={multipleProductsError}
                    />
                    {multipleProducts.length > 0 && (
                      <Text as="p" variant="bodyMd" tone="success">
                        Selected {multipleProducts.length} product(s)
                      </Text>
                    )}
                  </BlockStack>
                </Card>

                {/* Collection Picker */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Collection Picker
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Select a collection from your store
                    </Text>
                    <ResourcePicker
                      resourceType="collection"
                      action="select"
                      selectedResource={selectedCollection}
                      onResourceSelect={handleCollectionSelect}
                      onClear={handleCollectionClear}
                      loading={collectionLoading}
                      disabled={false}
                      selectButtonText="Select Collection"
                      changeButtonText="Change Collection"
                      showThumbnail={false}
                      filters={{
                        draft: false,
                        archived: false,
                      }}
                      initialQuery=""
                      error={collectionError}
                      preselectedResources={[]}
                    />
                    {selectedCollection && (
                      <Text as="p" variant="bodyMd" tone="success">
                        Selected: {selectedCollection.title}
                      </Text>
                    )}
                  </BlockStack>
                </Card>

                {/* Variant Picker */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Product Variants Picker
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Select product variants with inventory filters
                    </Text>
                    <ResourcePicker
                      resourceType="variant"
                      action="add"
                      multiple={true}
                      selectedResource={selectedVariants}
                      onResourceSelect={handleVariantSelect}
                      onClear={handleVariantClear}
                      loading={variantLoading}
                      disabled={false}
                      selectButtonText="Add Variants"
                      changeButtonText="Change Variants"
                      showThumbnail={true}
                      thumbnailSize="small"
                      filters={{
                        query: "inventory_quantity:>0",
                      }}
                      initialQuery="price:>10"
                      error={variantError}
                    />
                    {selectedVariants.length > 0 && (
                      <Text as="p" variant="bodyMd" tone="success">
                        Selected {selectedVariants.length} variant(s)
                      </Text>
                    )}
                  </BlockStack>
                </Card>
              </InlineGrid>
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <Divider />
          </Layout.Section>

          <Layout.Section>
            <Carousel slides={slides} />
          </Layout.Section>

          <Layout.Section>
            <ReviewCard
              title="How was your experience with our app?"
              description="We would love to hear your feedback to improve our services."
              onReview={() => {}}
              onClose={() => {}}
            />
          </Layout.Section>

          <Layout.Section>
            <Faqs />
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
