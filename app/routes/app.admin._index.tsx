import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  DataTable,
  EmptyState,
  Grid,
} from "@shopify/polaris";
import { PlusIcon, ViewIcon, AnalyticsIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "app/lib/shopify.server";
import { sectionService } from "app/services/section.server";
import { categoryService } from "app/services/category.server";
import { installationService } from "app/services/installation.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  try {
    // Get all sections
    const { sections, total } = await sectionService.getSectionsByCategory(undefined, 1, 50);
    
    // Get categories
    const categories = await categoryService.getAllCategories();

    // Get installation analytics
    const analytics = await installationService.getInstallationAnalytics(30);

    // Get stats
    const stats = {
      totalSections: total,
      totalCategories: categories.length,
      totalInstallations: analytics.totalInstallations,
      topSection: analytics.topSections[0] || null,
    };

    return json({
      sections,
      categories,
      analytics,
      stats,
    });
  } catch (error) {
    console.error("Failed to load admin dashboard:", error);
    return json({
      sections: [],
      categories: [],
      analytics: { dailyInstallations: [], topSections: [], totalInstallations: 0 },
      stats: { totalSections: 0, totalCategories: 0, totalInstallations: 0, topSection: null },
      error: "Failed to load dashboard data",
    });
  }
};

export default function AdminDashboard() {
  const { sections, categories, analytics, stats, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <Page>
        <TitleBar title="Admin Dashboard" />
        <Layout>
          <Layout.Section>
            <EmptyState
              heading="Failed to load dashboard"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>There was an error loading the admin dashboard. Please try again.</p>
            </EmptyState>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const sectionRows = sections.map((section) => [
    section.title,
    section.category.name,
    section.downloads,
    section.isActive ? "Active" : "Inactive",
    new Date(section.createdAt).toLocaleDateString(),
    <InlineStack gap="200" key={section.id}>
      <Button
        size="slim"
        icon={ViewIcon}
        as={Link}
        to={`/app/section/${section.id}`}
      >
        View
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page>
      <TitleBar 
        title="Admin Dashboard"
        primaryAction={{
          content: "Upload Section",
          url: "/app/admin/upload",
          icon: PlusIcon,
        }}
      />

      <Layout>
        {/* Stats Overview */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <BlockStack gap="200">
                  <Text variant="bodyMd" color="subdued">
                    Total Sections
                  </Text>
                  <Text variant="heading2xl" as="h2">
                    {stats.totalSections}
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <BlockStack gap="200">
                  <Text variant="bodyMd" color="subdued">
                    Categories
                  </Text>
                  <Text variant="heading2xl" as="h2">
                    {stats.totalCategories}
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <BlockStack gap="200">
                  <Text variant="bodyMd" color="subdued">
                    Total Installations
                  </Text>
                  <Text variant="heading2xl" as="h2">
                    {stats.totalInstallations}
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <BlockStack gap="200">
                  <Text variant="bodyMd" color="subdued">
                    Most Popular
                  </Text>
                  <Text variant="headingMd" as="h3">
                    {stats.topSection?.title || "N/A"}
                  </Text>
                  {stats.topSection && (
                    <Badge tone="success">
                      {stats.topSection.count} installs
                    </Badge>
                  )}
                </BlockStack>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">
                Quick Actions
              </Text>

              <InlineStack gap="300">
                <Button
                  variant="primary"
                  icon={PlusIcon}
                  as={Link}
                  to="/app/admin/upload"
                >
                  Upload New Section
                </Button>

                <Button
                  icon={AnalyticsIcon}
                  as={Link}
                  to="/app/admin/categories"
                >
                  Manage Categories
                </Button>

                <Button
                  as={Link}
                  to="/app/admin/analytics"
                >
                  View Analytics
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Top Sections */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingLg" as="h2">
                  Top Sections (Last 30 Days)
                </Text>
                <Button
                  as={Link}
                  to="/app/admin/analytics"
                >
                  View All Analytics
                </Button>
              </InlineStack>

              {analytics.topSections.length === 0 ? (
                <Text variant="bodyMd" color="subdued">
                  No installation data available yet.
                </Text>
              ) : (
                <BlockStack gap="200">
                  {analytics.topSections.slice(0, 5).map((section, index) => (
                    <InlineStack key={section.sectionId} align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <Badge tone="info">#{index + 1}</Badge>
                        <Text variant="bodyMd">{section.title}</Text>
                      </InlineStack>
                      <Badge tone="success">{section.count} installs</Badge>
                    </InlineStack>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Recent Sections */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingLg" as="h2">
                  Recent Sections
                </Text>
                <Button
                  as={Link}
                  to="/app/admin/upload"
                  icon={PlusIcon}
                >
                  Upload Section
                </Button>
              </InlineStack>

              {sections.length === 0 ? (
                <EmptyState
                  heading="No sections uploaded yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Upload your first section to get started with the Section Store.</p>
                  <Button
                    variant="primary"
                    as={Link}
                    to="/app/admin/upload"
                  >
                    Upload Section
                  </Button>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "text", "text", "text"]}
                  headings={["Title", "Category", "Downloads", "Status", "Created", "Actions"]}
                  rows={sectionRows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}