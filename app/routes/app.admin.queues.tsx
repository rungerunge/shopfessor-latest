import {
  useLoaderData,
  useActionData,
  useFetcher,
  json,
} from "@remix-run/react";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  FormLayout,
  Grid,
  Text,
  Badge,
  Divider,
  Frame,
  BlockStack,
  InlineStack,
  Box,
  Spinner,
  Icon,
  Tooltip,
} from "@shopify/polaris";
import { RefreshIcon, EmailIcon, ImageIcon } from "@shopify/polaris-icons";
import { useState, useEffect, useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { queueManager } from "app/lib/queue-manager.server";

// Types
export type QueueStats = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
};

export type QueueData = {
  queues: {
    "send-email": QueueStats;
    "process-image": QueueStats;
  };
  timestamp: string;
};

export type ActionSuccessResponse = {
  success: true;
  jobId: string;
  message: string;
  type: "email" | "image";
};

export type ActionErrorResponse = {
  error: string;
};

export type ActionResponse = ActionSuccessResponse | ActionErrorResponse;

// Server-side loader
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const emailQueue = queueManager.getQueue("send-email");
    const imageQueue = queueManager.getQueue("process-image");

    const [emailStats, imageStats] = await Promise.all([
      emailQueue.getJobCounts(),
      imageQueue.getJobCounts(),
    ]);

    return json<QueueData>({
      queues: {
        "send-email": {
          waiting: emailStats.waiting || 0,
          active: emailStats.active || 0,
          completed: emailStats.completed || 0,
          failed: emailStats.failed || 0,
        },
        "process-image": {
          waiting: imageStats.waiting || 0,
          active: imageStats.active || 0,
          completed: imageStats.completed || 0,
          failed: imageStats.failed || 0,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch queue data:", error);
    throw new Response("Failed to fetch queue data", { status: 500 });
  }
}

// Server-side action
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    switch (actionType) {
      case "send-email": {
        const to = formData.get("to") as string;
        const subject = formData.get("subject") as string;
        const body = formData.get("body") as string;

        if (!to || !subject || !body) {
          return json<ActionErrorResponse>(
            { error: "Missing required fields" },
            { status: 400 },
          );
        }

        const job = await queueManager.addJob("send-email", {
          to,
          subject,
          body,
        });

        if (!job.id) {
          throw new Error("Job ID not returned from queue service");
        }

        return json<ActionSuccessResponse>({
          success: true,
          jobId: job.id,
          message: "Email queued successfully",
          type: "email",
        });
      }

      case "process-image": {
        const imageUrl = formData.get("imageUrl") as string;

        if (!imageUrl) {
          return json<ActionErrorResponse>(
            { error: "Missing required fields" },
            { status: 400 },
          );
        }

        const job = await queueManager.addJob("process-image", {
          imageUrl,
          transformations: {
            resize: { width: 800, height: 600 },
            format: "webp",
          },
        });

        if (!job.id) {
          throw new Error("Job ID not returned from queue service");
        }

        return json<ActionSuccessResponse>({
          success: true,
          jobId: job.id,
          message: "Image processing queued successfully",
          type: "image",
        });
      }

      default:
        return json<ActionErrorResponse>(
          { error: "Invalid action type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Queue action failed:", error);
    return json<ActionErrorResponse>(
      { error: `Failed to queue ${actionType}` },
      { status: 500 },
    );
  }
}

// Client-side component
export default function AdminQueuesDashboard() {
  const shopify = useAppBridge();
  const { queues, timestamp } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const refreshFetcher = useFetcher<typeof loader>();

  // Track manual refresh state
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const [imageForm, setImageForm] = useState({
    imageUrl: "",
  });

  const emailFetcher = useFetcher<ActionResponse>();
  const imageFetcher = useFetcher<ActionResponse>();

  const isEmailSubmitting = emailFetcher.state === "submitting";
  const isImageSubmitting = imageFetcher.state === "submitting";
  const isRefreshing = refreshFetcher.state === "loading";

  // Handle successful actions
  const handleActionSuccess = useCallback(
    (type: "email" | "image", message: string) => {
      shopify.toast.show(message);

      // Clear forms on success
      if (type === "email") {
        setEmailForm({ to: "", subject: "", body: "" });
      } else {
        setImageForm({ imageUrl: "" });
      }
    },
    [shopify],
  );

  // Handle action responses (from direct form submission)
  useEffect(() => {
    if (actionData) {
      if ("success" in actionData) {
        handleActionSuccess(actionData.type, actionData.message);
      } else if ("error" in actionData) {
        shopify.toast.show(actionData.error, { isError: true });
      }
    }
  }, [actionData, handleActionSuccess, shopify]);

  // Handle email fetcher responses
  useEffect(() => {
    if (emailFetcher.data) {
      if ("success" in emailFetcher.data) {
        handleActionSuccess("email", emailFetcher.data.message);
      } else if ("error" in emailFetcher.data) {
        shopify.toast.show(emailFetcher.data.error, { isError: true });
      }
    }
  }, [emailFetcher.data, handleActionSuccess, shopify]);

  // Handle image fetcher responses
  useEffect(() => {
    if (imageFetcher.data) {
      if ("success" in imageFetcher.data) {
        handleActionSuccess("image", imageFetcher.data.message);
      } else if ("error" in imageFetcher.data) {
        shopify.toast.show(imageFetcher.data.error, { isError: true });
      }
    }
  }, [imageFetcher.data, handleActionSuccess, shopify]);

  // Reset manual refresh state when fetcher completes
  useEffect(() => {
    if (refreshFetcher.state === "idle" && isManualRefresh) {
      setIsManualRefresh(false);
    }
  }, [refreshFetcher.state, isManualRefresh]);

  const handleRefresh = useCallback(() => {
    setIsManualRefresh(true);
    refreshFetcher.load(window.location.pathname);
  }, [refreshFetcher]);

  const fillDummyEmailData = useCallback(() => {
    setEmailForm({
      to: "test@example.com",
      subject: "Test Email - Queue Dashboard",
      body: "This is a test email sent from the queue dashboard to verify email processing functionality.",
    });
  }, []);

  const fillDummyImageData = useCallback(() => {
    setImageForm({
      imageUrl: "https://picsum.photos/1200/800",
    });
  }, []);

  const handleEmailSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (
        !emailForm.to.trim() ||
        !emailForm.subject.trim() ||
        !emailForm.body.trim()
      ) {
        shopify.toast.show("Please fill in all required fields", {
          isError: true,
        });
        return;
      }

      const formData = new FormData();
      formData.append("actionType", "send-email");
      formData.append("to", emailForm.to.trim());
      formData.append("subject", emailForm.subject.trim());
      formData.append("body", emailForm.body.trim());
      emailFetcher.submit(formData, { method: "post" });
    },
    [emailForm, emailFetcher, shopify],
  );

  const handleImageSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!imageForm.imageUrl.trim()) {
        shopify.toast.show("Please fill in all required fields", {
          isError: true,
        });
        return;
      }

      const formData = new FormData();
      formData.append("actionType", "process-image");
      formData.append("imageUrl", imageForm.imageUrl.trim());
      imageFetcher.submit(formData, { method: "post" });
    },
    [imageForm, imageFetcher, shopify],
  );

  const getQueueStatusBadge = useCallback((stats: QueueStats) => {
    if (stats.failed > 0) return <Badge tone="critical">Issues</Badge>;
    if (stats.active > 0) return <Badge tone="info">Processing</Badge>;
    if (stats.waiting > 0) return <Badge tone="attention">Pending</Badge>;
    return <Badge tone="success">Idle</Badge>;
  }, []);

  const getQueueIcon = useCallback((queueName: string) => {
    return queueName === "send-email" ? EmailIcon : ImageIcon;
  }, []);

  const getQueueTitle = useCallback((queueName: string) => {
    return queueName === "send-email" ? "EMAIL QUEUE" : "IMAGE QUEUE";
  }, []);

  const getQueueDescription = useCallback((queueName: string) => {
    return queueName === "send-email" ? "Email Processing" : "Image Processing";
  }, []);

  // Use refreshed data if available, otherwise use loader data
  const currentQueues = refreshFetcher.data?.queues || queues;
  const currentTimestamp = refreshFetcher.data?.timestamp || timestamp;

  // Check if forms are valid
  const isEmailFormValid =
    emailForm.to.trim() && emailForm.subject.trim() && emailForm.body.trim();
  const isImageFormValid = imageForm.imageUrl.trim();

  return (
    <Frame>
      <Page
        title="Queue Management Dashboard"
        subtitle="Monitor and test queue operations"
        primaryAction={{
          content:
            isManualRefresh && isRefreshing ? "Refreshing..." : "Refresh Data",
          onAction: handleRefresh,
          loading: isManualRefresh && isRefreshing,
          icon: RefreshIcon,
        }}
      >
        <Layout>
          {/* Queue Statistics */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h2">
                    Queue Statistics
                  </Text>
                  {isRefreshing && isManualRefresh && (
                    <InlineStack gap="200" blockAlign="center">
                      <Spinner size="small" />
                      <Text variant="bodySm" tone="subdued" as="p">
                        Refreshing...
                      </Text>
                    </InlineStack>
                  )}
                </InlineStack>

                <Text variant="bodySm" tone="subdued" as="p">
                  Last updated: {new Date(currentTimestamp).toLocaleString()}
                </Text>

                <Grid>
                  {Object.entries(currentQueues).map(([queueName, stats]) => (
                    <Grid.Cell
                      columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}
                      key={queueName}
                    >
                      <Card>
                        <BlockStack gap="300">
                          <InlineStack
                            align="space-between"
                            blockAlign="center"
                          >
                            <InlineStack gap="200" blockAlign="center">
                              <Box padding="200" borderRadius="100">
                                <Icon
                                  source={getQueueIcon(queueName)}
                                  tone="base"
                                />
                              </Box>
                              <BlockStack gap="050">
                                <Text variant="headingMd" as="h3">
                                  {getQueueTitle(queueName)}
                                </Text>
                                <Text variant="bodyXs" tone="subdued" as="p">
                                  {getQueueDescription(queueName)}
                                </Text>
                              </BlockStack>
                            </InlineStack>
                            {getQueueStatusBadge(stats)}
                          </InlineStack>

                          <Divider />

                          <Grid>
                            <Grid.Cell
                              columnSpan={{ xs: 3, sm: 3, md: 3, lg: 3, xl: 3 }}
                            >
                              <BlockStack gap="050" align="center">
                                <Text variant="headingLg" as="p" tone="subdued">
                                  {stats.waiting}
                                </Text>
                                <Text variant="bodyXs" tone="subdued" as="p">
                                  Waiting
                                </Text>
                              </BlockStack>
                            </Grid.Cell>
                            <Grid.Cell
                              columnSpan={{ xs: 3, sm: 3, md: 3, lg: 3, xl: 3 }}
                            >
                              <BlockStack gap="050" align="center">
                                <Text variant="headingLg" as="p" tone="subdued">
                                  {stats.active}
                                </Text>
                                <Text variant="bodyXs" tone="subdued" as="p">
                                  Active
                                </Text>
                              </BlockStack>
                            </Grid.Cell>
                            <Grid.Cell
                              columnSpan={{ xs: 3, sm: 3, md: 3, lg: 3, xl: 3 }}
                            >
                              <BlockStack gap="050" align="center">
                                <Text variant="headingLg" as="p" tone="success">
                                  {stats.completed}
                                </Text>
                                <Text variant="bodyXs" tone="subdued" as="p">
                                  Completed
                                </Text>
                              </BlockStack>
                            </Grid.Cell>
                            <Grid.Cell
                              columnSpan={{ xs: 3, sm: 3, md: 3, lg: 3, xl: 3 }}
                            >
                              <BlockStack gap="050" align="center">
                                <Text
                                  variant="headingLg"
                                  as="p"
                                  tone={
                                    stats.failed > 0 ? "critical" : "subdued"
                                  }
                                >
                                  {stats.failed}
                                </Text>
                                <Text variant="bodyXs" tone="subdued" as="p">
                                  Failed
                                </Text>
                              </BlockStack>
                            </Grid.Cell>
                          </Grid>
                        </BlockStack>
                      </Card>
                    </Grid.Cell>
                  ))}
                </Grid>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Testing Tools */}
          <Layout.Section>
            <BlockStack gap="400">
              {/* Email Queue Testing */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Box padding="200" borderRadius="100">
                        <Icon source={EmailIcon} tone="info" />
                      </Box>
                      <BlockStack gap="050">
                        <Text variant="headingMd" as="h3">
                          Test Email Queue
                        </Text>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          Send test emails to verify queue functionality
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <Tooltip content="Fill with sample data">
                      <Button
                        variant="tertiary"
                        size="slim"
                        onClick={fillDummyEmailData}
                        disabled={isEmailSubmitting}
                      >
                        Fill Test Data
                      </Button>
                    </Tooltip>
                  </InlineStack>

                  <Box padding="400" borderRadius="200">
                    <form onSubmit={handleEmailSubmit}>
                      <FormLayout>
                        <TextField
                          label="To Email"
                          value={emailForm.to}
                          onChange={(value) =>
                            setEmailForm((prev) => ({ ...prev, to: value }))
                          }
                          type="email"
                          placeholder="test@example.com"
                          autoComplete="email"
                          helpText="Enter the recipient's email address"
                          disabled={isEmailSubmitting}
                          required
                        />

                        <TextField
                          label="Subject"
                          value={emailForm.subject}
                          onChange={(value) =>
                            setEmailForm((prev) => ({
                              ...prev,
                              subject: value,
                            }))
                          }
                          placeholder="Test Email Subject"
                          helpText="Email subject line"
                          autoComplete="off"
                          disabled={isEmailSubmitting}
                          required
                        />

                        <TextField
                          label="Body"
                          value={emailForm.body}
                          onChange={(value) =>
                            setEmailForm((prev) => ({ ...prev, body: value }))
                          }
                          multiline={4}
                          placeholder="Email body content..."
                          helpText="The main content of your test email"
                          autoComplete="off"
                          disabled={isEmailSubmitting}
                          required
                        />

                        <InlineStack align="end">
                          <Button
                            variant="primary"
                            submit
                            loading={isEmailSubmitting}
                            disabled={!isEmailFormValid || isEmailSubmitting}
                            icon={EmailIcon}
                          >
                            {isEmailSubmitting ? "Queueing..." : "Queue Email"}
                          </Button>
                        </InlineStack>
                      </FormLayout>
                    </form>
                  </Box>
                </BlockStack>
              </Card>

              {/* Image Processing Queue Testing */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Box padding="200" borderRadius="100">
                        <Icon source={ImageIcon} tone="success" />
                      </Box>
                      <BlockStack gap="050">
                        <Text variant="headingMd" as="h3">
                          Test Image Processing Queue
                        </Text>
                        <Text variant="bodyXs" tone="subdued" as="p">
                          Process images with resize and format conversion
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <Tooltip content="Fill with sample data">
                      <Button
                        variant="tertiary"
                        size="slim"
                        onClick={fillDummyImageData}
                        disabled={isImageSubmitting}
                      >
                        Fill Test Data
                      </Button>
                    </Tooltip>
                  </InlineStack>

                  <Box padding="400" borderRadius="200">
                    <form onSubmit={handleImageSubmit}>
                      <FormLayout>
                        <TextField
                          label="Image URL"
                          value={imageForm.imageUrl}
                          onChange={(value) =>
                            setImageForm((prev) => ({
                              ...prev,
                              imageUrl: value,
                            }))
                          }
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          helpText="URL of the image to process (will be resized to 800x600 and converted to WebP)"
                          autoComplete="off"
                          disabled={isImageSubmitting}
                          required
                        />

                        <InlineStack align="end">
                          <Button
                            variant="primary"
                            submit
                            loading={isImageSubmitting}
                            disabled={!isImageFormValid || isImageSubmitting}
                            icon={ImageIcon}
                          >
                            {isImageSubmitting
                              ? "Queueing..."
                              : "Queue Image Processing"}
                          </Button>
                        </InlineStack>
                      </FormLayout>
                    </form>
                  </Box>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
