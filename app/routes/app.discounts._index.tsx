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
  DatePicker,
  Checkbox,
  Text,
  Button,
  SkeletonPage,
  SkeletonBodyText,

  Grid,
  InlineStack,
  Card,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  createDiscount,
  getDiscounts,
} from "app/services/discounts/discounts.server";
import {
  DiscountMethod,
  DiscountType,
  DiscountNode,
} from "app/types/discounts";
import { DiscountTable } from "app/components/Features/Discounts/DiscountTable/DiscountTable";
import { useDiscountForm } from "app/hooks/useDiscountForm";

interface ActionData {
  success?: boolean;
  errors?: Array<{ message: string; field?: string[] }>;
}

interface LoaderData {
  discounts: DiscountNode[];
  error: string | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const result = await getDiscounts(request);
  return json<LoaderData>(result);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get("_action") as string;

  if (action !== "create") {
    return json<ActionData>({ errors: [{ message: "Invalid action" }] });
  }

  const discountData = JSON.parse(formData.get("discount") as string);

  // Validate required fields
  if (!discountData.title?.trim()) {
    return json<ActionData>({
      errors: [{ message: "Title is required", field: ["title"] }],
    });
  }

  if (
    discountData.method === DiscountMethod.Code &&
    !discountData.code?.trim()
  ) {
    return json<ActionData>({
      errors: [{ message: "Discount code is required", field: ["code"] }],
    });
  }

  if (
    discountData.type !== DiscountType.FreeShipping &&
    (!discountData.value || parseFloat(discountData.value) <= 0)
  ) {
    return json<ActionData>({
      errors: [
        { message: "Discount value must be greater than 0", field: ["value"] },
      ],
    });
  }

  const result = await createDiscount(request, discountData);

  if (!result.success) {
    return json<ActionData>({ errors: result.errors });
  }

  return json<ActionData>({ success: true });
};

