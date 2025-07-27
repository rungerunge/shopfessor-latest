import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useFetcher,
} from "@remix-run/react";
import { Layout, Page } from "@shopify/polaris";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  DataSourceForm,
  ProcessingQueue,
  DataSourceList,
} from "app/components/Features/DataSources";
import { DataSource, ProcessingItem, FileData } from "app/types/data-sources";
import {
  processFileUpload,
  processTextContent,
  getRecentDataSources,
} from "app/services/knowledge-base/data-sources.server";
import { getQueueStats } from "app/services/queue.server";
import { useAppBridge } from "@shopify/app-bridge-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const [queueStats, documents] = await Promise.all([
    getQueueStats().catch(() => ({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    })),
    getRecentDataSources(20),
  ]);

  return json({
    queueStats,
    documents,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const contentType = request.headers.get("content-type") || "";

  // Handle multipart form data for file uploads
  if (contentType.includes("multipart/form-data")) {
    return await processFileUpload(request);
  }

  // Handle regular form data for text processing
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "process-text") {
    try {
      const text = formData.get("text") as string;
      const sourceName = formData.get("sourceName") as string;

      if (!text || text.trim().length === 0) {
        return json({ error: "Text content is required" }, { status: 400 });
      }

      if (!sourceName || sourceName.trim().length === 0) {
        return json({ error: "Source name is required" }, { status: 400 });
      }

      const result = await processTextContent(text, sourceName);
      return json({ ...result });
    } catch (error) {
      console.error("Text processing error:", error);
      return json(
        {
          error:
            error instanceof Error ? error.message : "Text processing failed",
        },
        { status: 500 },
      );
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function KnowledgeBase() {
  const { queueStats, documents } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const refreshFetcher = useFetcher();
  const documentsFetcher = useFetcher();

  // Use refreshed data if available, otherwise use loader data
  const currentQueueStats =
    (refreshFetcher.data as any)?.queueStats || queueStats;
  const currentDocuments =
    (documentsFetcher.data as any)?.documents || documents; // Use refreshed documents if available

  const [selectedTab, setSelectedTab] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [files, setFiles] = useState<FileData[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [processingQueue, setProcessingQueue] = useState<ProcessingItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shopify = useAppBridge();

  // Refs for progress simulation
  const progressIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const processingItems = useRef<Map<string, ProcessingItem>>(new Map());
  const refreshInterval = useRef<NodeJS.Timeout>();

  // Periodic refresh of queue stats
  useEffect(() => {
    const refreshQueueStats = () => {
      // Only refresh if we have processing items or active jobs
      const hasProcessingItems = processingItems.current.size > 0;
      const hasActiveJobs =
        currentQueueStats.active > 0 || currentQueueStats.waiting > 0;

      if (hasProcessingItems || hasActiveJobs) {
        refreshFetcher.load("/app/rag/queue-stats");
      }
    };

    // Refresh every 5 seconds only when needed
    refreshInterval.current = setInterval(refreshQueueStats, 5000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [refreshFetcher, currentQueueStats.active, currentQueueStats.waiting]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all progress intervals
      progressIntervals.current.forEach((interval) => clearInterval(interval));
      progressIntervals.current.clear();

      // Clear refresh interval
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  // Show Shopify toast for action results
  useEffect(() => {
    if (!actionData) return;
    if (hasError(actionData)) {
      shopify.toast.show(actionData.error, { isError: true });
      setIsSubmitting(false);
    } else if (hasSuccess(actionData)) {
      shopify.toast.show(actionData.message);
      // Add to processing queue with fake progress
      addToProcessingQueue(
        actionData.documentId,
        actionData.filename || "Document",
      );
      setIsSubmitting(false);
      // Clear form after successful submission
      clearForm();
      // Refresh documents list after successful processing
      documentsFetcher.load("/app/rag");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionData]);

  // Convert database documents to DataSource format
  useEffect(() => {
    const convertedSources: DataSource[] = currentDocuments.map((doc: any) => ({
      id: doc.id,
      type: doc.fileType,
      name: doc.originalName,
      content: `${doc.fileType} file (${(doc.fileSize / 1024).toFixed(1)} KB)`,
      status: doc.status.toLowerCase(),
      addedAt: new Date(doc.createdAt).toLocaleString(),
      processingTime: doc.processedAt
        ? (
            (new Date(doc.processedAt).getTime() -
              new Date(doc.createdAt).getTime()) /
            1000
          ).toFixed(1) + "s"
        : undefined,
      fileType: doc.fileType,
      size: doc.fileSize,
    }));
    setDataSources(convertedSources);
  }, [currentDocuments]);

  // Complete processing item
  const completeProcessingItem = useCallback(
    (itemId: string, success: boolean, error?: string) => {
      const item = processingItems.current.get(itemId);
      if (!item) return;

      const updatedItem: ProcessingItem = {
        ...item,
        progress: success ? 100 : 0,
        stage: success ? "Completed successfully" : "Failed",
        status: success ? "completed" : "failed",
        error,
      };

      processingItems.current.set(itemId, updatedItem);
      setProcessingQueue((prev) =>
        prev.map((p) => (p.id === itemId ? updatedItem : p)),
      );

      // Clear the progress interval
      const interval = progressIntervals.current.get(itemId);
      if (interval) {
        clearInterval(interval);
        progressIntervals.current.delete(itemId);
      }

      // Remove from queue after 5 seconds
      setTimeout(() => {
        setProcessingQueue((prev) => prev.filter((p) => p.id !== itemId));
        processingItems.current.delete(itemId);

        // Refresh documents list when processing completes
        if (success) {
          documentsFetcher.load("/app/rag");
        }
      }, 5000);
    },
    [documentsFetcher],
  );

  // Check individual job status
  const checkJobStatus = useCallback(
    async (jobId: string, itemId: string) => {
      try {
        const response = await fetch(`/app/rag/job-status?jobId=${jobId}`);
        if (response.ok) {
          const jobStatus = await response.json();

          if (jobStatus.status === "completed") {
            completeProcessingItem(itemId, true);
          } else if (jobStatus.status === "failed") {
            completeProcessingItem(itemId, false, "Job failed");
          } else if (jobStatus.status === "active" && jobStatus.progress > 0) {
            // Update progress with real job progress
            const item = processingItems.current.get(itemId);
            if (item) {
              const updatedItem = {
                ...item,
                progress: Math.max(item.progress, jobStatus.progress),
              };
              processingItems.current.set(itemId, updatedItem);
              setProcessingQueue((prev) =>
                prev.map((p) => (p.id === itemId ? updatedItem : p)),
              );
            }
          }
        }
      } catch (error) {
        console.error("Error checking job status:", error);
      }
    },
    [completeProcessingItem],
  );

  // Add item to processing queue with fake progress
  const addToProcessingQueue = useCallback(
    (jobId: string, filename: string) => {
      const itemId = `processing-${Date.now()}`;
      const newItem: ProcessingItem = {
        id: itemId,
        jobId,
        type: "Documents / Files",
        name: filename,
        content: "Document being processed",
        progress: 0,
        stage: "Initializing...",
        startTime: Date.now(),
        status: "processing",
      };

      processingItems.current.set(itemId, newItem);
      setProcessingQueue((prev) => [...prev, newItem]);

      // Start fake progress simulation
      startFakeProgress(itemId);
    },
    [],
  );

  // Start fake progress simulation
  const startFakeProgress = useCallback(
    (itemId: string) => {
      const stages = [
        { progress: 10, stage: "Uploading file..." },
        { progress: 25, stage: "Extracting content..." },
        { progress: 40, stage: "Processing text..." },
        { progress: 60, stage: "Generating embeddings..." },
        { progress: 80, stage: "Indexing content..." },
        { progress: 95, stage: "Finalizing..." },
      ];

      let currentStage = 0;
      const interval = setInterval(() => {
        const item = processingItems.current.get(itemId);
        if (!item) {
          clearInterval(interval);
          return;
        }

        if (currentStage < stages.length) {
          const stage = stages[currentStage];
          const updatedItem = {
            ...item,
            progress: stage.progress,
            stage: stage.stage,
          };

          processingItems.current.set(itemId, updatedItem);
          setProcessingQueue((prev) =>
            prev.map((p) => (p.id === itemId ? updatedItem : p)),
          );
          currentStage++;
        } else {
          // Check real job status when we reach 95%
          if (item.jobId) {
            checkJobStatus(item.jobId, itemId);
          }
        }
      }, 2000); // Update every 2 seconds

      progressIntervals.current.set(itemId, interval);
    },
    [checkJobStatus],
  );

  // Update processing queue based on queue stats
  useEffect(() => {
    const queueItems: ProcessingItem[] = [];

    // Only show queue stats items if we don't have any fake progress items
    const hasFakeProgressItems = processingItems.current.size > 0;

    if (!hasFakeProgressItems) {
      if (currentQueueStats.waiting > 0) {
        queueItems.push({
          id: "waiting",
          type: "Documents / Files",
          name: `${currentQueueStats.waiting} documents waiting`,
          content: "Documents in processing queue",
          progress: 0,
          stage: "Waiting in queue...",
          startTime: Date.now(),
          status: "waiting",
        });
      }

      if (currentQueueStats.active > 0) {
        queueItems.push({
          id: "active",
          type: "Documents / Files",
          name: `${currentQueueStats.active} documents processing`,
          content: "Documents being processed",
          progress: 50,
          stage: "Processing...",
          startTime: Date.now(),
          status: "processing",
        });
      }
    }

    // Update existing processing items based on queue status
    processingItems.current.forEach((item, itemId) => {
      if (item.status === "processing") {
        // Check if job is completed or failed based on queue stats
        if (currentQueueStats.completed > 0) {
          completeProcessingItem(itemId, true);
        } else if (currentQueueStats.failed > 0) {
          completeProcessingItem(itemId, false, "Processing failed");
        }
      }
    });

    setProcessingQueue((prev) => {
      const existingItems = prev.filter((p) => p.id.startsWith("processing-"));
      return [...existingItems, ...queueItems];
    });
  }, [currentQueueStats, completeProcessingItem]);

  const handleTabChange = useCallback((selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex);
    // Clear inputs when switching tabs
    setUrlInput("");
    setTextInput("");
    setFiles([]);
  }, []);

  const handleStartProcessing = useCallback(async () => {
    setIsSubmitting(true);
    // This will be handled by the Form component
    // The actual processing is done in the action function
  }, []);

  const handleDeleteSource = useCallback((id: string) => {
    setDataSources((prev) => prev.filter((source) => source.id !== id));
  }, []);

  // Clear form after successful submission
  const clearForm = useCallback(() => {
    setFiles([]);
    setTextInput("");
    setUrlInput("");
    // Clear file input if it exists
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }, []);

  const canProcess = () => {
    switch (selectedTab) {
      case 0:
        return files.length > 0;
      case 1:
        return urlInput.trim().length > 0;
      case 2:
        return textInput.trim().length > 0;
      default:
        return false;
    }
  };

  // Type guard for action data
  const hasError = (data: any): data is { error: string } =>
    data && typeof data.error === "string";

  const hasSuccess = (
    data: any,
  ): data is {
    success: boolean;
    documentId: string;
    message: string;
    filename?: string;
  } => data && typeof data.success === "boolean";

  return (
    <Page
      title="Knowledge Base"
      subtitle="Knowledge Base Management: Create, update, or remove information sources for your AI agent."
    >
      <Layout>
        <Layout.Section>
          {selectedTab === 0 ? (
            // File upload form
            <Form method="post" encType="multipart/form-data">
              <input type="hidden" name="_action" value="upload" />
              <DataSourceForm
                selectedTab={selectedTab}
                urlInput={urlInput}
                textInput={textInput}
                files={files}
                onTabChange={handleTabChange}
                onUrlInputChange={setUrlInput}
                onTextInputChange={setTextInput}
                onFilesChange={setFiles}
                onStartProcessing={handleStartProcessing}
                canProcess={canProcess()}
                isLoading={isSubmitting}
              />
            </Form>
          ) : selectedTab === 2 ? (
            // Text processing form
            <Form method="post">
              <input type="hidden" name="_action" value="process-text" />
              <input type="hidden" name="text" value={textInput} />
              <input
                type="hidden"
                name="sourceName"
                value={`Text snippet (${textInput.length} chars)`}
              />
              <DataSourceForm
                selectedTab={selectedTab}
                urlInput={urlInput}
                textInput={textInput}
                files={files}
                onTabChange={handleTabChange}
                onUrlInputChange={setUrlInput}
                onTextInputChange={setTextInput}
                onFilesChange={setFiles}
                onStartProcessing={handleStartProcessing}
                canProcess={canProcess()}
                isLoading={isSubmitting}
              />
            </Form>
          ) : (
            // URL form (not implemented yet)
            <DataSourceForm
              selectedTab={selectedTab}
              urlInput={urlInput}
              textInput={textInput}
              files={files}
              onTabChange={handleTabChange}
              onUrlInputChange={setUrlInput}
              onTextInputChange={setTextInput}
              onFilesChange={setFiles}
              onStartProcessing={handleStartProcessing}
              canProcess={canProcess()}
              isLoading={isSubmitting}
            />
          )}
        </Layout.Section>

        {/* Processing Queue */}
        {processingQueue.length > 0 && (
          <Layout.Section>
            <ProcessingQueue processingQueue={processingQueue} />
          </Layout.Section>
        )}

        {/* Data Sources List */}
        <Layout.Section>
          <DataSourceList
            dataSources={dataSources}
            onDeleteSource={handleDeleteSource}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
