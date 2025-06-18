import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Modal,
  FormLayout,
  Select,
  TextField,
  Button,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  InlineStack,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { MetafieldTable } from "app/components/Features/Metafields/MetafieldTable/MetafieldTable";
import { useMetafieldForm } from "app/hooks/useMetafieldForm";
import {
  getProductMetafields,
  setMetafields,
} from "app/models/metafields.server";

interface ActionData {
  success?: boolean;
  errors?: Array<{ message: string; field?: string[] }>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const productId = "gid://shopify/Product/8262225133740";
  return getProductMetafields(request, productId);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get("_action") as string;

  if (action !== "create") {
    return json<ActionData>({ errors: [{ message: "Invalid action" }] });
  }

  const metafieldData = JSON.parse(formData.get("metafield") as string);

  if (!metafieldData.namespace?.trim()) {
    return json<ActionData>({
      errors: [{ message: "Namespace is required", field: ["namespace"] }],
    });
  }

  if (!metafieldData.key?.trim()) {
    return json<ActionData>({
      errors: [{ message: "Key is required", field: ["key"] }],
    });
  }

  if (!metafieldData.value?.trim()) {
    return json<ActionData>({
      errors: [{ message: "Value is required", field: ["value"] }],
    });
  }

  const result = await setMetafields(request, [
    {
      ownerId: "gid://shopify/Product/8262225133740",
      namespace: metafieldData.namespace,
      key: metafieldData.key,
      value: metafieldData.value,
      type: metafieldData.type,
    },
  ]);

  if (!result.success) {
    return json<ActionData>({ errors: result.errors });
  }

  return json<ActionData>({ success: true });
};

export default function MetafieldsManage() {
  const { metafields, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isSubmitting = navigation.state === "submitting";
  const isLoading = navigation.state === "loading";

  const { formState, setField, fillDummyData, submit } = useMetafieldForm({
    onSubmit: () => setIsCreateModalOpen(false),
  });

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Metafield created successfully!");
    } else if (actionData?.errors) {
      const errorMessage = actionData.errors.map((e) => e.message).join(", ");
      shopify.toast.show(errorMessage, { isError: true });
    }
  }, [actionData, shopify]);

  useEffect(() => {
    if (error) {
      shopify.toast.show(error, { isError: true });
    }
  }, [error, shopify]);

  const handleModalClose = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const metafieldTypeOptions = [
    { label: "Single line text", value: "single_line_text_field" },
    { label: "Multi line text", value: "multi_line_text_field" },
    { label: "Number", value: "number_decimal" },
    { label: "JSON", value: "json" },
    { label: "Date", value: "date" },
    { label: "Boolean", value: "boolean" },
  ];

  if (isLoading) {
    return (
      <SkeletonPage primaryAction>
        <Layout>
          <Layout.Section>
            <SkeletonDisplayText size="small" />
            <SkeletonBodyText lines={5} />
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  return (
    <Page
      title="Metafields"
      subtitle="Create and manage product metafields"
      primaryAction={{
        content: "Create metafield",
        onAction: () => setIsCreateModalOpen(true),
        disabled: isSubmitting,
      }}
    >
      <Layout>
        <Layout.Section>
          <MetafieldTable metafields={metafields} />
        </Layout.Section>
      </Layout>

      <Modal
        open={isCreateModalOpen}
        onClose={handleModalClose}
        title="Create metafield"
        primaryAction={{
          content: isSubmitting ? "Creating..." : "Create metafield",
          onAction: submit,
          loading: isSubmitting,
          disabled:
            !formState.namespace.trim() ||
            !formState.key.trim() ||
            !formState.value.trim(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleModalClose,
            disabled: isSubmitting,
          },
        ]}
        size="large"
      >
        <Modal.Section>
          <FormLayout>
            <FormLayout.Group>
              <InlineStack gap={"200"}>
                <Button onClick={() => fillDummyData("text")}>
                  Fill Text Example
                </Button>
                <Button onClick={() => fillDummyData("number")}>
                  Fill Number Example
                </Button>
                <Button onClick={() => fillDummyData("json")}>
                  Fill JSON Example
                </Button>
              </InlineStack>
            </FormLayout.Group>

            <TextField
              label="Namespace"
              value={formState.namespace}
              onChange={(value) => setField("namespace", value)}
              autoComplete="off"
              disabled={isSubmitting}
              placeholder="e.g., custom"
              helpText="A namespace for grouping related metafields"
              error={
                actionData?.errors?.find((e) => e.field?.includes("namespace"))
                  ?.message
              }
            />

            <TextField
              label="Key"
              value={formState.key}
              onChange={(value) => setField("key", value)}
              autoComplete="off"
              disabled={isSubmitting}
              placeholder="e.g., product_description"
              helpText="A unique identifier for this metafield"
              error={
                actionData?.errors?.find((e) => e.field?.includes("key"))
                  ?.message
              }
            />

            <Select
              label="Type"
              options={metafieldTypeOptions}
              value={formState.type}
              onChange={(value) => setField("type", value)}
              disabled={isSubmitting}
              helpText="The type of data this metafield will store"
            />

            <TextField
              label="Value"
              value={formState.value}
              onChange={(value) => setField("value", value)}
              autoComplete="off"
              disabled={isSubmitting}
              multiline={formState.type === "multi_line_text_field"}
              placeholder="Enter metafield value"
              helpText="The value to store in this metafield"
              error={
                actionData?.errors?.find((e) => e.field?.includes("value"))
                  ?.message
              }
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