export default function DiscountsManage() {
  const { discounts, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isSubmitting = navigation.state === "submitting";
  const isLoading = navigation.state === "loading";

  const { formState, setField, generateCode, fillDummyData, submit } =
    useDiscountForm({
      onSubmit: () => setIsCreateModalOpen(false),
    });

  // Handle action data effects
  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Discount created successfully!");
    } else if (actionData?.errors) {
      const errorMessage = actionData.errors.map((e) => e.message).join(", ");
      shopify.toast.show(errorMessage, { isError: true });
    }
  }, [actionData, shopify]);

  // Show loading error toast
  useEffect(() => {
    if (error) {
      shopify.toast.show(error, { isError: true });
    }
  }, [error, shopify]);

  const handleModalClose = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const discountTypeOptions = [
    { label: "Percentage off", value: DiscountType.Percentage },
    { label: "Fixed amount off", value: DiscountType.FixedAmount },
    { label: "Free shipping", value: DiscountType.FreeShipping },
  ];

  const discountMethodOptions = [
    { label: "Discount code", value: DiscountMethod.Code },
    { label: "Automatic discount", value: DiscountMethod.Automatic },
  ];

  if (isLoading) {
    return (
      <SkeletonPage primaryAction>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonBodyText lines={1} />
              <SkeletonBodyText lines={5} />
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  return (
    <Page
      title="Discounts"
      subtitle="Create and manage discount codes and automatic discounts"
      primaryAction={{
        content: "Create discount",
        onAction: () => setIsCreateModalOpen(true),
        disabled: isSubmitting,
      }}
    >
      <Layout>
        <Layout.Section>
          <DiscountTable discounts={discounts} />
        </Layout.Section>
      </Layout>

      <Modal
        open={isCreateModalOpen}
        onClose={handleModalClose}
        title="Create discount"
        primaryAction={{
          content: isSubmitting ? "Creating..." : "Create discount",
          onAction: submit,
          loading: isSubmitting,
          disabled:
            !formState.title.trim() ||
            (formState.method === DiscountMethod.Code &&
              !formState.code.trim()) ||
            (formState.type !== DiscountType.FreeShipping &&
              (!formState.value || parseFloat(formState.value) <= 0)),
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
                <Button onClick={() => fillDummyData("percentage")}>
                  Fill 20% Off
                </Button>
                <Button onClick={() => fillDummyData("fixed")}>
                  Fill $10 Off
                </Button>
                <Button onClick={() => fillDummyData("shipping")}>
                  Fill Free Shipping
                </Button>
              </InlineStack>
            </FormLayout.Group>
            <FormLayout.Group>
              <Select
                label="Discount type"
                options={discountTypeOptions}
                value={formState.type}
                onChange={(value) => setField("type", value as DiscountType)}
                disabled={isSubmitting}
                helpText="Choose how the discount will be applied"
              />

              <Select
                label="Method"
                options={discountMethodOptions}
                value={formState.method}
                onChange={(value) =>
                  setField("method", value as DiscountMethod)
                }
                disabled={isSubmitting}
                helpText="How customers will access this discount"
              />
            </FormLayout.Group>

            <TextField
              label="Title"
              value={formState.title}
              onChange={(value) => setField("title", value)}
              autoComplete="off"
              disabled={isSubmitting}
              placeholder="Enter discount title"
              helpText="This will be visible to customers"
              error={
                actionData?.errors?.find((e) => e.field?.includes("title"))
                  ?.message
              }
            />

            {formState.method === DiscountMethod.Code && (
              <FormLayout.Group>
                <TextField
                  label="Discount code"
                  value={formState.code}
                  onChange={(value) => setField("code", value)}
                  autoComplete="off"
                  disabled={isSubmitting}
                  placeholder="Enter discount code"
                  helpText="Customers will enter this code at checkout"
                  error={
                    actionData?.errors?.find((e) => e.field?.includes("code"))
                      ?.message
                  }
                  connectedRight={
                    <Button onClick={generateCode} disabled={isSubmitting}>
                      Generate
                    </Button>
                  }
                />
              </FormLayout.Group>
            )}

            {formState.type !== DiscountType.FreeShipping && (
              <TextField
                label={
                  formState.type === DiscountType.Percentage
                    ? "Percentage"
                    : "Amount"
                }
                value={formState.value}
                onChange={(value) => setField("value", value)}
                type="number"
                suffix={formState.type === DiscountType.Percentage ? "%" : "$"}
                autoComplete="off"
                disabled={isSubmitting}
                placeholder={
                  formState.type === DiscountType.Percentage ? "10" : "5.00"
                }
                helpText={
                  formState.type === DiscountType.Percentage
                    ? "Enter percentage to discount"
                    : "Enter fixed amount to discount"
                }
                error={
                  actionData?.errors?.find((e) => e.field?.includes("value"))
                    ?.message
                }
              />
            )}

            {formState.method === DiscountMethod.Code && (
              <FormLayout.Group>
                <TextField
                  label="Usage limit"
                  value={formState.usageLimit}
                  onChange={(value) => setField("usageLimit", value)}
                  type="number"
                  autoComplete="off"
                  disabled={isSubmitting}
                  placeholder="Leave empty for unlimited"
                  helpText="Maximum number of times this discount can be used"
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <Checkbox
                    label="One use per customer"
                    checked={formState.appliesOncePerCustomer}
                    onChange={(checked) =>
                      setField("appliesOncePerCustomer", checked)
                    }
                    disabled={isSubmitting}
                    helpText="Limit to one use per customer"
                  />
                </div>
              </FormLayout.Group>
            )}

            {formState.type === DiscountType.FreeShipping && (
              <FormLayout.Group>
                <TextField
                  label="Minimum subtotal"
                  value={formState.minimumSubtotal}
                  onChange={(value) => setField("minimumSubtotal", value)}
                  type="number"
                  prefix="$"
                  autoComplete="off"
                  disabled={isSubmitting}
                  placeholder="0.00"
                  helpText="Minimum order subtotal required for free shipping"
                />

                <TextField
                  label="Maximum shipping price"
                  value={formState.maximumShippingPrice}
                  onChange={(value) => setField("maximumShippingPrice", value)}
                  type="number"
                  prefix="$"
                  autoComplete="off"
                  disabled={isSubmitting}
                  placeholder="0.00"
                  helpText="Maximum shipping price to be covered by the discount"
                />
              </FormLayout.Group>
            )}

            <FormLayout.Group>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <Card>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Start date
                    </Text>
                    <div style={{ marginTop: "0.5rem" }}>
                      <DatePicker
                        selected={formState.startDate}
                        onChange={(date) => {
                          if (date instanceof Date) {
                            setField("startDate", date);
                          }
                        }}
                        month={formState.startDate.getMonth()}
                        year={formState.startDate.getFullYear()}
                      />
                    </div>
                  </Card>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
                  <Card>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <Checkbox
                        label="Set end date"
                        checked={formState.hasEndDate}
                        onChange={(checked) => setField("hasEndDate", checked)}
                        disabled={isSubmitting}
                      />
                    </div>
                    {formState.hasEndDate && (
                      <div>
                        <Text variant="bodyMd" as="p" tone="subdued">
                          End date
                        </Text>
                        <div style={{ marginTop: "0.5rem" }}>
                          <DatePicker
                            selected={formState.endDate}
                            onChange={(date) => {
                              if (date instanceof Date) {
                                setField("endDate", date);
                              }
                            }}
                            month={
                              formState.endDate?.getMonth() ??
                              new Date().getMonth()
                            }
                            year={
                              formState.endDate?.getFullYear() ??
                              new Date().getFullYear()
                            }
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                </Grid.Cell>
              </Grid>
            </FormLayout.Group>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
