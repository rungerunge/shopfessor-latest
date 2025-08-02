import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Banner,
  DataTable,
  Modal,
  FormLayout,
} from "@shopify/polaris";
import { PlusIcon, EditIcon, DeleteIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";

import { authenticate } from "app/lib/shopify.server";
import { categoryService } from "app/services/category.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  try {
    const categories = await categoryService.getAllCategories();
    return json({ categories });
  } catch (error) {
    console.error("Failed to load categories:", error);
    return json({ categories: [], error: "Failed to load categories" });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;

    if (action === "create") {
      const name = formData.get("name") as string;
      const icon = formData.get("icon") as string;

      if (!name) {
        return json({ success: false, error: "Category name is required" });
      }

      const slug = categoryService.generateSlug(name);
      await categoryService.createCategory({ name, slug, icon });

      return json({ success: true, message: "Category created successfully" });
    }

    if (action === "delete") {
      const id = formData.get("id") as string;
      if (!id) {
        return json({ success: false, error: "Category ID is required" });
      }

      await categoryService.deleteCategory(id);
      return json({ success: true, message: "Category deleted successfully" });
    }

    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Failed to process category action:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Action failed",
    });
  }
};

export default function ManageCategories() {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    icon: "",
  });

  const handleFormChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleModalClose = useCallback(() => {
    setShowCreateModal(false);
    setFormData({ name: "", icon: "" });
  }, []);

  const rows = categories.map((category) => [
    category.icon || "📄",
    category.name,
    category.slug,
    category._count?.sections || 0,
    category.order,
    <InlineStack gap="200" key={category.id}>
      <Button size="slim" icon={EditIcon}>Edit</Button>
      <Form method="post" style={{ display: "inline" }}>
        <input type="hidden" name="action" value="delete" />
        <input type="hidden" name="id" value={category.id} />
        <Button
          size="slim"
          tone="critical"
          icon={DeleteIcon}
          submit
          onClick={(e) => {
            if (!confirm("Are you sure you want to delete this category?")) {
              e.preventDefault();
            }
          }}
        >
          Delete
        </Button>
      </Form>
    </InlineStack>,
  ]);

  return (
    <Page>
      <TitleBar
        title="Manage Categories"
        primaryAction={{
          content: "Add Category",
          onAction: () => setShowCreateModal(true),
          icon: PlusIcon,
        }}
      />

      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner status="critical" title="Action failed">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.success && (
          <Layout.Section>
            <Banner status="success" title="Success">
              <p>{actionData.message}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h1">
                Section Categories
              </Text>

              <DataTable
                columnContentTypes={["text", "text", "text", "numeric", "numeric", "text"]}
                headings={["Icon", "Name", "Slug", "Sections", "Order", "Actions"]}
                rows={rows}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Create Category Modal */}
      <Modal
        open={showCreateModal}
        onClose={handleModalClose}
        title="Add New Category"
        primaryAction={{
          content: "Create Category",
          onAction: () => {
            const form = document.createElement("form");
            form.method = "post";
            form.style.display = "none";

            const actionInput = document.createElement("input");
            actionInput.type = "hidden";
            actionInput.name = "action";
            actionInput.value = "create";
            form.appendChild(actionInput);

            const nameInput = document.createElement("input");
            nameInput.type = "hidden";
            nameInput.name = "name";
            nameInput.value = formData.name;
            form.appendChild(nameInput);

            const iconInput = document.createElement("input");
            iconInput.type = "hidden";
            iconInput.name = "icon";
            iconInput.value = formData.icon;
            form.appendChild(iconInput);

            document.body.appendChild(form);
            form.submit();
          },
          disabled: !formData.name,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleModalClose,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Category Name"
              value={formData.name}
              onChange={(value) => handleFormChange("name", value)}
              placeholder="e.g., Hero Sections"
              autoComplete="off"
            />

            <TextField
              label="Icon (emoji)"
              value={formData.icon}
              onChange={(value) => handleFormChange("icon", value)}
              placeholder="e.g., 🦸"
              autoComplete="off"
            />

            <Text variant="bodyMd" color="subdued">
              The slug will be automatically generated from the category name.
            </Text>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}