import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Layout, Page } from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import {
  DataSourceForm,
  ProcessingQueue,
  DataSourceList,
  EditModal,
} from "app/components/Features/DataSources";
import { DataSource, ProcessingItem, FileData } from "app/types/data-sources";
import {
  processFileUpload,
  processTextContent,
  getRecentDataSources,
} from "app/services/data-sources.server";
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

  const [selectedTab, setSelectedTab] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [files, setFiles] = useState<FileData[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [processingQueue, setProcessingQueue] = useState<ProcessingItem[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const shopify = useAppBridge();

  // Show Shopify toast for action results
  useEffect(() => {
    if (!actionData) return;
    if (hasError(actionData)) {
      shopify.toast.show(actionData.error, { isError: true });
    } else if (hasSuccess(actionData)) {
      shopify.toast.show(actionData.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionData]);

  // Convert database documents to DataSource format
  useEffect(() => {
    const convertedSources: DataSource[] = documents.map((doc) => ({
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
  }, [documents]);

  // Update processing queue based on queue stats
  useEffect(() => {
    const queueItems: ProcessingItem[] = [];

    if (queueStats.waiting > 0) {
      queueItems.push({
        id: "waiting",
        type: "Documents / Files",
        name: `${queueStats.waiting} documents waiting`,
        content: "Documents in processing queue",
        progress: 0,
        stage: "Waiting in queue...",
        startTime: Date.now(),
      });
    }

    if (queueStats.active > 0) {
      queueItems.push({
        id: "active",
        type: "Documents / Files",
        name: `${queueStats.active} documents processing`,
        content: "Documents being processed",
        progress: 50,
        stage: "Processing...",
        startTime: Date.now(),
      });
    }

    setProcessingQueue(queueItems);
  }, [queueStats]);

  const handleTabChange = useCallback((selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex);
    // Clear inputs when switching tabs
    setUrlInput("");
    setTextInput("");
    setFiles([]);
  }, []);

  const handleStartProcessing = useCallback(async () => {
    // This will be handled by the Form component
    // The actual processing is done in the action function
  }, []);

  const handleDeleteSource = useCallback((id: string) => {
    setDataSources((prev) => prev.filter((source) => source.id !== id));
  }, []);

  const handleCancelProcessing = useCallback((id: string) => {
    setProcessingQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleEditSource = useCallback((source: DataSource) => {
    setEditingSource(source);
    setActiveModal("edit");
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingSource) {
      setDataSources((prev) =>
        prev.map((source) =>
          source.id === editingSource.id ? editingSource : source,
        ),
      );
    }
    setActiveModal(null);
    setEditingSource(null);
  }, [editingSource]);

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
  ): data is { success: boolean; documentId: string; message: string } =>
    data && typeof data.success === "boolean";

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
            />
          )}
        </Layout.Section>

        {/* Processing Queue */}
        {processingQueue.length > 0 && (
          <Layout.Section>
            <ProcessingQueue
              processingQueue={processingQueue}
              onCancelProcessing={handleCancelProcessing}
            />
          </Layout.Section>
        )}

        {/* Data Sources List */}
        <Layout.Section>
          <DataSourceList
            dataSources={dataSources}
            onDeleteSource={handleDeleteSource}
            onEditSource={handleEditSource}
          />
        </Layout.Section>
      </Layout>

      {/* Edit Modal */}
      <EditModal
        open={activeModal === "edit"}
        editingSource={editingSource}
        onClose={() => setActiveModal(null)}
        onSave={handleSaveEdit}
        onSourceChange={setEditingSource}
      />
    </Page>
  );
}
