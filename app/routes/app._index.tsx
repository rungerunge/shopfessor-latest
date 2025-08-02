import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Badge,
  Grid,
  EmptyState,
  Pagination,
  Tabs,
  Thumbnail,
  Box,
} from "@shopify/polaris";
import { SearchIcon, PlusIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";

import { authenticate } from "app/lib/shopify.server";
import { categoryService } from "app/services/category.server";
import { sectionService } from "app/services/section.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 12;

  try {
    // Get categories
    const categories = await categoryService.getAllCategories();

    // Get sections based on filters
    let sectionsData;
    if (search) {
      sectionsData = await sectionService.searchSections(search, page, limit);
    } else if (categoryId === "trending") {
      const sections = await sectionService.getTrendingSections(limit);
      sectionsData = { sections, total: sections.length };
    } else if (categoryId === "newest") {
      const sections = await sectionService.getNewestSections(limit);
      sectionsData = { sections, total: sections.length };
    } else {
      sectionsData = await sectionService.getSectionsByCategory(categoryId || undefined, page, limit);
    }

    return json({
      categories,
      sections: sectionsData.sections,
      totalSections: sectionsData.total,
      currentPage: page,
      totalPages: Math.ceil(sectionsData.total / limit),
      currentCategory: categoryId,
      searchQuery: search,
    });
  } catch (error) {
    console.error("Failed to load sections:", error);
    return json({
      categories: [],
      sections: [],
      totalSections: 0,
      currentPage: 1,
      totalPages: 0,
      currentCategory: null,
      searchQuery: null,
      error: "Failed to load sections",
    });
  }
};

