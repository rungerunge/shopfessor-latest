import { Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Icon,
  Badge,
  Divider,
  Grid,
} from "@shopify/polaris";
import {
  CartIcon,
  SettingsIcon,
  ReceiptDollarFilledIcon,
  AppsIcon,
  ClockIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";

export default function Index() {
  const navigationCards = [
    {
      title: "Products",
      description:
        "Manage your Shopify store's product catalog, inventory levels, and product variants directly from the app.",
      path: "/app/products",
      icon: CartIcon,

      backgroundColorToken: "bg-fill-success",
    },
    {
      title: "Settings",
      description:
        "Configure app-specific preferences, integrations, and general store settings relevant to your Shopify app's functionality.",
      path: "/app/settings",
      icon: SettingsIcon,
      backgroundColorToken: "bg-fill-info",
    },
    {
      title: "Billing",
      description:
        "Access your Shopify app's subscription details, view usage-based charges, and manage your billing information.",
      path: "/app/billing",
      icon: ReceiptDollarFilledIcon,
      backgroundColorToken: "bg-fill-warning",
    },
    {
      title: "Components",
      description:
        "Explore and test various Polaris UI components and design patterns for building consistent and intuitive Shopify app interfaces.",
      path: "/app/components",
      icon: AppsIcon,
      backgroundColorToken: "bg-fill-primary",
    },
    {
      title: "Queue Tasks",
      description:
        "Monitor the status and progress of background jobs, asynchronous tasks, and system processes initiated by your Shopify app.",
      path: "/app/admin/queues",
      icon: ClockIcon,

      backgroundColorToken: "bg-surface-secondary",
    },
  ];

  return (
    <Page>
      <TitleBar title="ShopiFast Dashboard" />

      <BlockStack gap="800">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <InlineStack
                    align="space-between"
                    blockAlign="center"
                    wrap={false}
                  >
                    <Text as="h1" variant="headingXl">
                      Welcome to ShopiFast ⚡
                    </Text>
                    <Badge tone="success">v2.0</Badge>
                  </InlineStack>
                  <Text variant="bodyLg" as="p" tone="subdued">
                    Your lightning-fast Shopify app development platform. Build,
                    deploy, and scale your e-commerce solutions with ease.
                  </Text>
                </BlockStack>

                <Box
                  background="bg-surface-secondary"
                  padding="400"
                  borderRadius="200"
                  overflowX="hidden"
                >
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      🚀 Quick Start Guide
                    </Text>
                    <Text variant="bodyMd" as="p">
                      Get started by exploring your products, configuring
                      settings, or checking out our component library.
                      Everything you need to build amazing Shopify experiences
                      is right here.
                    </Text>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Navigate Your App
              </Text>

              <Grid
                columns={{
                  xs: 1,
                  sm: 2,
                  md: 2,
                  lg: 2,
                  xl: 2,
                }}
              >
                {navigationCards.map((card, index) => (
                  <Grid.Cell key={index}>
                    <div style={{ height: "100%" }}>
                      <Card>
                        <BlockStack gap="400">
                          <Box padding="0">
                            <BlockStack gap="400">
                              <InlineStack gap="300" align="start">
                                <Box
                                  background="bg-fill-brand"
                                  padding="200"
                                  borderRadius="200"
                                >
                                  <Text as="p" tone="text-inverse">
                                    <Icon source={card.icon} tone="inherit" />
                                  </Text>
                                </Box>
                                <BlockStack gap="100">
                                  <Text as="h3" variant="headingMd">
                                    {card.title}
                                  </Text>
                                  <Text as="p" variant="bodyMd" tone="subdued">
                                    {card.description}
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                            </BlockStack>
                          </Box>

                          <Divider />

                          <InlineStack align="end">
                            <Link
                              to={card.path}
                              style={{ textDecoration: "none" }}
                            >
                              <Button
                                variant="primary"
                                fullWidth
                                accessibilityLabel={`Open ${card.title}`}
                              >
                                Open {card.title}
                              </Button>
                            </Link>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    </div>
                  </Grid.Cell>
                ))}
              </Grid>
            </BlockStack>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  🛠️ Tech Stack
                </Text>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd">
                      Framework
                    </Text>
                    <Badge tone="info">Remix</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd">
                      Database
                    </Text>
                    <Badge tone="success">Prisma</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd">
                      UI Library
                    </Text>
                    <Badge tone="attention">Polaris</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd">
                      API
                    </Text>
                    <Badge tone="warning">GraphQL</Badge>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  📈 Next Steps
                </Text>
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd">
                    • Start by managing your products and inventory
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • Configure your app settings for optimal performance
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • Explore our component library for UI inspiration
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • Monitor background tasks in the queue manager
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <Box paddingBlock={"2000"} paddingBlockEnd={"2000"}>
                <Text
                  as="h3"
                  variant="headingMd"
                  tone="subdued"
                  alignment="center"
                >
                  Built with ❤️ & ShopiFast • Happy Hacking!
                </Text>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
