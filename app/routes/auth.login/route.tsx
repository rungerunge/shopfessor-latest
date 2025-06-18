import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  Page,
  Text,
  TextField,
  Layout,
  Banner,
  BlockStack,
  Icon,
  Link,
  InlineStack,
} from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { StoreIcon } from "@shopify/polaris-icons";

import { login } from "app/lib/shopify.server";
import { loginErrorMessage } from "./error.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));
  return { errors, polarisTranslations };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  const hasErrors = errors && Object.keys(errors).length > 0;

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Layout>
          <Layout.Section>
            <InlineStack align="center">
              <div style={{ width: "100%", maxWidth: "400px" }}>
                <Card>
                  <BlockStack gap="500">
                    <BlockStack gap="200" align="center">
                      <Icon source={StoreIcon} tone="base" />
                      <Text variant="headingLg" as="h1" alignment="center">
                        Connect Your Store
                      </Text>
                      <Text
                        variant="bodyMd"
                        as="p"
                        alignment="center"
                        tone="subdued"
                      >
                        Enter your store domain to get started
                      </Text>
                    </BlockStack>

                    {hasErrors && (
                      <Banner tone="critical">
                        {errors.shop || "Please verify your store domain"}
                      </Banner>
                    )}

                    <Form method="post">
                      <BlockStack gap="400">
                        <TextField
                          name="shop"
                          label="Store Domain"
                          placeholder="your-store.myshopify.com"
                          value={shop}
                          onChange={setShop}
                          autoComplete="url"
                          error={errors?.shop}
                          prefix="https://"
                          autoFocus
                          helpText="Enter your Shopify store URL"
                        />

                        <Button
                          submit
                          variant="primary"
                          size="large"
                          fullWidth
                          disabled={!shop.trim()}
                        >
                          Connect Store
                        </Button>
                      </BlockStack>
                    </Form>

                    <Text
                      variant="bodySm"
                      as="p"
                      alignment="center"
                      tone="subdued"
                    >
                      Need help? <Link>Contact support</Link> or view our{" "}
                      <Link>setup guide</Link>
                    </Text>
                  </BlockStack>
                </Card>
              </div>
            </InlineStack>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisAppProvider>
  );
}