export default function SectionStore() {
  const {
    categories,
    sections,
    totalSections,
    currentPage,
    totalPages,
    currentCategory,
    searchQuery,
    error,
  } = useLoaderData<typeof loader>();

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchQuery || "");

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (searchValue) {
      newSearchParams.set("search", searchValue);
      newSearchParams.delete("category");
    } else {
      newSearchParams.delete("search");
    }
    newSearchParams.delete("page");
    setSearchParams(newSearchParams);
  }, [searchValue, searchParams, setSearchParams]);

  const handleCategorySelect = useCallback((categorySlug: string) => {
    const newSearchParams = new URLSearchParams();
    if (categorySlug !== "all") {
      newSearchParams.set("category", categorySlug);
    }
    setSearchParams(newSearchParams);
    setSearchValue("");
  }, [setSearchParams]);

  const handlePageChange = useCallback((page: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", page.toString());
    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  // Create tabs for categories
  const tabs = [
    { id: "all", content: "All Sections", url: "/app" },
    { id: "popular", content: "Popular", url: "/app?category=popular" },
    { id: "trending", content: "Trending", url: "/app?category=trending" },
    { id: "newest", content: "Newest", url: "/app?category=newest" },
    ...categories.map((category) => ({
      id: category.slug,
      content: `${category.icon} ${category.name}`,
      url: `/app?category=${category.slug}`,
    })),
  ];

  const selectedTab = currentCategory 
    ? tabs.findIndex(tab => tab.id === currentCategory)
    : 0;

  if (error) {
    return (
      <Page>
        <TitleBar title="Section Store" />
        <Layout>
          <Layout.Section>
            <EmptyState
              heading="Failed to load sections"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>There was an error loading the section store. Please try again.</p>
            </EmptyState>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar 
        title="Section Store" 
        primaryAction={{
          content: "Upload Section",
          url: "/app/admin/upload",
          icon: PlusIcon,
        }}
      />
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              {/* Header */}
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text variant="headingLg" as="h1">
                    Free Shopify Sections
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    Browse and install beautiful, free sections for your Shopify theme
                  </Text>
                </BlockStack>
                
                <div style={{ minWidth: "300px" }}>
                  <TextField
                    value={searchValue}
                    onChange={handleSearchChange}
                    placeholder="Search sections..."
                    prefix={<SearchIcon />}
                    onKeyPress={(e) => e.key === "Enter" && handleSearchSubmit()}
                    connectedRight={
                      <Button onClick={handleSearchSubmit}>Search</Button>
                    }
                    autoComplete="off"
                    label=""
                    labelHidden
                  />
                </div>
              </InlineStack>

              {/* Category Tabs */}
              <Tabs
                tabs={tabs}
                selected={selectedTab}
                onSelect={(index) => {
                  const tab = tabs[index];
                  handleCategorySelect(tab.id);
                }}
              />

              {/* Stats */}
              <InlineStack gap="400">
                <Badge>{totalSections} sections available</Badge>
                <Badge tone="success">100% Free</Badge>
                <Badge tone="info">No payment required</Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {sections.length === 0 ? (
            <EmptyState
              heading={searchQuery ? "No sections found" : "No sections available"}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              {searchQuery ? (
                <p>Try adjusting your search terms or browse different categories.</p>
              ) : (
                <p>Sections will appear here once they're uploaded to the store.</p>
              )}
            </EmptyState>
          ) : (
            <BlockStack gap="600">
              {/* Section Grid */}
              <Grid>
                {sections.map((section) => (
                  <Grid.Cell
                    key={section.id}
                    columnSpan={{ xs: 6, sm: 4, md: 3, lg: 3, xl: 3 }}
                  >
                    <Card>
                      <BlockStack gap="300">
                        {/* Preview Image */}
                        <Box>
                          {section.thumbnailUrl ? (
                            <Thumbnail
                              source={section.thumbnailUrl}
                              alt={section.title}
                              size="large"
                            />
                          ) : (
                            <div 
                              style={{
                                height: "200px",
                                backgroundColor: "#f6f6f7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "8px",
                              }}
                            >
                              <Text variant="bodyMd" color="subdued">
                                No preview
                              </Text>
                            </div>
                          )}
                        </Box>

                        {/* Section Info */}
                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="start">
                            <Text variant="headingSm" as="h3">
                              {section.title}
                            </Text>
                            <Badge tone="success">FREE</Badge>
                          </InlineStack>

                          {section.description && (
                            <Text variant="bodyMd" color="subdued">
                              {section.description.length > 100
                                ? `${section.description.substring(0, 100)}...`
                                : section.description}
                            </Text>
                          )}

                          <InlineStack gap="200">
                            <Badge>{section.category.name}</Badge>
                            <Text variant="bodySm" color="subdued">
                              {section.downloads} downloads
                            </Text>
                          </InlineStack>

                          {/* Tags */}
                          {section.tags.length > 0 && (
                            <InlineStack gap="100">
                              {section.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} tone="info" size="small">
                                  {tag}
                                </Badge>
                              ))}
                              {section.tags.length > 3 && (
                                <Text variant="bodySm" color="subdued">
                                  +{section.tags.length - 3} more
                                </Text>
                              )}
                            </InlineStack>
                          )}

                          {/* Actions */}
                          <InlineStack gap="200">
                            <Button
                              variant="primary"
                              as={Link}
                              to={`/app/section/${section.id}`}
                            >
                              Get Free Section
                            </Button>
                            <Button
                              variant="tertiary"
                              as={Link}
                              to={`/app/section/${section.id}?preview=true`}
                            >
                              Preview
                            </Button>
                          </InlineStack>
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                ))}
              </Grid>

              {/* Pagination */}
              {totalPages > 1 && (
                <InlineStack align="center">
                  <Pagination
                    hasNext={currentPage < totalPages}
                    hasPrevious={currentPage > 1}
                    onNext={() => handlePageChange(currentPage + 1)}
                    onPrevious={() => handlePageChange(currentPage - 1)}
                    label={`Page ${currentPage} of ${totalPages}`}
                  />
                </InlineStack>
              )}
            </BlockStack>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}