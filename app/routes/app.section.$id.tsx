import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, Form, useSearchParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Select,
  Banner,
  Modal,
  Thumbnail,
  Code,
  Tabs,
  Box,
  Divider,
  DataTable,
} from "@shopify/polaris";
import { ArrowDownIcon, ViewIcon, CodeIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";

import { authenticate } from "app/lib/shopify.server";
import { sectionService } from "app/services/section.server";
import { shopifyThemeService } from "app/services/shopify-theme.server";
import { installationService } from "app/services/installation.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const sectionId = params.id;
  if (!sectionId) {
    throw new Response("Section not found", { status: 404 });
  }

  const url = new URL(request.url);
  const uploaded = url.searchParams.get("uploaded") === "true";

  try {
    // Get section details
    const section = await sectionService.getSectionById(sectionId);
    if (!section) {
      throw new Response("Section not found", { status: 404 });
    }

    // Get themes for installation
    const themes = await shopifyThemeService.getThemes(admin);

    // Get installation stats
    const installationStats = await installationService.getInstallationStats(sectionId);

    return json({
      section,
      themes,
      installationStats,
      uploaded,
    });
  } catch (error) {
    console.error("Failed to load section:", error);
    throw new Response("Failed to load section", { status: 500 });
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  const sectionId = params.id;
  if (!sectionId) {
    return json({ success: false, error: "Section not found" });
  }

  try {
    const formData = await request.formData();
    const themeId = formData.get("themeId") as string;
    const action = formData.get("action") as string;

    if (action === "install") {
      if (!themeId) {
        return json({ success: false, error: "Theme selection is required" });
      }

      // Get shop ID from session
      const shopId = session.shop;

      // Install section
      const result = await installationService.installSection(admin, {
        sectionId,
        shopId,
        themeId,
      });

      return json(result);
    }

    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Failed to process action:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Installation failed",
    });
  }
};

export default function SectionDetail() {
  const { section, themes, installationStats, uploaded } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  
  const [selectedTheme, setSelectedTheme] = useState("");
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const isPreview = searchParams.get("preview") === "true";

  const handleInstall = useCallback(() => {
    if (!selectedTheme) {
      return;
    }
    setShowInstallModal(true);
  }, [selectedTheme]);

  const tabs = [
    { id: "liquid", content: "Liquid Code" },
    ...(section.cssCode ? [{ id: "css", content: "CSS Code" }] : []),
    ...(section.jsCode ? [{ id: "js", content: "JavaScript Code" }] : []),
    ...(section.schema ? [{ id: "schema", content: "Schema" }] : []),
  ];

  const themeOptions = [
    { value: "", label: "Select a theme" },
    ...themes.map((theme) => ({
      value: theme.id,
      label: `${theme.name} ${theme.role === "main" ? "(Published)" : ""}`,
    })),
  ];

  const getCodeContent = () => {
    switch (tabs[selectedTab]?.id) {
      case "css":
        return section.cssCode || "";
      case "js":
        return section.jsCode || "";
      case "schema":
        return section.schema ? JSON.stringify(section.schema, null, 2) : "";
      default:
        return section.liquidCode;
    }
  };

  return (
    <Page>
      <TitleBar title={section.title} />
      
      <Layout>
        {uploaded && (
          <Layout.Section>
            <Banner status="success" title="Section uploaded successfully!">
              <p>Your section is now available in the store and ready for installation.</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.error && (
          <Layout.Section>
            <Banner status="critical" title="Installation failed">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.success && (
          <Layout.Section>
            <Banner status="success" title="Section installed successfully!">
              <p>The section has been added to your theme. You can now use it in your theme editor.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              {/* Header */}
              <InlineStack align="space-between" blockAlign="start">
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingLg" as="h1">
                      {section.title}
                    </Text>
                    <Badge tone="success">FREE</Badge>
                    <Badge>{section.category.name}</Badge>
                  </InlineStack>
                  
                  {section.description && (
                    <Text variant="bodyMd" color="subdued">
                      {section.description}
                    </Text>
                  )}
                </BlockStack>

                <InlineStack gap="200">
                  <Button
                    variant="tertiary"
                    icon={CodeIcon}
                    onClick={() => setShowCodeModal(true)}
                  >
                    View Code
                  </Button>
                  {isPreview && (
                    <Button
                      variant="primary"
                      icon={ArrowDownIcon}
                      onClick={() => window.close()}
                    >
                      Close Preview
                    </Button>
                  )}
                </InlineStack>
              </InlineStack>

              {/* Preview Image */}
              {section.previewUrl && (
                <Box>
                  <Thumbnail
                    source={section.previewUrl}
                    alt={section.title}
                    size="large"
                  />
                </Box>
              )}

              {/* Tags */}
              {section.tags.length > 0 && (
                <InlineStack gap="100">
                  {section.tags.map((tag) => (
                    <Badge key={tag} tone="info">
                      {tag}
                    </Badge>
                  ))}
                </InlineStack>
              )}

              {/* Installation Section */}
              {!isPreview && (
                <>
                  <Divider />
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      Install Section
                    </Text>
                    
                    <Text variant="bodyMd" color="subdued">
                      Select a theme to install this section. The section will be added to your theme files
                      and will be available in your theme editor.
                    </Text>

                    <Form method="post">
                      <input type="hidden" name="action" value="install" />
                      <BlockStack gap="300">
                        <Select
                          label="Select Theme"
                          options={themeOptions}
                          value={selectedTheme}
                          onChange={setSelectedTheme}
                          name="themeId"
                        />

                        <InlineStack gap="200">
                          <Button
                            variant="primary"
                            submit
                            disabled={!selectedTheme}
                            icon={ArrowDownIcon}
                          >
                            Install Free Section
                          </Button>
                          <Text variant="bodyMd" color="success">
                            100% Free - No payment required
                          </Text>
                        </InlineStack>
                      </BlockStack>
                    </Form>
                  </BlockStack>
                </>
              )}

              {/* Stats */}
              <Divider />
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Usage Statistics
                </Text>
                
                <InlineStack gap="400">
                  <Text variant="bodyMd">
                    <strong>{installationStats.totalInstallations}</strong> total installations
                  </Text>
                  <Text variant="bodyMd">
                    <strong>{installationStats.uniqueShops}</strong> unique stores
                  </Text>
                  <Text variant="bodyMd">
                    <strong>{installationStats.successfulInstallations}</strong> successful
                  </Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Code Modal */}
      <Modal
        open={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        title="Section Code"
        large
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Tabs
              tabs={tabs}
              selected={selectedTab}
              onSelect={setSelectedTab}
            />
            
            <Code>
              {getCodeContent()}
            </Code>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}